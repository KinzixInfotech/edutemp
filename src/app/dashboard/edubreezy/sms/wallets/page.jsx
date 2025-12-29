'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Loader2,
    Wallet,
    Plus,
    Minus,
    Search,
    RefreshCw,
    AlertTriangle,
    Ban,
    CheckCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const COST_PER_CREDIT = 0.20;

export default function SchoolWalletsPage() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        type: 'add', // 'add' or 'deduct'
        amount: '',
        reason: '',
    });

    // Fetch all school wallets
    const { data: wallets, isLoading, refetch } = useQuery({
        queryKey: ['sms-admin-wallets', searchQuery],
        queryFn: async () => {
            const res = await fetch(`/api/sms/admin/wallets?search=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) throw new Error('Failed to fetch wallets');
            return res.json();
        },
    });

    // Adjust credits mutation
    const adjustMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/sms/admin/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, role: 'SUPER_ADMIN' }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Adjustment failed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-admin-wallets']);
            setIsAdjustOpen(false);
            setSelectedSchool(null);
            setAdjustForm({ type: 'add', amount: '', reason: '' });
            toast.success('Credits adjusted successfully');
        },
        onError: (error) => toast.error(error.message),
    });

    // Freeze/Unfreeze mutation
    const freezeMutation = useMutation({
        mutationFn: async ({ schoolId, freeze }) => {
            const res = await fetch('/api/sms/admin/wallets/freeze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId, freeze, role: 'SUPER_ADMIN' }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Action failed');
            }
            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['sms-admin-wallets']);
            toast.success(variables.freeze ? 'Wallet frozen' : 'Wallet unfrozen');
        },
        onError: (error) => toast.error(error.message),
    });

    const handleAdjust = (school) => {
        setSelectedSchool(school);
        setIsAdjustOpen(true);
    };

    const handleSubmitAdjust = () => {
        const amount = parseFloat(adjustForm.amount);
        if (!amount || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!adjustForm.reason) {
            toast.error('Please enter a reason');
            return;
        }

        adjustMutation.mutate({
            schoolId: selectedSchool.schoolId,
            amount: adjustForm.type === 'add' ? amount : -amount,
            reason: adjustForm.reason,
        });
    };

    const filteredWallets = wallets?.filter((w) =>
        w.schoolName?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">School Wallets</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage SMS credit wallets for all schools
                    </p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Separator />

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search schools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{wallets?.length || 0}</div>
                        <p className="text-sm text-muted-foreground">Total Schools</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {wallets?.reduce((sum, w) => sum + (w.balance || 0), 0).toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Credits</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">
                            {wallets?.filter(w => w.balance < 50).length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Low Balance ({"<"}50)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                            {wallets?.filter(w => w.isFrozen).length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Frozen Wallets</p>
                    </CardContent>
                </Card>
            </div>

            {/* Wallets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All School Wallets</CardTitle>
                    <CardDescription>Click on a school to adjust credits</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredWallets.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No wallets found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>School</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="text-right">Total Purchased</TableHead>
                                        <TableHead className="text-right">Used</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWallets.map((wallet) => (
                                        <TableRow key={wallet.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{wallet.schoolName}</p>
                                                    <p className="text-xs text-muted-foreground">{wallet.schoolCode}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${wallet.balance < 50 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {wallet.balance?.toLocaleString()}
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    ≈ ₹{(wallet.balance * COST_PER_CREDIT).toFixed(0)}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">{wallet.totalCredits?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{wallet.usedCredits?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                {wallet.isFrozen ? (
                                                    <Badge variant="destructive">
                                                        <Ban className="h-3 w-3 mr-1" />
                                                        Frozen
                                                    </Badge>
                                                ) : wallet.balance < 50 ? (
                                                    <Badge variant="secondary" className="text-orange-600">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        Low
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-green-600">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Active
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAdjust(wallet)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Adjust
                                                    </Button>
                                                    <Button
                                                        variant={wallet.isFrozen ? 'default' : 'destructive'}
                                                        size="sm"
                                                        onClick={() => freezeMutation.mutate({
                                                            schoolId: wallet.schoolId,
                                                            freeze: !wallet.isFrozen
                                                        })}
                                                        disabled={freezeMutation.isPending}
                                                    >
                                                        {wallet.isFrozen ? 'Unfreeze' : 'Freeze'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Adjust Credits Dialog */}
            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Credits</DialogTitle>
                        <DialogDescription>
                            {selectedSchool?.schoolName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-2xl font-bold">{selectedSchool?.balance?.toLocaleString()} credits</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Action</Label>
                            <Select value={adjustForm.type} onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="add">
                                        <span className="flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-green-600" />
                                            Add Credits
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="deduct">
                                        <span className="flex items-center gap-2">
                                            <Minus className="h-4 w-4 text-red-600" />
                                            Deduct Credits
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Amount (Credits) *</Label>
                            <Input
                                type="number"
                                value={adjustForm.amount}
                                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                                placeholder="100"
                            />
                            {adjustForm.amount && (
                                <p className="text-xs text-muted-foreground">
                                    ≈ ₹{(parseFloat(adjustForm.amount) * COST_PER_CREDIT).toFixed(0)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Reason *</Label>
                            <Input
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                placeholder="e.g., Trial credits, Payment received, Refund"
                            />
                        </div>

                        {adjustForm.type === 'add' && adjustForm.amount && (
                            <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700 dark:text-green-300">
                                    New balance will be: {(selectedSchool?.balance || 0) + parseFloat(adjustForm.amount || 0)} credits
                                </AlertDescription>
                            </Alert>
                        )}

                        {adjustForm.type === 'deduct' && adjustForm.amount && (
                            <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-700 dark:text-amber-300">
                                    New balance will be: {(selectedSchool?.balance || 0) - parseFloat(adjustForm.amount || 0)} credits
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmitAdjust}
                            disabled={adjustMutation.isPending}
                            className={adjustForm.type === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {adjustMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {adjustForm.type === 'add' ? 'Add Credits' : 'Deduct Credits'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
