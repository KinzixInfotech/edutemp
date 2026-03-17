"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Loader2, Package, TrendingUp, AlertTriangle, ShoppingCart, Plus, Search,
    DollarSign, PackageOpen, FolderOpen, Receipt, ImageIcon, MoreHorizontal,
    ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Eye, Pencil, Trash2, Tag,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import FileUploadButton from "@/components/fileupload";
import SalesTab from "./SalesTab";

// ─── Status helpers ────────────────────────────────────────────────────────────
// Normalize status from DB (handles both "IN_STOCK" and "in_stock" from bulk imports)
const normalizeStatus = (s) => (s || "IN_STOCK").toUpperCase();

const getStockBadge = (quantity) => {
    if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (quantity <= 5) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
};

const EMPTY_ITEM_FORM = {
    name: "", categoryId: "", quantity: 0, unit: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    costPerUnit: 0, sellingPrice: 0, isSellable: false,
    vendorName: "", vendorContact: "", location: "", status: "IN_STOCK", imageUrl: "",
};

const EMPTY_SALE_FORM = { buyerName: "", buyerType: "STUDENT", items: [], paymentMethod: "CASH" };

// ─── Loading skeleton rows ─────────────────────────────────────────────────────
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

export default function InventoryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // ─── UI state ──────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
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

    // ─── Shared query key ──────────────────────────────────────────────────────
    const itemsQueryKey = ["inventory-items", schoolId, searchTerm, selectedCategory, selectedStatus, sortColumn, sortDirection, currentPage, pageSize];

    // ─── Stats query ───────────────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ["inventory-stats", schoolId],
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/stats`)).data,
        enabled: !!schoolId,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    // ─── Categories query ──────────────────────────────────────────────────────
    const { data: categories = [] } = useQuery({
        queryKey: ["inventory-categories", schoolId],
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/categories`)).data,
        enabled: !!schoolId,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    // ─── Items query (server-side paginated) ───────────────────────────────────
    const { data: itemsResponse, isLoading, isFetching } = useQuery({
        queryKey: itemsQueryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchTerm) params.set("search", searchTerm);
            if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
            if (selectedStatus !== "all") params.set("status", selectedStatus);
            params.set("sortColumn", sortColumn);
            params.set("sortDirection", sortDirection);
            params.set("page", currentPage);
            params.set("limit", pageSize);
            return (await axios.get(`/api/schools/${schoolId}/inventory/items?${params}`)).data;
        },
        enabled: !!schoolId,
        placeholderData: keepPreviousData,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
    });

    const items = itemsResponse?.data || [];
    const totalItems = itemsResponse?.meta?.total || 0;
    const totalPages = itemsResponse?.meta?.totalPages || 1;

    // ─── Sales query ───────────────────────────────────────────────────────────
    const { data: sales = [] } = useQuery({
        queryKey: ["inventory-sales", schoolId],
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/sales`)).data,
        enabled: !!schoolId,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    // ─── All sellable items (for sale dialog) ──────────────────────────────────
    const { data: sellableItemsResponse } = useQuery({
        queryKey: ["inventory-sellable", schoolId],
        queryFn: async () => (await axios.get(`/api/schools/${schoolId}/inventory/items?all=true`)).data,
        enabled: !!schoolId && isSaleDialogOpen,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
    const sellableItems = sellableItemsResponse?.data || [];

    // ─── ADD ITEM mutation ─────────────────────────────────────────────────────
    const addItemMutation = useMutation({
        mutationFn: async (data) => (await axios.post(`/api/schools/${schoolId}/inventory/items`, data)).data,
        onSuccess: (newItem) => {
            toast.success("Item added successfully");
            setIsAddItemOpen(false);
            setItemForm(EMPTY_ITEM_FORM);
            // Prepend to current page cache
            queryClient.setQueryData(itemsQueryKey, (old) => {
                if (!old?.data) return old;
                return { ...old, data: [newItem, ...old.data], meta: { ...old.meta, total: old.meta.total + 1 } };
            });
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-sellable"], refetchType: "none" });
        },
        onError: (error) => toast.error(error.response?.data?.error || "Failed to add item"),
    });

    // ─── UPDATE ITEM mutation (optimistic) ─────────────────────────────────────
    const updateItemMutation = useMutation({
        mutationFn: async ({ id, data }) => axios.put(`/api/schools/${schoolId}/inventory/items/${id}`, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            const previousData = queryClient.getQueryData(itemsQueryKey);
            queryClient.setQueryData(itemsQueryKey, (old) => {
                if (!old?.data) return old;
                return { ...old, data: old.data.map((item) => item.id === id ? { ...item, ...data } : item) };
            });
            return { previousData };
        },
        onError: (err, _, context) => {
            queryClient.setQueryData(itemsQueryKey, context.previousData);
            toast.error(err.response?.data?.error || "Failed to update item");
        },
        onSuccess: () => {
            toast.success("Item updated successfully");
            setIsEditDialogOpen(false);
            setSelectedItem(null);
            setItemForm(EMPTY_ITEM_FORM);
            queryClient.invalidateQueries({ queryKey: ["inventory-items"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"], refetchType: "none" });
        },
    });

    // ─── DELETE ITEM mutation (optimistic) ─────────────────────────────────────
    const deleteItemMutation = useMutation({
        mutationFn: async (id) => axios.delete(`/api/schools/${schoolId}/inventory/items/${id}`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: itemsQueryKey });
            const previousData = queryClient.getQueryData(itemsQueryKey);
            queryClient.setQueryData(itemsQueryKey, (old) => {
                if (!old?.data) return old;
                return { ...old, data: old.data.filter((item) => item.id !== id), meta: { ...old.meta, total: old.meta.total - 1 } };
            });
            return { previousData };
        },
        onError: (err, _, context) => {
            queryClient.setQueryData(itemsQueryKey, context.previousData);
            toast.error(err.response?.data?.error || "Failed to delete item");
        },
        onSuccess: () => {
            toast.success("Item deleted successfully");
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-sellable"], refetchType: "none" });
        },
    });

    // ─── ADD CATEGORY mutation ─────────────────────────────────────────────────
    const addCategoryMutation = useMutation({
        mutationFn: async (data) => (await axios.post(`/api/schools/${schoolId}/inventory/categories`, data)).data,
        onSuccess: (newCat) => {
            toast.success("Category added successfully");
            setIsAddCategoryOpen(false);
            setCategoryForm({ name: "", description: "" });
            queryClient.setQueryData(["inventory-categories", schoolId], (old = []) => [...old, newCat]);
        },
        onError: () => toast.error("Failed to add category"),
    });

    // ─── CREATE SALE mutation ──────────────────────────────────────────────────
    const createSaleMutation = useMutation({
        mutationFn: async (data) => axios.post(`/api/schools/${schoolId}/inventory/sales`, data),
        onSuccess: () => {
            toast.success("Sale recorded successfully");
            setIsSaleDialogOpen(false);
            setSaleForm(EMPTY_SALE_FORM);
            queryClient.invalidateQueries({ queryKey: ["inventory-sales"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-stats"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-items"], refetchType: "none" });
            queryClient.invalidateQueries({ queryKey: ["inventory-sellable"], refetchType: "none" });
        },
        onError: (error) => toast.error(error.response?.data?.error || "Failed to record sale"),
    });

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const clearAllFilters = () => { setSearchTerm(""); setSelectedCategory("all"); setSelectedStatus("all"); setCurrentPage(1); };

    const handleSort = (column) => {
        if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        else { setSortColumn(column); setSortDirection("asc"); }
        setCurrentPage(1);
    };

    const openEdit = (item) => {
        setSelectedItem(item);
        setItemForm({
            name: item.name || "",
            categoryId: item.categoryId || "",
            quantity: item.quantity || 0,
            unit: item.unit || "",
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            costPerUnit: item.costPerUnit || 0,
            sellingPrice: item.sellingPrice || 0,
            isSellable: item.isSellable || false,
            vendorName: item.vendorName || "",
            vendorContact: item.vendorContact || "",
            location: item.location || "",
            status: normalizeStatus(item.status), // ← normalize here
            imageUrl: item.imageUrl || "",
        });
        setIsEditDialogOpen(true);
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

    // ─── Item form fields (reused in add + edit dialogs) ──────────────────────
    const ItemFormFields = () => (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Item Name *</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
            <div className="space-y-2">
                <Label>Category</Label>
                <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                    <SelectContent>
                        {categories.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No categories yet.</div> : categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Unit *</Label><Input value={itemForm.unit} placeholder="e.g., pcs, kg" onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></div>
            <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={itemForm.purchaseDate} onChange={(e) => setItemForm({ ...itemForm, purchaseDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cost Per Unit *</Label><Input type="number" step="0.01" value={itemForm.costPerUnit} onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Selling Price</Label><Input type="number" step="0.01" value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex items-center space-x-2 pt-6">
                <input type="checkbox" id="isSellable" checked={itemForm.isSellable} onChange={(e) => setItemForm({ ...itemForm, isSellable: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="isSellable">Is Sellable</Label>
            </div>
            <div className="space-y-2"><Label>Vendor Name *</Label><Input value={itemForm.vendorName} onChange={(e) => setItemForm({ ...itemForm, vendorName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Vendor Contact *</Label><Input value={itemForm.vendorContact} onChange={(e) => setItemForm({ ...itemForm, vendorContact: e.target.value })} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input value={itemForm.location} placeholder="Storage location" onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} /></div>
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />Inventory Management
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage inventory items, track sales, and monitor stock levels</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ["inventory-items", schoolId] });
                        queryClient.invalidateQueries({ queryKey: ["inventory-stats", schoolId] });
                    }}>
                        <RefreshCw className="w-4 h-4 mr-2" />Refresh
                    </Button>
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                        <DialogTrigger asChild><Button variant="outline"><Tag className="h-4 w-4 mr-2" />Add Category</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2"><Label>Category Name</Label><Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Uniforms, Stationery" /></div>
                                <div className="space-y-2"><Label>Description</Label><Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" /></div>
                                <Button onClick={() => addCategoryMutation.mutate(categoryForm)} className="w-full" disabled={addCategoryMutation.isPending}>
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
                            <ItemFormFields />
                            <Button onClick={() => addItemMutation.mutate(itemForm)} className="w-full mt-4" disabled={addItemMutation.isPending}>
                                {addItemMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding Item...</> : "Add Item"}
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
                    <CardContent><div className="text-2xl font-bold">{stats?.totalItems || 0}</div><p className="text-xs text-muted-foreground mt-1">{categories.length} categories</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle><AlertTriangle className="h-4 w-4 text-yellow-500" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{stats?.lowStockItems || 0}</div><p className="text-xs text-muted-foreground mt-1">Needs restock</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-green-500" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{stats?.totalRevenue?.toFixed(2) || "0.00"}</div><p className="text-xs text-muted-foreground mt-1">From {sales.length} sales</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Profit</CardTitle><TrendingUp className="h-4 w-4 text-blue-500" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">₹{stats?.totalProfit?.toFixed(2) || "0.00"}</div></CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="items">Items</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                </TabsList>

                {/* Items Tab */}
                <TabsContent value="items" className="space-y-4">
                    <Card className="border">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="relative lg:col-span-2">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search by name, vendor, or location..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10" />
                                </div>
                                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                                    <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
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
                                    <CardTitle>Inventory Items ({totalItems})</CardTitle>
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
                                        {isLoading || isFetching ? <TableLoadingRows /> : items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <PackageOpen className="w-12 h-12 text-muted-foreground/50" />
                                                        <p className="text-muted-foreground">No items found</p>
                                                        <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear filters</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : items.map((item, index) => (
                                            <TableRow key={item.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted/20 dark:bg-background/20" : ""}`}>
                                                <TableCell>
                                                    {item.imageUrl ? (
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted">
                                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center">
                                                            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    {categories.find((c) => c.id === item.categoryId)?.name
                                                        ? <Badge variant="outline" className="text-xs">{categories.find((c) => c.id === item.categoryId)?.name}</Badge>
                                                        : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                                <TableCell className="font-mono">{item.quantity} {item.unit}</TableCell>
                                                <TableCell className="text-muted-foreground">₹{item.costPerUnit}</TableCell>
                                                <TableCell>{item.sellingPrice ? `₹${item.sellingPrice}` : <span className="text-muted-foreground">-</span>}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.location || "-"}</TableCell>
                                                <TableCell>{getStockBadge(item.quantity)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
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

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
                                    </p>
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
                    <SalesTab sales={sales} onNewSale={() => setIsSaleDialogOpen(true)} />
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
                                    <h3 className="text-lg font-semibold mb-2">No categories created yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6">Create categories like &apos;Uniforms&apos;, &apos;Stationery&apos;, or &apos;Electronics&apos;.</p>
                                    <Button onClick={() => setIsAddCategoryOpen(true)}><Plus className="h-4 w-4 mr-2" />Create First Category</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {categories.map((category) => (
                                        <Card key={category.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />{category.name}</CardTitle></CardHeader>
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete &quot;{itemToDelete?.name}&quot; from your inventory.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteItemMutation.mutate(itemToDelete?.id); }} disabled={deleteItemMutation.isPending} className="bg-red-600 hover:bg-red-700">
                            {deleteItemMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Item Details</DialogTitle></DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4">
                            {selectedItem.imageUrl && (
                                <div className="w-full h-48 rounded-lg overflow-hidden border bg-muted">
                                    <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    ["Name", selectedItem.name],
                                    ["Category", categories.find(c => c.id === selectedItem.categoryId)?.name || "-"],
                                    ["Quantity", `${selectedItem.quantity} ${selectedItem.unit}`],
                                    ["Status", null],
                                    ["Cost Per Unit", `₹${selectedItem.costPerUnit}`],
                                    ["Selling Price", selectedItem.sellingPrice ? `₹${selectedItem.sellingPrice}` : "-"],
                                    ["Location", selectedItem.location || "-"],
                                    ["Sellable", selectedItem.isSellable ? "Yes" : "No"],
                                    ["Vendor Name", selectedItem.vendorName || "-"],
                                    ["Vendor Contact", selectedItem.vendorContact || "-"],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        {label === "Status" ? <div className="mt-1">{getStockBadge(selectedItem.quantity)}</div> : <p className="font-medium">{value}</p>}
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                                    <p className="font-medium">{selectedItem.purchaseDate ? new Date(selectedItem.purchaseDate).toLocaleDateString() : "-"}</p>
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
                    <ItemFormFields />
                    <div className="flex gap-2 mt-4">
                        <Button onClick={() => updateItemMutation.mutate({ id: selectedItem?.id, data: itemForm })} className="flex-1" disabled={updateItemMutation.isPending}>
                            {updateItemMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Update Item"}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* New Sale Dialog */}
            <Dialog open={isSaleDialogOpen} onOpenChange={(o) => { setIsSaleDialogOpen(o); if (!o) setSaleForm(EMPTY_SALE_FORM); }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Record New Sale</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Buyer Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Buyer Name *</Label><Input value={saleForm.buyerName} onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })} placeholder="Enter buyer name" /></div>
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
                            <div className="space-y-2">
                                <Label>Add Item to Sale</Label>
                                <Select onValueChange={(itemId) => {
                                    const item = sellableItems.find(i => i.id === itemId);
                                    if (!item) return;
                                    if (saleForm.items.find(si => si.itemId === itemId)) { toast.error("Item already added"); return; }
                                    setSaleForm({ ...saleForm, items: [...saleForm.items, { itemId: item.id, name: item.name, quantity: 1, unitPrice: item.sellingPrice || item.costPerUnit, maxQuantity: item.quantity, unit: item.unit }] });
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select an item to add..." /></SelectTrigger>
                                    <SelectContent>
                                        {sellableItems.length === 0
                                            ? <div className="p-3 text-sm text-muted-foreground text-center">No sellable items available. Mark items as sellable first.</div>
                                            : sellableItems.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{item.name}</span>
                                                        <span className="text-muted-foreground text-xs">₹{item.sellingPrice || item.costPerUnit} · {item.quantity} {item.unit} available</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {saleForm.items.length > 0 ? (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Item</TableHead>
                                                <TableHead className="w-[140px]">Quantity</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {saleForm.items.map((saleItem, idx) => (
                                                <TableRow key={saleItem.itemId}>
                                                    <TableCell><div><span className="font-medium">{saleItem.name}</span><p className="text-xs text-muted-foreground">{saleItem.maxQuantity} {saleItem.unit} available</p></div></TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { if (saleItem.quantity <= 1) return; const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: u[idx].quantity - 1 }; setSaleForm({ ...saleForm, items: u }); }} disabled={saleItem.quantity <= 1}>-</Button>
                                                            <Input type="number" min="1" max={saleItem.maxQuantity} value={saleItem.quantity} onChange={(e) => { const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), saleItem.maxQuantity); const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: val }; setSaleForm({ ...saleForm, items: u }); }} className="h-7 w-14 text-center px-1" />
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { if (saleItem.quantity >= saleItem.maxQuantity) return; const u = [...saleForm.items]; u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 }; setSaleForm({ ...saleForm, items: u }); }} disabled={saleItem.quantity >= saleItem.maxQuantity}>+</Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">₹{saleItem.unitPrice.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium">₹{(saleItem.unitPrice * saleItem.quantity).toFixed(2)}</TableCell>
                                                    <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => setSaleForm({ ...saleForm, items: saleForm.items.filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="flex items-center justify-between p-3 bg-muted/30 border-t">
                                        <span className="font-semibold">Total Amount</span>
                                        <span className="text-lg font-bold">₹{saleForm.items.reduce((sum, si) => sum + (si.unitPrice * si.quantity), 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No items added yet. Select items from the dropdown above.</p>
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
                        <Button onClick={() => createSaleMutation.mutate(saleForm)} className="w-full" disabled={createSaleMutation.isPending || !saleForm.buyerName || saleForm.items.length === 0}>
                            {createSaleMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording Sale...</> : <><Receipt className="h-4 w-4 mr-2" />Record Sale — ₹{saleForm.items.reduce((sum, si) => sum + (si.unitPrice * si.quantity), 0).toFixed(2)}</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}