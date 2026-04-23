"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Loader2, Package, TrendingUp, AlertTriangle, ShoppingCart, Plus, Search,
    DollarSign, PackageOpen, FolderOpen, Receipt, ImageIcon, MoreHorizontal,
    ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Eye, Pencil,
    Trash2, Tag, AlertCircle, TrendingDown,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import useDebounceValue from "@/hooks/useDebounceValue";
import FileUploadButton from "@/components/fileupload";
import SalesTab from "./SalesTab";
import ProfitCard from "@/components/inventory/ProfitCard";

// ── Import shared validation — same rules enforced in the API ─────────────────
// This means the UI catches problems before the network, and the API is a
// final safety net for anything that bypasses the UI (curl, Postman, etc.)
import { validateItemForm, validateSaleLine, ITEM_LIMITS } from "@/lib/inventory-validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeStatus = (s) => (s || "IN_STOCK").toUpperCase();

const getStockBadge = (quantity, status) => {
    const s = (status || "").toUpperCase();
    if (s === "OUT_OF_STOCK" || quantity === 0)
        return <Badge variant="destructive">Out of Stock</Badge>;
    if (s === "LOW_STOCK" || quantity <= 5)
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
};

const EMPTY_ITEM_FORM = {
    name: "", categoryId: "", quantity: 0, unit: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    costPerUnit: 0, sellingPrice: 0, isSellable: false,
    vendorName: "", vendorContact: "", location: "", status: "IN_STOCK", imageUrl: "",
};
const EMPTY_SALE_FORM = { buyerName: "", buyerType: "STUDENT", items: [], paymentMethod: "CASH" };
const tempId = () => `__temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ─── Skeleton rows ────────────────────────────────────────────────────────────
const TableLoadingRows = () => (
    <>
        {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
        ))}
    </>
);

// ─── ItemFormFields ───────────────────────────────────────────────────────────
// MUST be defined OUTSIDE the parent — if inside, React remounts on every
// keystroke (new function identity) and focus is lost.
function ItemFormFields({ itemForm, setItemForm, validation, categories }) {
    const cost = Number(itemForm.costPerUnit) || 0;
    const sell = Number(itemForm.sellingPrice) || 0;

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Error banner — blocks save */}
            {validation?.type === "error" && (
                <div className="col-span-2 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {validation.message}
                </div>
            )}
            {/* Warning banner — allows save but informs */}
            {validation?.type === "warning" && (
                <div className="col-span-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <TrendingDown className="h-4 w-4 flex-shrink-0" />
                    {validation.message}
                </div>
            )}

            <div className="space-y-2">
                <Label>Item Name * <span className="text-xs text-muted-foreground">(max {ITEM_LIMITS.name.max})</span></Label>
                <Input
                    value={itemForm.name}
                    maxLength={ITEM_LIMITS.name.max}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className={validation?.type === "error" && !itemForm.name.trim() ? "border-destructive" : ""}
                />
            </div>

            <div className="space-y-2">
                <Label>Category</Label>
                <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                    <SelectContent>
                        {categories.filter((c) => !c.__optimistic).length === 0
                            ? <div className="p-2 text-sm text-muted-foreground">No categories yet.</div>
                            : categories.filter((c) => !c.__optimistic).map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                    type="number" min={0} max={ITEM_LIMITS.quantity.max}
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                />
            </div>

            <div className="space-y-2">
                <Label>Unit * <span className="text-xs text-muted-foreground">(max {ITEM_LIMITS.unit.max})</span></Label>
                <Input
                    value={itemForm.unit}
                    placeholder="e.g., pcs, kg"
                    maxLength={ITEM_LIMITS.unit.max}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                    type="date"
                    value={itemForm.purchaseDate}
                    onChange={(e) => setItemForm({ ...itemForm, purchaseDate: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label>Cost Per Unit * <span className="text-xs text-muted-foreground">(max ₹{ITEM_LIMITS.costPerUnit.max.toLocaleString("en-IN")})</span></Label>
                <Input
                    type="number" min={0} max={ITEM_LIMITS.costPerUnit.max} step="0.01"
                    value={itemForm.costPerUnit}
                    className={validation?.field === "costPerUnit" && validation?.type === "error" ? "border-destructive" : ""}
                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                />
            </div>

            <div className="space-y-2">
                <Label className={sell > 0 && sell < cost ? "text-amber-600 dark:text-amber-400" : ""}>
                    Selling Price
                    {sell > 0 && sell < cost && <span className="ml-2 text-xs font-normal">(below cost)</span>}
                    {" "}<span className="text-xs text-muted-foreground font-normal">(max ₹{ITEM_LIMITS.sellingPrice.max.toLocaleString("en-IN")})</span>
                </Label>
                <Input
                    type="number" min={0} max={ITEM_LIMITS.sellingPrice.max} step="0.01"
                    value={itemForm.sellingPrice}
                    className={
                        (validation?.field === "sellingPrice" && validation?.type === "error")
                            ? "border-destructive"
                            : (sell > 0 && sell < cost ? "border-amber-400 focus-visible:ring-amber-400" : "")
                    }
                    onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                />
                {/* Live margin indicator */}
                {cost > 0 && sell > 0 && (
                    <p className={`text-xs mt-0.5 ${sell >= cost ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {sell >= cost
                            ? `+₹${(sell - cost).toFixed(2)} margin per unit (${((sell - cost) / cost * 100).toFixed(0)}%)`
                            : `-₹${(cost - sell).toFixed(2)} loss per unit`}
                    </p>
                )}
                {/* Excessive markup warning hint */}
                {cost > 0 && sell > cost * ITEM_LIMITS.maxMarkupMultiple && (
                    <p className="text-xs mt-0.5 text-destructive">
                        Selling price is {Math.round(sell / cost)}× the cost — check for extra zeros
                    </p>
                )}
            </div>

            <div className="flex items-center space-x-2 pt-6">
                <input
                    type="checkbox" id="isSellable"
                    checked={itemForm.isSellable}
                    onChange={(e) => setItemForm({ ...itemForm, isSellable: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isSellable">Is Sellable</Label>
            </div>

            <div className="space-y-2">
                <Label>Vendor Name <span className="text-xs text-muted-foreground">(max {ITEM_LIMITS.vendorName.max})</span></Label>
                <Input value={itemForm.vendorName} maxLength={ITEM_LIMITS.vendorName.max} onChange={(e) => setItemForm({ ...itemForm, vendorName: e.target.value })} />
            </div>

            <div className="space-y-2">
                <Label>Vendor Contact <span className="text-xs text-muted-foreground">(max {ITEM_LIMITS.vendorContact.max})</span></Label>
                <Input value={itemForm.vendorContact} maxLength={ITEM_LIMITS.vendorContact.max} onChange={(e) => setItemForm({ ...itemForm, vendorContact: e.target.value })} />
            </div>

            <div className="space-y-2">
                <Label>Location <span className="text-xs text-muted-foreground">(max {ITEM_LIMITS.location.max})</span></Label>
                <Input value={itemForm.location} placeholder="Storage location" maxLength={ITEM_LIMITS.location.max} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
            </div>

            <div className="space-y-2">
                <Label>Status</Label>
                <Select value={normalizeStatus(itemForm.status)} onValueChange={(v) => setItemForm({ ...itemForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                        <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InventoryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounceValue(searchInput, 350);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
    const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
    const [saleForm, setSaleForm] = useState(EMPTY_SALE_FORM);

    // Live validation from shared lib — runs on every itemForm change
    const validation = validateItemForm(itemForm);

    // Per-line sale validation errors — keyed by itemId
    const [saleLineErrors, setSaleLineErrors] = useState({});

    const itemsQueryKey = ["inventory-items", schoolId, searchTerm, selectedCategory, selectedStatus, sortColumn, sortDirection, currentPage, pageSize];
    const salesQueryKey = ["inventory-sales", schoolId];
    const statsQueryKey = ["inventory-stats", schoolId];
    const categoriesQueryKey = ["inventory-categories", schoolId];
    const sellableQueryKey = ["inventory-sellable", schoolId];

    const { data: stats } = useQuery({
        queryKey: statsQueryKey,
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/stats`)).data,
        enabled: !!schoolId, staleTime: 30_000, refetchOnWindowFocus: false,
    });
    const { data: categories = [] } = useQuery({
        queryKey: categoriesQueryKey,
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/categories`)).data,
        enabled: !!schoolId, staleTime: 60_000, refetchOnWindowFocus: false,
    });
    const { data: itemsResponse, isLoading, isFetching } = useQuery({
        queryKey: itemsQueryKey,
        queryFn: async () => {
            const p = new URLSearchParams();
            if (searchTerm) p.set("search", searchTerm);
            if (selectedCategory !== "all") p.set("categoryId", selectedCategory);
            if (selectedStatus !== "all") p.set("status", selectedStatus);
            p.set("sortColumn", sortColumn); p.set("sortDirection", sortDirection);
            p.set("page", currentPage); p.set("limit", pageSize);
            return (await axios.get(`/api/schools/${schoolId}/inventory/items?${p}`)).data;
        },
        enabled: !!schoolId, placeholderData: keepPreviousData, staleTime: 10_000, refetchOnWindowFocus: false,
    });
    const items = itemsResponse?.data || [];
    const totalItems = itemsResponse?.meta?.total || 0;
    const totalPages = itemsResponse?.meta?.totalPages || 1;

    const { data: sales = [] } = useQuery({
        queryKey: salesQueryKey,
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/sales`)).data,
        enabled: !!schoolId, staleTime: 30_000, refetchOnWindowFocus: false,
    });
    const { data: sellableItemsResponse } = useQuery({
        queryKey: sellableQueryKey,
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/items?all=true`)).data,
        enabled: !!schoolId && isSaleDialogOpen, staleTime: 30_000, refetchOnWindowFocus: false,
    });
    const sellableItems = sellableItemsResponse?.data || [];

    // ── Mutations (unchanged from previous version) ───────────────────────────
    const addItemMutation = useMutation({
        mutationFn: async (data) => (await axios.post(`/api/schools/${schoolId}/inventory/items`, data)).data,
        onMutate: async (newItemData) => {
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            await queryClient.cancelQueries({ queryKey: statsQueryKey });
            const previousItemsData = queryClient.getQueryData(itemsQueryKey);
            const previousStats = queryClient.getQueryData(statsQueryKey);
            const optimisticItem = { ...newItemData, id: tempId(), __optimistic: true, createdAt: new Date().toISOString() };
            queryClient.setQueryData(itemsQueryKey, (old) =>
                old?.data ? { ...old, data: [optimisticItem, ...old.data], meta: { ...old.meta, total: (old.meta?.total || 0) + 1 } } : old
            );
            queryClient.setQueryData(statsQueryKey, (old) =>
                old ? { ...old, totalItems: (old.totalItems || 0) + 1 } : old
            );
            return { previousItemsData, previousStats };
        },
        onError: (error, _vars, context) => {
            if (context?.previousItemsData !== undefined) queryClient.setQueryData(itemsQueryKey, context.previousItemsData);
            if (context?.previousStats !== undefined) queryClient.setQueryData(statsQueryKey, context.previousStats);
            toast.error(error.response?.data?.error || "Failed to add item");
        },
        onSuccess: (newItem) => {
            toast.success("Item added");
            setIsAddItemOpen(false);
            setItemForm(EMPTY_ITEM_FORM);
            queryClient.setQueryData(itemsQueryKey, (old) =>
                old?.data ? { ...old, data: old.data.map((item) => item.__optimistic ? newItem : item) } : old
            );
            queryClient.invalidateQueries({ queryKey: statsQueryKey });
            queryClient.invalidateQueries({ queryKey: sellableQueryKey });
        },
    });

    const updateItemMutation = useMutation({
        mutationFn: async ({ id, data }) => (await axios.put(`/api/schools/${schoolId}/inventory/items/${id}`, data)).data,
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            const previousData = queryClient.getQueryData(itemsQueryKey);
            queryClient.setQueryData(itemsQueryKey, (old) =>
                old?.data ? { ...old, data: old.data.map((item) => item.id === id ? { ...item, ...data, __optimistic: true } : item) } : old
            );
            return { previousData };
        },
        onError: (err, _vars, context) => {
            if (context?.previousData !== undefined) queryClient.setQueryData(itemsQueryKey, context.previousData);
            toast.error(err.response?.data?.error || "Failed to update item");
        },
        onSuccess: (updatedItem, { id }) => {
            toast.success("Item updated");
            setIsEditDialogOpen(false); setSelectedItem(null); setItemForm(EMPTY_ITEM_FORM);
            if (updatedItem) {
                queryClient.setQueryData(itemsQueryKey, (old) =>
                    old?.data ? { ...old, data: old.data.map((item) => item.id === id ? { ...updatedItem, __optimistic: false } : item) } : old
                );
            }
            queryClient.invalidateQueries({ queryKey: statsQueryKey });
            queryClient.invalidateQueries({ queryKey: sellableQueryKey });
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (id) => axios.delete(`/api/schools/${schoolId}/inventory/items/${id}`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            await queryClient.cancelQueries({ queryKey: statsQueryKey });
            const previousItemsData = queryClient.getQueryData(itemsQueryKey);
            const previousStats = queryClient.getQueryData(statsQueryKey);
            queryClient.setQueryData(itemsQueryKey, (old) =>
                old?.data ? { ...old, data: old.data.filter((item) => item.id !== id), meta: { ...old.meta, total: Math.max(0, (old.meta?.total || 1) - 1) } } : old
            );
            queryClient.setQueryData(statsQueryKey, (old) =>
                old ? { ...old, totalItems: Math.max(0, (old.totalItems || 1) - 1) } : old
            );
            return { previousItemsData, previousStats };
        },
        onError: (err, _id, context) => {
            if (context?.previousItemsData !== undefined) queryClient.setQueryData(itemsQueryKey, context.previousItemsData);
            if (context?.previousStats !== undefined) queryClient.setQueryData(statsQueryKey, context.previousStats);
            toast.error(err.response?.data?.error || "Failed to delete item");
        },
        onSuccess: () => {
            toast.success("Item deleted");
            setIsDeleteDialogOpen(false); setItemToDelete(null);
            queryClient.invalidateQueries({ queryKey: statsQueryKey });
            queryClient.invalidateQueries({ queryKey: sellableQueryKey });
        },
    });

    const addCategoryMutation = useMutation({
        mutationFn: async (data) => (await axios.post(`/api/schools/${schoolId}/inventory/categories`, data)).data,
        onMutate: async (newCatData) => {
            await queryClient.cancelQueries({ queryKey: categoriesQueryKey });
            const previousCategories = queryClient.getQueryData(categoriesQueryKey);
            queryClient.setQueryData(categoriesQueryKey, (old = []) => [
                ...old, { ...newCatData, id: tempId(), __optimistic: true, _count: { items: 0 } },
            ]);
            return { previousCategories };
        },
        onError: (err, _vars, context) => {
            if (context?.previousCategories !== undefined) queryClient.setQueryData(categoriesQueryKey, context.previousCategories);
            toast.error(err.response?.data?.error || "Failed to add category");
        },
        onSuccess: (newCat) => {
            toast.success("Category added"); setIsAddCategoryOpen(false); setCategoryForm({ name: "", description: "" });
            queryClient.setQueryData(categoriesQueryKey, (old = []) => old.map((cat) => (cat.__optimistic ? newCat : cat)));
        },
    });

    const createSaleMutation = useMutation({
        mutationFn: async (data) => (await axios.post(`/api/schools/${schoolId}/inventory/sales`, data)).data,
        onMutate: async (newSaleData) => {
            await queryClient.cancelQueries({ queryKey: salesQueryKey });
            await queryClient.cancelQueries({ queryKey: statsQueryKey });
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            const previousSales = queryClient.getQueryData(salesQueryKey);
            const previousStats = queryClient.getQueryData(statsQueryKey);
            const previousItems = queryClient.getQueryData(itemsQueryKey);
            const totalAmount = newSaleData.items.reduce((sum, si) => sum + si.unitPrice * si.quantity, 0);
            queryClient.setQueryData(salesQueryKey, (old = []) => [{
                id: tempId(), __optimistic: true, saleDate: new Date().toISOString(),
                buyerName: newSaleData.buyerName, buyerType: newSaleData.buyerType,
                paymentMethod: newSaleData.paymentMethod, totalAmount, status: "COMPLETED",
                items: newSaleData.items.map((si) => ({
                    id: tempId(), itemId: si.itemId, quantity: si.quantity,
                    unitPrice: si.unitPrice, totalPrice: si.unitPrice * si.quantity,
                    item: { name: si.name },
                })),
            }, ...old]);
            queryClient.setQueryData(statsQueryKey, (old) =>
                old ? { ...old, totalRevenue: (old.totalRevenue || 0) + totalAmount } : old
            );
            queryClient.setQueryData(itemsQueryKey, (old) => {
                if (!old?.data) return old;
                const deductions = Object.fromEntries(newSaleData.items.map((si) => [si.itemId, si.quantity]));
                return { ...old, data: old.data.map((item) => deductions[item.id] ? { ...item, quantity: Math.max(0, item.quantity - deductions[item.id]) } : item) };
            });
            return { previousSales, previousStats, previousItems };
        },
        onError: (error, _vars, context) => {
            if (context?.previousSales !== undefined) queryClient.setQueryData(salesQueryKey, context.previousSales);
            if (context?.previousStats !== undefined) queryClient.setQueryData(statsQueryKey, context.previousStats);
            if (context?.previousItems !== undefined) queryClient.setQueryData(itemsQueryKey, context.previousItems);
            toast.error(error.response?.data?.error || "Failed to record sale");
        },
        onSuccess: (newSale) => {
            toast.success("Sale recorded"); setIsSaleDialogOpen(false); setSaleForm(EMPTY_SALE_FORM); setSaleLineErrors({});
            if (newSale) {
                queryClient.setQueryData(salesQueryKey, (old = []) => old.map((sale) => (sale.__optimistic ? newSale : sale)));
            }
            queryClient.invalidateQueries({ queryKey: salesQueryKey });
            queryClient.invalidateQueries({ queryKey: statsQueryKey });
            queryClient.invalidateQueries({ queryKey: itemsQueryKey });
            queryClient.invalidateQueries({ queryKey: sellableQueryKey });
        },
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    const clearAllFilters = () => { setSearchInput(""); setSelectedCategory("all"); setSelectedStatus("all"); setCurrentPage(1); };
    const handleSort = (column) => {
        if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        else { setSortColumn(column); setSortDirection("asc"); }
        setCurrentPage(1);
    };
    const openEdit = (item) => {
        setSelectedItem(item);
        setItemForm({
            name: item.name || "", categoryId: item.categoryId || "",
            quantity: item.quantity || 0, unit: item.unit || "",
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            costPerUnit: Number(item.costPerUnit) || 0, sellingPrice: Number(item.sellingPrice) || 0,
            isSellable: item.isSellable || false, vendorName: item.vendorName || "",
            vendorContact: item.vendorContact || "", location: item.location || "",
            status: normalizeStatus(item.status), imageUrl: item.imageUrl || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleAddItem = () => { if (validation?.type !== "error") addItemMutation.mutate(itemForm); };
    const handleUpdateItem = () => { if (validation?.type !== "error") updateItemMutation.mutate({ id: selectedItem?.id, data: itemForm }); };

    // Validate all sale lines before submitting
    const handleRecordSale = () => {
        const errors = {};
        for (const si of saleForm.items) {
            const masterItem = sellableItems.find(i => i.id === si.itemId);
            const err = validateSaleLine(si, masterItem?.sellingPrice, masterItem?.costPerUnit);
            if (err) errors[si.itemId] = err;
        }
        setSaleLineErrors(errors);
        if (Object.keys(errors).length > 0) return; // block if any line has an error
        createSaleMutation.mutate(saleForm);
    };

    // When adding an item to the sale form, validate immediately
    const handleAddSaleItem = (itemId) => {
        const item = sellableItems.find(i => i.id === itemId);
        if (!item) return;
        if (saleForm.items.find(si => si.itemId === itemId)) { toast.error("Item already added"); return; }
        const unitPrice = Number(item.sellingPrice) > 0 ? Number(item.sellingPrice) : Number(item.costPerUnit);
        setSaleForm({ ...saleForm, items: [...saleForm.items, { itemId: item.id, name: item.name, quantity: 1, unitPrice, maxQuantity: item.quantity, unit: item.unit }] });
        // Clear any previous error for this item
        setSaleLineErrors((prev) => { const e = { ...prev }; delete e[itemId]; return e; });
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort(column)}>
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    if (!schoolId) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    const hasSaleErrors = Object.keys(saleLineErrors).length > 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />Inventory Management
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage items, track sales, and monitor stock levels</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { queryClient.invalidateQueries({ queryKey: ["inventory-items", schoolId] }); queryClient.invalidateQueries({ queryKey: statsQueryKey }); }}>
                        <RefreshCw className="w-4 h-4 mr-2" />Refresh
                    </Button>
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                        <DialogTrigger asChild><Button variant="outline"><Tag className="h-4 w-4 mr-2" />Add Category</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Category Name <span className="text-xs text-muted-foreground">(max 100)</span></Label>
                                    <Input value={categoryForm.name} maxLength={100} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Uniforms, Stationery" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
                                </div>
                                <Button onClick={() => addCategoryMutation.mutate(categoryForm)} className="w-full" disabled={addCategoryMutation.isPending || !categoryForm.name.trim()}>
                                    {addCategoryMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add Category"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddItemOpen} onOpenChange={(o) => { setIsAddItemOpen(o); if (!o) setItemForm(EMPTY_ITEM_FORM); }}>
                        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Item</Button></DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Add New Inventory Item</DialogTitle></DialogHeader>
                            <div className="space-y-2 mb-4">
                                <Label>Product Image</Label>
                                <FileUploadButton field="Product" value={itemForm.imageUrl} onChange={(url) => setItemForm({ ...itemForm, imageUrl: url })} saveToLibrary={true} compact={true} />
                            </div>
                            <ItemFormFields itemForm={itemForm} setItemForm={setItemForm} validation={validation} categories={categories} />
                            <Button onClick={handleAddItem} className="w-full mt-4" disabled={addItemMutation.isPending || validation?.type === "error"}>
                                {addItemMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add Item"}
                            </Button>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats?.totalItems || 0}</div><p className="text-xs text-muted-foreground mt-1">{categories.filter(c => !c.__optimistic).length} categories</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle><AlertTriangle className="h-4 w-4 text-yellow-500" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{stats?.lowStockItems || 0}</div><p className="text-xs text-muted-foreground mt-1">Needs restock</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{Number(stats?.totalRevenue || 0).toFixed(2)}</div><p className="text-xs text-muted-foreground mt-1">From {sales.filter(s => !s.__optimistic).length} sales</p></CardContent>
                </Card>
                <ProfitCard stats={stats} schoolId={schoolId} statsQueryKey={statsQueryKey} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                    <Card className="border">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="relative lg:col-span-2">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search by name, vendor, or location..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }} className="pl-10" />
                                </div>
                                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                                    <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.filter(c => !c.__optimistic).map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                                    <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="in_stock">In Stock</SelectItem>
                                        <SelectItem value="low">Low Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={clearAllFilters}><RotateCcw className="w-4 h-4 mr-2" />Clear</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Inventory Items ({totalItems})
                                        {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    </CardTitle>
                                    <CardDescription>All items in your inventory</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                                    <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:bg-background/50 bg-muted/50">
                                            <TableHead className="w-[60px]">Image</TableHead>
                                            <SortableHeader column="name">Name</SortableHeader>
                                            <TableHead>Category</TableHead>
                                            <SortableHeader column="quantity">Qty</SortableHeader>
                                            <SortableHeader column="costPerUnit">Cost</SortableHeader>
                                            <SortableHeader column="sellingPrice">Price</SortableHeader>
                                            <SortableHeader column="location">Location</SortableHeader>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right w-[60px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? <TableLoadingRows /> : items.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <PackageOpen className="w-12 h-12 text-muted-foreground/50" />
                                                    <p className="text-muted-foreground">No items found</p>
                                                    <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear filters</Button>
                                                </div>
                                            </TableCell></TableRow>
                                        ) : items.map((item, index) => (
                                            <TableRow key={item.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted/20 dark:bg-background/20" : ""} ${item.__optimistic ? "opacity-60" : ""}`}>
                                                <TableCell>
                                                    {item.imageUrl
                                                        ? <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted"><img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" /></div>
                                                        : <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/50" /></div>}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {item.name}
                                                    {item.__optimistic && <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />saving</span>}
                                                </TableCell>
                                                <TableCell>
                                                    {categories.find((c) => c.id === item.categoryId)?.name
                                                        ? <Badge variant="outline" className="text-xs">{categories.find((c) => c.id === item.categoryId)?.name}</Badge>
                                                        : <span className="text-muted-foreground text-xs">—</span>}
                                                </TableCell>
                                                <TableCell className="font-mono">{item.quantity} {item.unit}</TableCell>
                                                <TableCell className="text-muted-foreground">₹{Number(item.costPerUnit).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {Number(item.sellingPrice) > 0
                                                        ? <span className={Number(item.sellingPrice) < Number(item.costPerUnit) ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                                                            ₹{Number(item.sellingPrice).toFixed(2)}
                                                        </span>
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{item.location || "—"}</TableCell>
                                                <TableCell>{getStockBadge(item.quantity, item.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild disabled={!!item.__optimistic}>
                                                            <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setSelectedItem(item); setIsViewDialogOpen(true); }}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEdit(item)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600" onClick={() => { setItemToDelete(item); setIsDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} items</p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;
                                                return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 p-0">{pageNum}</Button>;
                                            })}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sales" className="space-y-4">
                    <SalesTab sales={sales.filter(s => !s.__optimistic)} onNewSale={() => setIsSaleDialogOpen(true)} />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div><CardTitle>Inventory Categories</CardTitle><CardDescription>Organize your inventory with categories</CardDescription></div>
                                <Button variant="outline" onClick={() => setIsAddCategoryOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {categories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6"><FolderOpen className="h-10 w-10 text-muted-foreground/60" /></div>
                                    <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">Create categories like &apos;Uniforms&apos;, &apos;Stationery&apos;, or &apos;Electronics&apos;.</p>
                                    <Button onClick={() => setIsAddCategoryOpen(true)}><Plus className="h-4 w-4 mr-2" />Create First Category</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {categories.map((category) => (
                                        <Card key={category.id} className={`hover:shadow-md transition-all ${category.__optimistic ? "opacity-60" : ""}`}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Tag className="h-4 w-4 text-primary" />
                                                    {category.name}
                                                    {category.__optimistic && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-normal"><Loader2 className="h-3 w-3 animate-spin" />saving</span>}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
                                                <p className="text-sm font-medium mt-2">{category._count?.items || 0} items</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{itemToDelete?.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this item. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteItemMutation.mutate(itemToDelete?.id); }} disabled={deleteItemMutation.isPending} className="bg-red-600 hover:bg-red-700">
                            {deleteItemMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Item Details</DialogTitle></DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4">
                            {selectedItem.imageUrl && <div className="w-full h-48 rounded-lg overflow-hidden border bg-muted"><img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" /></div>}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    ["Name", selectedItem.name],
                                    ["Category", categories.find(c => c.id === selectedItem.categoryId)?.name || "—"],
                                    ["Quantity", `${selectedItem.quantity} ${selectedItem.unit}`],
                                    ["Status", null],
                                    ["Cost Per Unit", `₹${Number(selectedItem.costPerUnit).toFixed(2)}`],
                                    ["Selling Price", Number(selectedItem.sellingPrice) > 0 ? `₹${Number(selectedItem.sellingPrice).toFixed(2)}` : "—"],
                                    ["Location", selectedItem.location || "—"],
                                    ["Sellable", selectedItem.isSellable ? "Yes" : "No"],
                                    ["Vendor Name", selectedItem.vendorName || "—"],
                                    ["Vendor Contact", selectedItem.vendorContact || "—"],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        {label === "Status" ? <div className="mt-1">{getStockBadge(selectedItem.quantity, selectedItem.status)}</div> : <p className="font-medium text-sm">{value}</p>}
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                                    <p className="font-medium text-sm">{selectedItem.purchaseDate ? new Date(selectedItem.purchaseDate).toLocaleDateString() : "—"}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button className="flex-1" onClick={() => { setIsViewDialogOpen(false); openEdit(selectedItem); }}><Pencil className="w-4 h-4 mr-2" />Edit Item</Button>
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(o) => { setIsEditDialogOpen(o); if (!o) { setSelectedItem(null); setItemForm(EMPTY_ITEM_FORM); } }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Inventory Item</DialogTitle></DialogHeader>
                    <div className="space-y-2 mb-4">
                        <Label>Product Image</Label>
                        <FileUploadButton field="Product" value={itemForm.imageUrl} onChange={(url) => setItemForm({ ...itemForm, imageUrl: url })} saveToLibrary={true} compact={true} />
                    </div>
                    <ItemFormFields itemForm={itemForm} setItemForm={setItemForm} validation={validation} categories={categories} />
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleUpdateItem} className="flex-1" disabled={updateItemMutation.isPending || validation?.type === "error"}>
                            {updateItemMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Update Item"}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sale Dialog */}
            <Dialog open={isSaleDialogOpen} onOpenChange={(o) => { setIsSaleDialogOpen(o); if (!o) { setSaleForm(EMPTY_SALE_FORM); setSaleLineErrors({}); } }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Record New Sale</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Buyer Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Buyer Name *</Label>
                                    <Input value={saleForm.buyerName} onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })} placeholder="Enter buyer name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Buyer Type</Label>
                                    <Select value={saleForm.buyerType} onValueChange={(v) => setSaleForm({ ...saleForm, buyerType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STUDENT">Student</SelectItem>
                                            <SelectItem value="STAFF">Staff</SelectItem>
                                            <SelectItem value="EXTERNAL">External</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sale Items</h3>
                                <Badge variant="outline">{saleForm.items.length} item(s)</Badge>
                            </div>
                            <Select onValueChange={handleAddSaleItem}>
                                <SelectTrigger><SelectValue placeholder="Select an item to add..." /></SelectTrigger>
                                <SelectContent>
                                    {sellableItems.length === 0
                                        ? <div className="p-3 text-sm text-muted-foreground text-center">No sellable items. Mark items as sellable first.</div>
                                        : sellableItems.map((item) => {
                                            const price = Number(item.sellingPrice) > 0 ? Number(item.sellingPrice) : Number(item.costPerUnit);
                                            return (
                                                <SelectItem key={item.id} value={item.id}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{item.name}</span>
                                                        <span className="text-muted-foreground text-xs">₹{price.toFixed(2)} · {item.quantity} {item.unit} left</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                </SelectContent>
                            </Select>

                            {saleForm.items.length > 0 ? (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="text-xs py-2">Item</TableHead>
                                                <TableHead className="w-[140px] text-xs py-2">Quantity</TableHead>
                                                <TableHead className="text-xs py-2 text-right">Unit Price</TableHead>
                                                <TableHead className="text-xs py-2 text-right">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {saleForm.items.map((saleItem, idx) => (
                                                <React.Fragment key={saleItem.itemId}>
                                                    <TableRow>
                                                        <TableCell>
                                                            <span className="font-medium text-sm">{saleItem.name}</span>
                                                            <p className="text-xs text-muted-foreground">{saleItem.maxQuantity} {saleItem.unit} available</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { if (saleItem.quantity <= 1) return; const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: u[idx].quantity - 1 }; setSaleForm({ ...saleForm, items: u }); }} disabled={saleItem.quantity <= 1}>−</Button>
                                                                <Input type="number" min="1" max={saleItem.maxQuantity} value={saleItem.quantity}
                                                                    onChange={(e) => { const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), saleItem.maxQuantity); const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: val }; setSaleForm({ ...saleForm, items: u }); }}
                                                                    className="h-7 w-14 text-center px-1" />
                                                                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { if (saleItem.quantity >= saleItem.maxQuantity) return; const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 }; setSaleForm({ ...saleForm, items: u }); }} disabled={saleItem.quantity >= saleItem.maxQuantity}>+</Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm">₹{Number(saleItem.unitPrice).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono font-medium text-sm">₹{(Number(saleItem.unitPrice) * saleItem.quantity).toFixed(2)}</TableCell>
                                                        <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => { setSaleForm({ ...saleForm, items: saleForm.items.filter((_, i) => i !== idx) }); setSaleLineErrors((prev) => { const e = { ...prev }; delete e[saleItem.itemId]; return e; }); }}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                                                    </TableRow>
                                                    {/* Per-line validation error */}
                                                    {saleLineErrors[saleItem.itemId] && (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="py-1 px-3">
                                                                <p className="text-xs text-destructive flex items-center gap-1">
                                                                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                                    {saleLineErrors[saleItem.itemId]}
                                                                </p>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 border-t">
                                        <span className="font-semibold text-sm">Total Amount</span>
                                        <span className="text-lg font-bold">₹{saleForm.items.reduce((sum, si) => sum + (Number(si.unitPrice) * si.quantity), 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No items added yet.</p>
                                </div>
                            )}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={saleForm.paymentMethod} onValueChange={(v) => setSaleForm({ ...saleForm, paymentMethod: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="ONLINE">Online</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Global sale error summary */}
                        {hasSaleErrors && (
                            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Fix the errors above before recording this sale.</span>
                            </div>
                        )}
                        {createSaleMutation.isError && createSaleMutation.error?.response?.status === 409 && (
                            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Stock changed while recording — another transaction may have used the last unit. Check quantities and try again.</span>
                            </div>
                        )}

                        <Button
                            onClick={handleRecordSale}
                            className="w-full"
                            disabled={createSaleMutation.isPending || !saleForm.buyerName.trim() || saleForm.items.length === 0 || hasSaleErrors}
                        >
                            {createSaleMutation.isPending
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording...</>
                                : <><Receipt className="h-4 w-4 mr-2" />Record Sale — ₹{saleForm.items.reduce((sum, si) => sum + (Number(si.unitPrice) * si.quantity), 0).toFixed(2)}</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}