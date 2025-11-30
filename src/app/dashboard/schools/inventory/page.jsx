"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function InventoryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [stats, setStats] = useState(null);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);

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
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/items`, itemForm);
            toast.success("Item added successfully");
            setIsAddItemOpen(false);
            fetchData();
            resetItemForm();
        } catch (error) {
            toast.error("Failed to add item");
        }
    };

    const handleAddCategory = async () => {
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/categories`, categoryForm);
            toast.success("Category added successfully");
            setIsAddCategoryOpen(false);
            fetchData();
            setCategoryForm({ name: "", description: "" });
        } catch (error) {
            toast.error("Failed to add category");
        }
    };

    const handleCreateSale = async () => {
        try {
            await axios.post(`/api/schools/${schoolId}/inventory/sales`, saleForm);
            toast.success("Sale recorded successfully");
            setIsSaleDialogOpen(false);
            fetchData();
            setSaleForm({ buyerName: "", buyerType: "STUDENT", items: [], paymentMethod: "CASH" });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to record sale");
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
        });
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage inventory items, track sales, and monitor stock levels
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
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
                                <Button onClick={handleAddCategory} className="w-full">
                                    Add Category
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
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Inventory Item</DialogTitle>
                            </DialogHeader>
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
                                                    No categories yet. Add one using "Add Category" button.
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
                                    {categories.length === 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Tip: Create categories first for better organization
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity *</Label>
                                    <Input
                                        type="number"
                                        value={itemForm.quantity}
                                        onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) })}
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
                                        onChange={(e) => setItemForm({ ...itemForm, costPerUnit: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Selling Price</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={itemForm.sellingPrice}
                                        onChange={(e) => setItemForm({ ...itemForm, sellingPrice: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={itemForm.isSellable}
                                        onChange={(e) => setItemForm({ ...itemForm, isSellable: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    <Label>Is Sellable</Label>
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
                            <Button onClick={handleAddItem} className="w-full mt-4">
                                Add Item
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
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockItems || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats?.totalRevenue?.toFixed(2) || 0}</div>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-[200px]">
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
                            </div>

                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Cost</TableHead>
                                            <TableHead>Selling Price</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    {categories.find((c) => c.id === item.categoryId)?.name || item.category}
                                                </TableCell>
                                                <TableCell>{item.quantity} {item.unit}</TableCell>
                                                <TableCell>₹{item.costPerUnit}</TableCell>
                                                <TableCell>₹{item.sellingPrice || "-"}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${item.quantity <= 5
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-green-100 text-green-800"
                                                            }`}
                                                    >
                                                        {item.quantity <= 5 ? "Low Stock" : "In Stock"}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Sales History</CardTitle>
                            <Button onClick={() => setIsSaleDialogOpen(true)}>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                New Sale
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                                            <TableCell>{sale.buyerName}</TableCell>
                                            <TableCell>{sale.buyerType}</TableCell>
                                            <TableCell>₹{sale.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell>{sale.paymentMethod}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    {sale.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {categories.map((category) => (
                                    <Card key={category.id}>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{category.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">{category.description}</p>
                                            <p className="text-sm font-medium mt-2">
                                                {category._count?.items || 0} items
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}