"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Loader2,
    Package,
    TrendingUp,
    AlertTriangle,
    ShoppingCart,
    Plus,
    Search,
    DollarSign,
    PackageOpen,
    FolderOpen,
    Receipt,
    ImageIcon,
    MoreHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    RotateCcw,
    Eye,
    Pencil,
    Trash2,
    Tag,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import FileUploadButton from "@/components/fileupload";

export default function InventoryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [stats, setStats] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isCreatingSale, setIsCreatingSale] = useState(false);

    // Delete state
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // View/Edit state
    const [selectedItem, setSelectedItem] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Table state
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [itemForm, setItemForm] = useState({
        name: "",
        categoryId: "",
        quantity: 0,
        unit: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        costPerUnit: 0,
        sellingPrice: 0,
        isSellable: false,
        vendorName: "",
        vendorContact: "",
        location: "",
        status: "IN_STOCK",
        imageUrl: "",
    });

    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
    });

    const [saleForm, setSaleForm] = useState({
        buyerName: "",
        buyerType: "STUDENT",
        items: [],
        paymentMethod: "CASH",
    });

    useEffect(() => {
        if (schoolId) {
            fetchData();
        }
    }, [schoolId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, itemsRes, categoriesRes, salesRes] = await Promise.all([
                axios.get(`/api/schools/${schoolId}/inventory/stats`),
                axios.get(`/api/schools/${schoolId}/inventory/items`),
                axios.get(`/api/schools/${schoolId}/inventory/categories`),
                axios.get(`/api/schools/${schoolId}/inventory/sales`),
            ]);

            setStats(statsRes.data);
            setItems(itemsRes.data);
            setCategories(categoriesRes.data);
            setSales(salesRes.data);
        } catch (error) {
            console.error("Failed to fetch inventory data", error);
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        setIsAddingItem(true);
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/items`, itemForm);
            toast.success("Item added successfully");
            setIsAddItemOpen(false);
            fetchData();
            resetItemForm();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add item");
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleAddCategory = async () => {
        setIsAddingCategory(true);
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/categories`, categoryForm);
            toast.success("Category added successfully");
            setIsAddCategoryOpen(false);
            fetchData();
            setCategoryForm({ name: "", description: "" });
        } catch (error) {
            toast.error("Failed to add category");
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/schools/${schoolId}/inventory/items/${itemToDelete.id}`);
            toast.success("Item deleted successfully");
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete item");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateItem = async () => {
        if (!selectedItem) return;
        setIsUpdating(true);
        try {
            await axios.put(`/api/schools/${schoolId}/inventory/items/${selectedItem.id}`, itemForm);
            toast.success("Item updated successfully");
            setIsEditDialogOpen(false);
            setSelectedItem(null);
            fetchData();
            resetItemForm();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update item");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCreateSale = async () => {
        setIsCreatingSale(true);
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/sales`, saleForm);
            toast.success("Sale recorded successfully");
            setIsSaleDialogOpen(false);
            fetchData();
            setSaleForm({ buyerName: "", buyerType: "STUDENT", items: [], paymentMethod: "CASH" });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to record sale");
        } finally {
            setIsCreatingSale(false);
        }
    };

    const resetItemForm = () => {
        setItemForm({
            name: "",
            categoryId: "",
            quantity: 0,
            unit: "",
            purchaseDate: new Date().toISOString().split("T")[0],
            costPerUnit: 0,
            sellingPrice: 0,
            isSellable: false,
            vendorName: "",
            vendorContact: "",
            location: "",
            status: "IN_STOCK",
            imageUrl: "",
        });
    };

    const clearAllFilters = () => {
        setSearchTerm("");
        setSelectedCategory("all");
        setSelectedStatus("all");
        setCurrentPage(1);
    };

    // Filter and sort items
    const processedItems = useMemo(() => {
        let filtered = items.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.location?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
            const matchesStatus = selectedStatus === "all" ||
                (selectedStatus === "low" && item.quantity <= 5) ||
                (selectedStatus === "in_stock" && item.quantity > 5);
            return matchesSearch && matchesCategory && matchesStatus;
        });

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortColumn) {
                case "name":
                    aVal = a.name || "";
                    bVal = b.name || "";
                    break;
                case "category":
                    aVal = categories.find(c => c.id === a.categoryId)?.name || "";
                    bVal = categories.find(c => c.id === b.categoryId)?.name || "";
                    break;
                case "quantity":
                    aVal = a.quantity || 0;
                    bVal = b.quantity || 0;
                    break;
                case "cost":
                    aVal = a.costPerUnit || 0;
                    bVal = b.costPerUnit || 0;
                    break;
                case "price":
                    aVal = a.sellingPrice || 0;
                    bVal = b.sellingPrice || 0;
                    break;
                case "location":
                    aVal = a.location || "";
                    bVal = b.location || "";
                    break;
                default:
                    aVal = a.name || "";
                    bVal = b.name || "";
            }

            if (typeof aVal === "string") {
                return sortDirection === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [items, searchTerm, selectedCategory, selectedStatus, sortColumn, sortDirection, categories]);

    // Pagination
    const totalPages = Math.ceil(processedItems.length / pageSize);
    const paginatedItems = processedItems.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    const getStockBadge = (quantity) => {
        if (quantity === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        }
        if (quantity <= 5) {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Low Stock</Badge>;
        }
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
    };

    // Table loading skeleton
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

    // Empty State Component
    const EmptyState = ({ icon: Icon, title, description, action }) => (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Icon className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {action}
        </div>
    );

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        Inventory Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage inventory items, track sales, and monitor stock levels
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Tag className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Category</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Category Name</Label>
                                    <Input
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        placeholder="e.g., Uniforms, Stationery"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        value={categoryForm.description}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        placeholder="Optional description"
                                    />
                                </div>
                                <Button onClick={handleAddCategory} className="w-full" disabled={isAddingCategory}>
                                    {isAddingCategory ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Category"
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Inventory Item</DialogTitle>
                            </DialogHeader>

                            {/* Image Upload Section */}
                            <div className="space-y-2 mb-4">
                                <Label>Product Image</Label>
                                <FileUploadButton
                                    field="Product"
                                    value={itemForm.imageUrl}
                                    onChange={(url) => setItemForm({ ...itemForm, imageUrl: url })}
                                    saveToLibrary={true}
                                    compact={true}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Item Name *</Label>
                                    <Input
                                        value={itemForm.name}
                                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={itemForm.categoryId}
                                        onValueChange={(value) => setItemForm({ ...itemForm, categoryId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground">
                                                    No categories yet. Add one first.
                                                </div>
                                            ) : (
                                                categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity *</Label>
                                    <Input
                                        type="number"
                                        value={itemForm.quantity}
                                        onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit *</Label>
                                    <Input
                                        value={itemForm.unit}
                                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                                        placeholder="e.g., pcs, kg, liters"
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
                                    <Label>Cost Per Unit *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={itemForm.costPerUnit}
                                        onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Selling Price</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={itemForm.sellingPrice}
                                        onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="isSellable"
                                        checked={itemForm.isSellable}
                                        onChange={(e) => setItemForm({ ...itemForm, isSellable: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isSellable">Is Sellable</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label>Vendor Name *</Label>
                                    <Input
                                        value={itemForm.vendorName}
                                        onChange={(e) => setItemForm({ ...itemForm, vendorName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vendor Contact *</Label>
                                    <Input
                                        value={itemForm.vendorContact}
                                        onChange={(e) => setItemForm({ ...itemForm, vendorContact: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location *</Label>
                                    <Input
                                        value={itemForm.location}
                                        onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                                        placeholder="Storage location"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={itemForm.status}
                                        onValueChange={(value) => setItemForm({ ...itemForm, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                                            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={handleAddItem} className="w-full mt-4" disabled={isAddingItem}>
                                {isAddingItem ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Adding Item...
                                    </>
                                ) : (
                                    "Add Item"
                                )}
                            </Button>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {categories.length} categories
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockItems || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Needs restock
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats?.totalRevenue?.toFixed(2) || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            From {sales.length} sales
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">₹{stats?.totalProfit?.toFixed(2) || 0}</div>
                    </CardContent>
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
                    {/* Filters */}
                    <Card className="border">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="relative lg:col-span-2">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, vendor, or location..."
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="in_stock">In Stock</SelectItem>
                                        <SelectItem value="low">Low Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={clearAllFilters}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Table */}
                    <Card className="border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Inventory Items ({processedItems.length})</CardTitle>
                                    <CardDescription>All items in your inventory</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                                    <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
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
                                            <SortableHeader column="category">Category</SortableHeader>
                                            <SortableHeader column="quantity">Qty</SortableHeader>
                                            <SortableHeader column="cost">Cost</SortableHeader>
                                            <SortableHeader column="price">Price</SortableHeader>
                                            <SortableHeader column="location">Location</SortableHeader>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right w-[60px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableLoadingRows />
                                        ) : paginatedItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <PackageOpen className="w-12 h-12 text-muted-foreground/50" />
                                                        <p className="text-muted-foreground">No items found</p>
                                                        <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                                            Clear filters
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedItems.map((item, index) => (
                                                <TableRow key={item.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted/20 dark:bg-background/20" : ""}`}>
                                                    <TableCell>
                                                        {item.imageUrl ? (
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted">
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center">
                                                                <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>
                                                        {categories.find((c) => c.id === item.categoryId)?.name ? (
                                                            <Badge variant="outline" className="text-xs">
                                                                {categories.find((c) => c.id === item.categoryId)?.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono">{item.quantity} {item.unit}</TableCell>
                                                    <TableCell className="text-muted-foreground">₹{item.costPerUnit}</TableCell>
                                                    <TableCell>₹{item.sellingPrice || "-"}</TableCell>
                                                    <TableCell className="text-muted-foreground">{item.location || "-"}</TableCell>
                                                    <TableCell>{getStockBadge(item.quantity)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedItem(item);
                                                                    setIsViewDialogOpen(true);
                                                                }}>
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
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
                                                                        status: item.status || "IN_STOCK",
                                                                        imageUrl: item.imageUrl || "",
                                                                    });
                                                                    setIsEditDialogOpen(true);
                                                                }}>
                                                                    <Pencil className="w-4 h-4 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => {
                                                                        setItemToDelete(item);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedItems.length)} of {processedItems.length} items
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Sales History</CardTitle>
                                <CardDescription>Record of all inventory sales</CardDescription>
                            </div>
                            <Button onClick={() => setIsSaleDialogOpen(true)}>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                New Sale
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {sales.length === 0 ? (
                                <EmptyState
                                    icon={Receipt}
                                    title="No sales recorded yet"
                                    description="Once you start selling inventory items, your sales history will appear here."
                                    action={
                                        <Button onClick={() => setIsSaleDialogOpen(true)}>
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Record First Sale
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="dark:bg-background/50 bg-muted/50">
                                                <TableHead>Date</TableHead>
                                                <TableHead>Buyer</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Payment</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sales.map((sale, index) => (
                                                <TableRow key={sale.id} className={index % 2 === 0 ? "bg-muted/20 dark:bg-background/20" : ""}>
                                                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">{sale.buyerName}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{sale.buyerType}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono">₹{sale.totalAmount.toFixed(2)}</TableCell>
                                                    <TableCell>{sale.paymentMethod}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            {sale.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Inventory Categories</CardTitle>
                                    <CardDescription>Organize your inventory with categories</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => setIsAddCategoryOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Category
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {categories.length === 0 ? (
                                <EmptyState
                                    icon={FolderOpen}
                                    title="No categories created yet"
                                    description="Categories help you organize your inventory. Create categories like 'Uniforms', 'Stationery', or 'Electronics'."
                                    action={
                                        <Button onClick={() => setIsAddCategoryOpen(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create First Category
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {categories.map((category) => (
                                        <Card key={category.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Tag className="h-4 w-4 text-primary" />
                                                    {category.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
                                                <p className="text-sm font-medium mt-2">
                                                    {category._count?.items || items.filter(i => i.categoryId === category.id).length} items
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item
                            &quot;{itemToDelete?.name}&quot; from your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteItem();
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Item Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4">
                            {selectedItem.imageUrl && (
                                <div className="w-full h-48 rounded-lg overflow-hidden border bg-muted">
                                    <img
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">{selectedItem.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Category</p>
                                    <p className="font-medium">
                                        {categories.find(c => c.id === selectedItem.categoryId)?.name || "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Quantity</p>
                                    <p className="font-medium">{selectedItem.quantity} {selectedItem.unit}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <div className="mt-1">{getStockBadge(selectedItem.quantity)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Cost Per Unit</p>
                                    <p className="font-medium">₹{selectedItem.costPerUnit}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Selling Price</p>
                                    <p className="font-medium">₹{selectedItem.sellingPrice || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Location</p>
                                    <p className="font-medium">{selectedItem.location || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Sellable</p>
                                    <p className="font-medium">{selectedItem.isSellable ? "Yes" : "No"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Vendor Name</p>
                                    <p className="font-medium">{selectedItem.vendorName || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Vendor Contact</p>
                                    <p className="font-medium">{selectedItem.vendorContact || "-"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                                    <p className="font-medium">
                                        {selectedItem.purchaseDate
                                            ? new Date(selectedItem.purchaseDate).toLocaleDateString()
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={() => {
                                        setIsViewDialogOpen(false);
                                        setItemForm({
                                            name: selectedItem.name || "",
                                            categoryId: selectedItem.categoryId || "",
                                            quantity: selectedItem.quantity || 0,
                                            unit: selectedItem.unit || "",
                                            purchaseDate: selectedItem.purchaseDate ? new Date(selectedItem.purchaseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                                            costPerUnit: selectedItem.costPerUnit || 0,
                                            sellingPrice: selectedItem.sellingPrice || 0,
                                            isSellable: selectedItem.isSellable || false,
                                            vendorName: selectedItem.vendorName || "",
                                            vendorContact: selectedItem.vendorContact || "",
                                            location: selectedItem.location || "",
                                            status: selectedItem.status || "IN_STOCK",
                                            imageUrl: selectedItem.imageUrl || "",
                                        });
                                        setIsEditDialogOpen(true);
                                    }}
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Item
                                </Button>
                                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Item Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                    setSelectedItem(null);
                    resetItemForm();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Inventory Item</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2 mb-4">
                        <Label>Product Image</Label>
                        <FileUploadButton
                            field="Product"
                            value={itemForm.imageUrl}
                            onChange={(url) => setItemForm({ ...itemForm, imageUrl: url })}
                            saveToLibrary={true}
                            compact={true}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Item Name *</Label>
                            <Input
                                value={itemForm.name}
                                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={itemForm.categoryId}
                                onValueChange={(value) => setItemForm({ ...itemForm, categoryId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity *</Label>
                            <Input
                                type="number"
                                value={itemForm.quantity}
                                onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit *</Label>
                            <Input
                                value={itemForm.unit}
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
                            <Label>Cost Per Unit *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={itemForm.costPerUnit}
                                onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Selling Price</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={itemForm.sellingPrice}
                                onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                            <input
                                type="checkbox"
                                id="isSellableEdit"
                                checked={itemForm.isSellable}
                                onChange={(e) => setItemForm({ ...itemForm, isSellable: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="isSellableEdit">Is Sellable</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Vendor Name *</Label>
                            <Input
                                value={itemForm.vendorName}
                                onChange={(e) => setItemForm({ ...itemForm, vendorName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vendor Contact *</Label>
                            <Input
                                value={itemForm.vendorContact}
                                onChange={(e) => setItemForm({ ...itemForm, vendorContact: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Location *</Label>
                            <Input
                                value={itemForm.location}
                                onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={itemForm.status}
                                onValueChange={(value) => setItemForm({ ...itemForm, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                    <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleUpdateItem} className="flex-1" disabled={isUpdating}>
                            {isUpdating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Item"
                            )}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}