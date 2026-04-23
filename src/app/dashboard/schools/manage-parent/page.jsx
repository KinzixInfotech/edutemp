'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Plus,
    RefreshCw,
    Loader2,
    Trash2,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    UserX,
    Phone,
    Check,
    UserCheck,
    ExternalLink,
    LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

// Relation badge colors
const RELATION_COLORS = {
    FATHER: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    MOTHER: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800',
    GUARDIAN: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

export default function ParentListPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState([]);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch parents with pagination
    const { data: parentData = {}, isLoading: parentsLoading, isFetching } = useQuery({
        queryKey: ['parents', schoolId, page, debouncedSearch],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/parents`, {
                params: { page, limit: itemsPerPage, search: debouncedSearch }
            });
            return res.data || {};
        },
        enabled: !!schoolId,
        placeholderData: (prev) => prev,
        staleTime: 15 * 1000,
        refetchOnWindowFocus: true,
    });

    const parents = parentData.parents || [];
    const total = parentData.total || 0;
    const activeCount = parentData.activeCount ?? parents.filter(p => p.user?.status === 'ACTIVE').length;
    const pageCount = Math.ceil(total / itemsPerPage);
    const linkedCount = parents.filter(p => p.studentLinks?.length > 0).length;

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.delete(`/api/schools/${schoolId}/parents`, {
                data: { parentIds: ids }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
            toast.success('Parents deleted successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete parents');
        }
    });

    // Inactivate mutation
    const inactivateMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.patch(`/api/schools/${schoolId}/parents/status`, {
                parentIds: ids,
                status: 'INACTIVE'
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
            toast.success('Parents inactivated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to inactivate parents');
        }
    });

    // Activate mutation
    const activateMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.patch(`/api/schools/${schoolId}/parents/status`, {
                parentIds: ids,
                status: 'ACTIVE'
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
            toast.success('Parents activated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to activate parents');
        }
    });

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${selected.length} parent(s)? This will also remove their student links.`)) {
            deleteMutation.mutate(selected);
        }
    };

    const handleInactivateSelected = () => {
        if (window.confirm(`Inactivate ${selected.length} parent(s)?`)) {
            inactivateMutation.mutate(selected);
        }
    };

    const handleActivateSelected = () => {
        if (window.confirm(`Activate ${selected.length} parent(s)?`)) {
            activateMutation.mutate(selected);
        }
    };

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8  space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>Parent Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {total} {total === 1 ? 'Parent' : 'Parents'} registered
                    </p>
                </div>
                <Link href={`/dashboard/schools/${schoolId}/profiles/parents/new`}>
                    <Button className="w-full sm:w-auto dark:text-white" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Parent
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total Parents</p>
                                <p className="text-lg font-bold">{total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Active</p>
                                <p className="text-lg font-bold">{activeCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                                <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Linked</p>
                                <p className="text-lg font-bold">{linkedCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                                <UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Inactive</p>
                                <p className="text-lg font-bold">{total - activeCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or phone..."
                                className="pl-9 text-sm bg-muted"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-muted"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['parents', schoolId] })}
                            disabled={isFetching}
                        >
                            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selected.length > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium">
                                {selected.length} {selected.length === 1 ? 'parent' : 'parents'} selected
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleActivateSelected}
                                    disabled={activateMutation.isPending}
                                >
                                    {activateMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="mr-2 h-4 w-4" />
                                    )}
                                    Activate
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Parents Table */}
            <Card className={'py-0 overflow-hidden'}>
                <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={selected.length === parents.length && parents.length > 0}
                                        onChange={(e) => setSelected(e.target.checked ? parents.map(p => p.id) : [])}
                                    />
                                </TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Occupation</TableHead>
                                <TableHead>Linked Students</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parentsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Loading parents...</p>
                                    </TableCell>
                                </TableRow>
                            ) : parents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">No parents found</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {search
                                                ? 'Try adjusting your search'
                                                : 'Add your first parent to get started'}
                                        </p>
                                        <Link href={`/dashboard/schools/${schoolId}/profiles/parents/new`}>
                                            <Button size="sm">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Parent
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                parents.map(parent => (
                                    <TableRow
                                        key={parent.id}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="cursor-pointer"
                                                checked={selected.includes(parent.id)}
                                                onChange={() => toggleSelect(parent.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={parent.user?.profilePicture} />
                                                    <AvatarFallback className="text-xs">
                                                        {parent.name?.[0]?.toUpperCase() || "P"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {parent.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {parent.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    <span>{parent.contactNumber}</span>
                                                </div>
                                                {parent.alternateNumber && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" />
                                                        <span>{parent.alternateNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {parent.occupation || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {parent.studentLinks?.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {parent.studentLinks.slice(0, 2).map((link) => (
                                                        <div key={link.id} className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium truncate max-w-[120px]">
                                                                {link.student.name}
                                                            </span>
                                                            {/* <span className={cn(
                                                                'inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider',
                                                                RELATION_COLORS[link.relation] || RELATION_COLORS.OTHER
                                                            )}>
                                                                {link.relation}
                                                            </span> */}
                                                        </div>
                                                    ))}
                                                    {parent.studentLinks.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{parent.studentLinks.length - 2} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">No students</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    parent.user?.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400"
                                                )}
                                            >
                                                {parent.user?.status || 'UNKNOWN'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/schools/profiles/parents/${parent.id}`}>
                                                <Button variant="outline" size="sm" className="gap-1.5">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    View Profile
                                                </Button>
                                            </Link>
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
                                Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, total)} of {total} parents
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

        </div>
    );
}