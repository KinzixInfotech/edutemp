'use client';
export const dynamic = 'force-dynamic';


import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryItemsTable() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    const [selectedItem, setSelectedItem] = useState(null);
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [formError, setFormError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);

    // Fetch Inventory Items
    const { data: items = [], isLoading: loading } = useQuery({
        queryKey: ['inventory-items', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/inventory/inventory-items?schoolId=${fullUser.schoolId}`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 0, // notices are often dynamic, no caching
        refetchOnWindowFocus: false,
    });

    // Fetch Transactions for selected item
    const fetchTransactions = async (itemId) => {
        setTxLoading(true);
        try {
            const res = await axios.get(`/api/schools/inventory/transactions?itemId=${itemId}`);
            setTransactions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setTxLoading(false);
        }
    };

    const handleAdd = () => {
        setDrawerMode('add');
        setSelectedItem(null);
        setFormData({
            name: '',
            category: '',
            description: '',
            quantity: 0,
            minimumQuantity: 0,
            maximumQuantity: 0,
            unit: '',
            costPerUnit: 0,
            vendorName: '',
            vendorContact: '',
            warrantyPeriod: '',
            location: '',
            status: 'ACTIVE',
            barcode: '',
            notes: '',
        });
    };

    const handleEdit = (item) => {
        setDrawerMode('edit');
        setSelectedItem(item);
        setFormData({ ...item });
        fetchTransactions(item.id);
    };

    // Mutation for add/edit
    const saveItemMutation = useMutation({
        mutationFn: async (data) => {
            if (drawerMode === 'add') {
                return axios.post('/api/schools/inventory/inventory-items', { ...data, schoolId: fullUser.schoolId }).then(res => res.data);
            } else {
                return axios.put('/api/schools/inventory/inventory-items', { id: selectedItem.id, ...data }).then(res => res.data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory-items', fullUser?.schoolId]);
            setDrawerMode(null);
        },
        onError: (err) => {
            setFormError('An error occurred while saving the item.');
            console.error(err);
        }
    });

    const handleSubmit = () => {
        if (!formData.name || !formData.category || !formData.unit || !formData.vendorName || !formData.vendorContact || !formData.location || !formData.status) {
            setFormError('Please fill in all required fields.');
            return;
        }
        setFormError('');
        const data = {
            ...formData,
            quantity: parseInt(formData.quantity),
            minimumQuantity: parseInt(formData.minimumQuantity),
            maximumQuantity: parseInt(formData.maximumQuantity),
            costPerUnit: parseFloat(formData.costPerUnit),
        };
        saveItemMutation.mutate(data);
    };

    // Mutation for delete
    const deleteItemMutation = useMutation({
        mutationFn: async (id) => axios.delete('/api/schools/inventory/inventory-items', { data: { id } }),
        onSuccess: () => queryClient.invalidateQueries(['inventory-items', fullUser?.schoolId]),
    });

    const handleDelete = (id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        deleteItemMutation.mutate(id);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };


    return (
        <div className="p-6">
            {/* <h2 className="text-lg font-semibold mb-4">Inventory Items Overview</h2> */}
            <Button onClick={handleAdd} className="mb-4">Add Item</Button>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : items.length > 0 ? (
                            items.map((item, index) => (
                                <TableRow key={item.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-sm text-sm font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                item.status === 'UNDER_REPAIR' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {item.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className='flex flex-row gap-2 '>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                                                    View Transactions
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <DialogTitle>Transactions - {selectedItem?.name}</DialogTitle>
                                                </DialogHeader>
                                                {txLoading ? (
                                                    <p className="text-center py-4">Loading transactions...</p>
                                                ) : transactions.length > 0 ? (
                                                    <div className="overflow-x-auto rounded-lg border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-muted">
                                                                    <TableHead>Type</TableHead>
                                                                    <TableHead>Quantity</TableHead>
                                                                    <TableHead>Date</TableHead>
                                                                    <TableHead>Issued To</TableHead>
                                                                    <TableHead>Handled By</TableHead>
                                                                    <TableHead>Remarks</TableHead>
                                                                    <TableHead>Status</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {transactions.map((tx, idx) => (
                                                                    <TableRow key={tx.id} className={idx % 2 === 0 ? "bg-muted" : "bg-background"}>
                                                                        <TableCell>{tx.transactionType}</TableCell>
                                                                        <TableCell>{tx.quantity}</TableCell>
                                                                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                                                                        <TableCell>{tx.issuedToName || 'N/A'}</TableCell>
                                                                        <TableCell>{tx.handledByName}</TableCell>
                                                                        <TableCell>{tx.remarks || 'N/A'}</TableCell>
                                                                        <TableCell>
                                                                            <span
                                                                                className={`px-2 py-1 rounded-sm text-sm font-medium ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                                                    tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                                                        'bg-red-100 text-red-800'
                                                                                    }`}
                                                                            >
                                                                                {tx.status}
                                                                            </span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <p className="text-center py-4">No transactions found.</p>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No items found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === 'add' ? 'Add Item' : 'Edit Item'}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name" className='mb-2 text-muted-foreground' >Name*</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="category" className='mb-2 text-muted-foreground' >Category*</Label>
                                <Input
                                    id="category"
                                    name="category"
                                    value={formData.category || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="description" className='mb-2 text-muted-foreground' >Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="quantity" className='mb-2 text-muted-foreground' >Quantity*</Label>
                                <Input
                                    type="number"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity || 0}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="minimumQuantity" className='mb-2 text-muted-foreground' >Min Quantity*</Label>
                                <Input
                                    type="number"
                                    id="minimumQuantity"
                                    name="minimumQuantity"
                                    value={formData.minimumQuantity || 0}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="maximumQuantity" className='mb-2 text-muted-foreground' >Max Quantity*</Label>
                                <Input
                                    type="number"
                                    id="maximumQuantity"
                                    name="maximumQuantity"
                                    value={formData.maximumQuantity || 0}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="unit" className='mb-2 text-muted-foreground' >Unit*</Label>
                                <Input
                                    id="unit"
                                    name="unit"
                                    value={formData.unit || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                {/* <Label htmlFor="purchaseDate" className='mb-2 text-muted-foreground' >Purchase Date*</Label>
                                <Input
                                    type="date"
                                    id="purchaseDate"
                                    name="purchaseDate"
                                    value={formData.purchaseDate || ''}
                                    onChange={handleChange}
                                /> */}
                            </div>
                            <div>
                                <Label htmlFor="costPerUnit" className='mb-2 text-muted-foreground' >Cost Per Unit*</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    id="costPerUnit"
                                    name="costPerUnit"
                                    value={formData.costPerUnit || 0.0}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="vendorName" className='mb-2 text-muted-foreground' >Vendor Name*</Label>
                                <Input
                                    id="vendorName"
                                    name="vendorName"
                                    value={formData.vendorName || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="vendorContact" className='mb-2 text-muted-foreground' >Vendor Contact*</Label>
                                <Input
                                    id="vendorContact"
                                    name="vendorContact"
                                    value={formData.vendorContact || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="warrantyPeriod" className='mb-2 text-muted-foreground' >Warranty Period</Label>
                                <Input
                                    id="warrantyPeriod"
                                    name="warrantyPeriod"
                                    value={formData.warrantyPeriod || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="location" className='mb-2 text-muted-foreground' >Location*</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={formData.location || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="status" className='mb-2 text-muted-foreground' >Status*</Label>
                                <Select
                                    value={formData.status || 'ACTIVE'}
                                    onValueChange={(val) => handleSelectChange('status', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                                        <SelectItem value="DISPOSED">Disposed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="barcode" className='mb-2 text-muted-foreground' >Barcode</Label>
                                <Input
                                    id="barcode"
                                    name="barcode"
                                    value={formData.barcode || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="notes" className='mb-2 text-muted-foreground' >Notes</Label>
                                <Input
                                    id="notes"
                                    name="notes"
                                    value={formData.notes || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <Button onClick={handleSubmit} className="mt-6 w-full">
                            Save
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>

        </div>
    );
}