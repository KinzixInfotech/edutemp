'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    UserX,
    GraduationCap,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

export default function TeachingStaffPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selected, setSelected] = useState([]);
    const [dialogData, setDialogData] = useState(null);
    const [search, setSearch] = useState('');
    const [designationFilter, setDesignationFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch teaching staff
    const { data: staffData = {}, isLoading, isFetching } = useQuery({
        queryKey: ['teaching-staff', schoolId, page, search, designationFilter, statusFilter, sortBy],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/teaching-staff/${schoolId}`, {
                params: { page, limit: itemsPerPage, search, designation: designationFilter, status: statusFilter, sortBy }
            });
            const data = res.data;
            if (Array.isArray(data)) {
                return { staff: data, total: data.length };
            }
            return { staff: data.staff || data, total: data.total || data.length };
        },
        enabled: !!schoolId,
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });

    const staff = staffData.staff || [];
    const total = staffData.total || 0;
    const pageCount = Math.ceil(total / itemsPerPage);

    // Calculate stats
    const activeCount = staff.filter(s => s.user?.status === 'ACTIVE').length;
    const uniqueDesignations = [...new Set(staff.map(s => s.designation).filter(Boolean))].length;

    // Get unique designations for filter
    const designations = [...new Set(staff.map(s => s.designation).filter(Boolean))];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.delete(`/api/schools/teaching-staff/${schoolId}`, {
                data: { staffIds: ids }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['teaching-staff', schoolId]);
            toast.success('Staff members deleted successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete staff');
        }
    });

    // Inactivate mutation
    const inactivateMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.patch(`/api/schools/teaching-staff/${schoolId}/status`, {
                staffIds: ids,
                status: 'INACTIVE'
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['teaching-staff', schoolId]);
            toast.success('Staff members inactivated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to inactivate staff');
        }
    });

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${selected.length} staff member(s)?`)) {
            deleteMutation.mutate(selected);
        }
    };

    const handleInactivateSelected = () => {
        if (window.confirm(`Inactivate ${selected.length} staff member(s)?`)) {
            inactivateMutation.mutate(selected);
        }
    };

    const openDialog = (staffMember) => {
        setDialogData(staffMember);
    };

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
                        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>Teaching Staff</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage your teaching staff members
                    </p>
                </div>
                <Link href={`/dashboard/schools/${schoolId}/profiles/teacher/new`}>
                    <Button className="w-full sm:w-auto dark:text-white" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Teacher
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Staff</p>
                            <p className="text-2xl font-bold">{total}</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-500/20">
                            <Users className="h-6 w-6 text-blue-500" />
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
                                placeholder="Search by name or email..."
                                className="pl-9 text-sm bg-muted"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
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
                                {designations.map(d => (
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
                                onClick={() => queryClient.invalidateQueries(['teaching-staff', schoolId])}
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
                                    onClick={handleDeleteSelected}
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
            <Card>
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
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
                                <TableHead>Teacher</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Loading teachers...</p>
                                    </TableCell>
                                </TableRow>
                            ) : staff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">No teachers found</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {search || designationFilter !== 'ALL' || statusFilter !== 'ALL'
                                                ? 'Try adjusting your filters'
                                                : 'Add your first teacher to get started'}
                                        </p>
                                        <Link href={`/dashboard/schools/${schoolId}/profiles/teacher/new`}>
                                            <Button size="sm">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Teacher
                                            </Button>
                                        </Link>
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
                                                        {member.name?.[0]?.toUpperCase() || member.user?.name?.[0]?.toUpperCase() || "T"}
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
                                            {member.contactNumber || member.phone || '-'}
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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openDialog(member)}
                                            >
                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                    <div className="border-t p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, total)} of {total} teachers
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium px-2">
                                        Page {page} of {pageCount}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(p + 1, pageCount))}
                                    disabled={page === pageCount || isFetching}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Teacher Details Dialog */}
            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-start gap-4 pb-4 border-b">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback className="text-lg">
                                        {dialogData.name?.[0]?.toUpperCase() || dialogData.user?.name?.[0]?.toUpperCase() || "T"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-xl font-bold mb-1">
                                        {dialogData.name || dialogData.user?.name}
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {dialogData.email || dialogData.user?.email || 'No email'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {dialogData.designation || 'N/A'}
                                        </Badge>
                                        <Badge variant="outline">
                                            ID: {dialogData.employeeId || 'N/A'}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                dialogData.user?.status === "ACTIVE"
                                                    ? "bg-green-100 text-green-700 border-green-200"
                                                    : "bg-red-100 text-red-700 border-red-200"
                                            )}
                                        >
                                            {dialogData.user?.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            {/* Basic Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Gender</p>
                                        <p className="font-medium">{dialogData.gender || dialogData.user?.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Date of Birth</p>
                                        <p className="font-medium">{dialogData.dob || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Blood Group</p>
                                        <p className="font-medium">{dialogData.bloodGroup || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Age</p>
                                        <p className="font-medium">{dialogData.age || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-medium">{dialogData.contactNumber || dialogData.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{dialogData.email || dialogData.user?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Address
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Address</p>
                                        <p className="font-medium">{dialogData.address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">City</p>
                                        <p className="font-medium">{dialogData.City || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">State</p>
                                        <p className="font-medium">{dialogData.state || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <Link href={`/dashboard/schools/${schoolId}/profiles/teacher/${dialogData.userId}`} className="flex-1">
                                    <Button className="w-full" variant="outline">
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Full Profile
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogData(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
