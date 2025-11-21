// app/partnerprogram/admin/partners/page.jsx
'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
    Loader2, CheckCircle, XCircle, Edit,
    Users, TrendingUp, DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AdminPartners() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [formData, setFormData] = useState({
        status: '',
        level: '',
        commissionRate: '',
        renewalRate: '',
        accountManagerId: '',
        rejectedReason: ''
    });

    // Fetch partners
    const { data: partnersData, isLoading: loading } = useQuery({
        queryKey: ['admin-partners', filterStatus],
        queryFn: async () => {
            let url = `/api/admin/partners`;
            if (filterStatus !== 'ALL') url += `?status=${filterStatus}`;

            const res = await axios.get(url);
            return res.data;
        },
    });

    const partners = partnersData?.partners || [];

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleEdit = (partner) => {
        setSelectedPartner(partner);
        setFormData({
            status: partner.status,
            level: partner.level,
            commissionRate: partner.commissionRate.toString(),
            renewalRate: partner.renewalRate.toString(),
            accountManagerId: partner.accountManagerId || '',
            rejectedReason: ''
        });
        setDialogOpen(true);
    };

    const updatePartnerMutation = useMutation({
        mutationFn: async () => {
            return axios.patch('/api/admin/partners', {
                partnerId: selectedPartner.id,
                ...formData
            }).then(res => res.data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-partners']);

            toast.success("Success!", {
                description: data.message || "Partner updated successfully",
            });

            setDialogOpen(false);
            setSelectedPartner(null);
        },
        onError: (err) => {
            toast.error("Failed", {
                description: err.message || "Failed to update partner",
            });
        },
    });

    const handleSubmit = () => updatePartnerMutation.mutate();

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500 text-white';
            case 'PENDING': return 'bg-yellow-500 text-white';
            case 'SUSPENDED': return 'bg-red-500 text-white';
            case 'REJECTED': return 'bg-gray-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const getLevelColor = (level) => {
        switch (level) {
            case 'PLATINUM': return 'bg-purple-500 text-white';
            case 'GOLD': return 'bg-yellow-500 text-white';
            case 'SILVER': return 'bg-gray-400 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and approve channel partners
                    </p>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-4 md:grid-cols-4"
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{partners.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {partners.filter(p => p.status === 'ACTIVE').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {partners.filter(p => p.status === 'PENDING').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{partners.reduce((acc, p) => acc + p.totalRevenue, 0).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Filter */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Partners</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            {/* Partners Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>All Partners</CardTitle>
                        <CardDescription>
                            Manage partner accounts and settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Partner Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Level</TableHead>
                                        <TableHead>Leads</TableHead>
                                        <TableHead>Revenue</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, index) => (
                                            <TableRow key={index}>
                                                {Array(11).fill(0).map((_, i) => (
                                                    <TableCell key={i}><Skeleton className="h-6 w-20" /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : partners.length > 0 ? (
                                        partners.map((partner, index) => (
                                            <motion.tr
                                                key={partner.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{partner.user?.name}</div>
                                                        <div className="text-xs text-muted-foreground">{partner.companyName}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{partner.contactEmail}</TableCell>
                                                <TableCell>{partner.contactPhone}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{partner.role}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getLevelColor(partner.level)}>
                                                        {partner.level}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div className="font-medium">{partner.totalLeads}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {partner.convertedLeads} converted
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    ₹{(partner.totalRevenue || 0).toLocaleString('en-IN')}
                                                </TableCell>
                                                <TableCell className="font-medium text-green-600">
                                                    ₹{(partner.totalCommission || 0).toLocaleString('en-IN')}
                                                    <div className="text-xs text-muted-foreground">
                                                        {partner.commissionRate}%
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(partner.status)}>
                                                        {partner.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEdit(partner)}
                                                            className="gap-2"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Manage
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12">
                                                <p className="text-muted-foreground">No partners found</p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Edit Partner Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Partner</DialogTitle>
                        <DialogDescription>
                            Update partner status, level, and commission rates
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="level">Partner Level *</Label>
                                <Select value={formData.level} onValueChange={(val) => handleChange('level', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SILVER">Silver</SelectItem>
                                        <SelectItem value="GOLD">Gold</SelectItem>
                                        <SelectItem value="PLATINUM">Platinum</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
                                <Input
                                    id="commissionRate"
                                    type="number"
                                    placeholder="10"
                                    value={formData.commissionRate}
                                    onChange={(e) => handleChange('commissionRate', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="renewalRate">Renewal Rate (%) *</Label>
                                <Input
                                    id="renewalRate"
                                    type="number"
                                    placeholder="5"
                                    value={formData.renewalRate}
                                    onChange={(e) => handleChange('renewalRate', e.target.value)}
                                />
                            </div>
                        </div>

                        {formData.status === 'REJECTED' && (
                            <div className="grid gap-2">
                                <Label htmlFor="rejectedReason">Rejection Reason</Label>
                                <Textarea
                                    id="rejectedReason"
                                    placeholder="Explain why the partner is being rejected..."
                                    value={formData.rejectedReason}
                                    onChange={(e) => handleChange('rejectedReason', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={updatePartnerMutation.isPending}
                            className="gap-2"
                        >
                            {updatePartnerMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>Update Partner</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}