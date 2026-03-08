'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus,
    RefreshCw,
    Loader2,
    Trash2,
    Users,
    Search,
    Filter,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    UserX,
    Briefcase,
    Download,
    AlertTriangle,
    FileSpreadsheet,
    HardHat,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import * as XLSX from 'xlsx';

export default function NonTeachingStaffPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selected, setSelected] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [designationFilter, setDesignationFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Delete confirmation dialog state
    const [deleteDialog, setDeleteDialog] = useState({ open: false, ids: [] });
    const [confirmName, setConfirmName] = useState('');

    // Debounce search
    const debouncedSearch = useDebounce(searchQuery, 400);

    // Fetch non-teaching staff
    const { data: staffData = {}, isLoading, isFetching } = useQuery({
        queryKey: ['non-teaching-staff', schoolId, page, debouncedSearch, designationFilter, statusFilter, sortBy],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/non-teaching-staff/${schoolId}`, {
                params: {
                    page,
                    limit: itemsPerPage,
                    search: debouncedSearch || undefined,
                    designation: designationFilter !== 'ALL' ? designationFilter : undefined,
                    status: statusFilter !== 'ALL' ? statusFilter : undefined,
                    sortBy,
                },
            });
            return res.data;
        },
        enabled: !!schoolId,
        placeholderData: (prev) => prev,
        staleTime: 15 * 1000,
        refetchOnWindowFocus: true,
    });

    const staff = staffData.staff || [];
    const total = staffData.total || 0;
    const totalPages = staffData.totalPages || 1;

    // Fetch all designations for filter
    const { data: allDesignations = [] } = useQuery({
        queryKey: ['non-teaching-staff-designations', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/non-teaching-staff/${schoolId}`, {
                params: { limit: 500, page: 1 },
            });
            const allStaff = res.data?.staff || [];
            return [...new Set(allStaff.map(s => s.designation).filter(Boolean))];
        },
        enabled: !!schoolId,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: true,
    });

    // Stats from API response (use totals when available, fall back to current page)
    const activeCount = staffData.activeCount ?? staff.filter(s => s.user?.status === 'ACTIVE').length;
    const uniqueDesignations = staffData.uniqueDesignations ?? [...new Set(staff.map(s => s.designation).filter(Boolean))].length;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.delete(`/api/schools/non-teaching-staff/${schoolId}`, {
                data: { staffIds: ids },
            });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['non-teaching-staff', schoolId] });
            queryClient.invalidateQueries({ queryKey: ['non-teaching-staff-designations', schoolId] });
            toast.success(data.message || 'Staff members deleted successfully');
            setSelected([]);
            setDeleteDialog({ open: false, ids: [] });
            setConfirmName('');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete staff');
        },
    });

    // Inactivate mutation
    const inactivateMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.patch(`/api/schools/non-teaching-staff/${schoolId}/status`, {
                staffIds: ids,
                status: 'INACTIVE',
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['non-teaching-staff', schoolId] });
            toast.success('Staff members inactivated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to inactivate staff');
        },
    });

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const openDeleteDialog = (ids) => {
        setDeleteDialog({ open: true, ids });
        setConfirmName('');
    };

    const handleDeleteConfirm = () => {
        deleteMutation.mutate(deleteDialog.ids);
    };

    const handleInactivateSelected = () => {
        if (window.confirm(`Inactivate ${selected.length} staff member(s)?`)) {
            inactivateMutation.mutate(selected);
        }
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const adminName = fullUser?.name || fullUser?.user?.name || '';
    const isNameMatch = confirmName.trim().toLowerCase() === adminName.trim().toLowerCase();

    // XLSX Export
    const handleExportXLSX = useCallback(async () => {
        try {
            toast.loading('Generating report...', { id: 'xlsx-export' });

            const res = await axios.get(`/api/schools/non-teaching-staff/${schoolId}`, {
                params: {
                    page: 1,
                    limit: 500,
                    search: debouncedSearch || undefined,
                    designation: designationFilter !== 'ALL' ? designationFilter : undefined,
                    status: statusFilter !== 'ALL' ? statusFilter : undefined,
                    sortBy,
                },
            });

            const exportData = (res.data?.staff || []).map((member, index) => ({
                'S.No': index + 1,
                'Employee ID': member.employeeId || 'N/A',
                'Name': member.name || member.user?.name || '',
                'Email': member.email || member.user?.email || '',
                'Designation': member.designation || 'N/A',
                'Phone': member.contactNumber || '',
                'Gender': member.gender || '',
                'Date of Birth': member.dob || '',
                'Age': member.age || '',
                'Blood Group': member.bloodGroup || '',
                'Address': member.address || '',
                'City': member.City || '',
                'State': member.state || '',
                'Status': member.user?.status || 'UNKNOWN',
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Non-Teaching Staff');

            const colWidths = Object.keys(exportData[0] || {}).map(key => ({
                wch: Math.max(key.length, ...exportData.map(row => String(row[key] || '').length)) + 2,
            }));
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `Non_Teaching_Staff_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Report downloaded successfully', { id: 'xlsx-export' });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to generate report', { id: 'xlsx-export' });
        }
    }, [schoolId, debouncedSearch, designationFilter, statusFilter, sortBy]);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const SkeletonRow = () => (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
        </TableRow>
    );

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <HardHat className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>Non-Teaching Staff</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage your non-teaching staff members
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={isLoading || total === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export XLSX
                    </Button>
                    <Link href={`/dashboard/schools/${schoolId}/profiles/non-teaching/new`}>
                        <Button className="w-full sm:w-auto dark:text-white" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Staff
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Staff</p>
                            <p className="text-2xl font-bold">{total}</p>
                        </div>
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <Users className="h-6 w-6 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Active Staff</p>
                            <p className="text-2xl font-bold">{activeCount}</p>
                        </div>
                        <div className="p-3 rounded-full bg-green-500/20">
                            <Users className="h-6 w-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Active Designations</p>
                            <p className="text-2xl font-bold">{uniqueDesignations}</p>
                        </div>
                        <div className="p-3 rounded-full bg-amber-500/20">
                            <Briefcase className="h-6 w-6 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or ID..."
                                className="pl-9 text-sm bg-muted"
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <Select value={designationFilter} onValueChange={(val) => {
                            setDesignationFilter(val);
                            setPage(1);
                        }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Designation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Designations</SelectItem>
                                {allDesignations.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(val) => {
                            setStatusFilter(val);
                            setPage(1);
                        }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(val) => {
                                setSortBy(val);
                                setPage(1);
                            }}>
                                <SelectTrigger className="bg-muted text-sm flex-1">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted"
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['non-teaching-staff', schoolId] })}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selected.length > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium">
                                {selected.length} {selected.length === 1 ? 'staff member' : 'staff members'} selected
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openDeleteDialog(selected)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Delete
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleInactivateSelected}
                                    disabled={inactivateMutation.isPending}
                                >
                                    {inactivateMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <UserX className="mr-2 h-4 w-4" />
                                    )}
                                    Inactivate
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Staff Table */}
            <div className="border rounded-2xl bg-white dark:bg-muted/30">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={selected.length === staff.length && staff.length > 0}
                                        onChange={(e) => setSelected(e.target.checked ? staff.map(s => s.userId) : [])}
                                    />
                                </TableHead>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : staff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <HardHat className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">No staff found</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {searchQuery || designationFilter !== 'ALL' || statusFilter !== 'ALL'
                                                ? 'Try adjusting your search or filters'
                                                : 'Add your first non-teaching staff member to get started'}
                                        </p>
                                        {!searchQuery && designationFilter === 'ALL' && statusFilter === 'ALL' && (
                                            <Link href={`/dashboard/schools/${schoolId}/profiles/non-teaching/new`}>
                                                <Button size="sm">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Staff
                                                </Button>
                                            </Link>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staff.map(member => (
                                    <TableRow
                                        key={member.userId}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="cursor-pointer"
                                                checked={selected.includes(member.userId)}
                                                onChange={() => toggleSelect(member.userId)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={member.user?.profilePicture} />
                                                    <AvatarFallback className="text-xs">
                                                        {member.name?.[0]?.toUpperCase() || member.user?.name?.[0]?.toUpperCase() || "S"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {member.name || member.user?.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        ID: {member.employeeId || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {member.email || member.user?.email || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <Badge variant="outline" className="text-xs">
                                                {member.designation || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {member.contactNumber || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    member.user?.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400"
                                                )}
                                            >
                                                {member.user?.status || 'UNKNOWN'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/dashboard/schools/${schoolId}/staff/${member.userId}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                        View
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => openDeleteDialog([member.userId])}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {((page - 1) * itemsPerPage) + 1} – {Math.min(page * itemsPerPage, total)} of {total} staff
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {getPageNumbers().map(num => (
                                    <Button
                                        key={num}
                                        variant={page === num ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(num)}
                                        disabled={isFetching}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages || isFetching}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages || isFetching}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => {
                if (!open) {
                    setDeleteDialog({ open: false, ids: [] });
                    setConfirmName('');
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Staff Member{deleteDialog.ids.length > 1 ? 's' : ''}
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-3">
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                                <strong>⚠ This action is irreversible.</strong> All associated data will be permanently removed,
                                including payroll profiles and related records.
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You are about to delete <strong>{deleteDialog.ids.length}</strong> staff member{deleteDialog.ids.length > 1 ? 's' : ''}.
                                To confirm, type your name below:
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            Type <span className="font-semibold text-foreground">&quot;{adminName}&quot;</span> to confirm
                        </div>
                        <Input
                            placeholder="Type your name..."
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className={cn(
                                isNameMatch && confirmName ? "border-green-500 focus-visible:ring-green-500" : ""
                            )}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialog({ open: false, ids: [] });
                                setConfirmName('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={!isNameMatch || deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
