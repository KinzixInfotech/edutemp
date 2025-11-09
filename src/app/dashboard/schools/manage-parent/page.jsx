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
import { Command, CommandInput, CommandItem, CommandList, CommandGroup, CommandEmpty } from '@/components/ui/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
    Plus,
    RefreshCw,
    Loader2,
    Trash2,
    Users,
    Search,
    Eye,
    Link as LinkIcon,
    ChevronLeft,
    ChevronRight,
    UserX,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    GraduationCap,
    DollarSign,
    AlertCircle,
    X,
    Check,
    ChevronsUpDown
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

export default function ParentListPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selected, setSelected] = useState([]);
    const [dialogData, setDialogData] = useState(null);
    console.log(dialogData);
    
    const [search, setSearch] = useState('');
    const [studentSearchOpen, setStudentSearchOpen] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch parents with pagination
    const { data: parentData = {}, isLoading: parentsLoading, isFetching } = useQuery({
        queryKey: ['parents', schoolId, page, search],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/parents`, {
                params: { page, limit: itemsPerPage, search }
            });
            return res.data || {};
        },
        enabled: !!schoolId,
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });

    const parents = parentData.parents || [];
    const total = parentData.total || 0;
    const pageCount = Math.ceil(total / itemsPerPage);

    // Fetch students for linking (with search)
    const { data: studentsData, isLoading: studentsLoading } = useQuery({
        queryKey: ['students-search', schoolId, studentSearchQuery],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/students/search?q=${encodeURIComponent(studentSearchQuery)}`);
            return res.data; // ✅ axios response data is already parsed
        },
        enabled: !!schoolId && studentSearchOpen && !!dialogData,
        staleTime: 30000,
    });


    const students = studentsData?.students || [];
    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.delete(`/api/schools/${schoolId}/parents`, {
                data: { parentIds: ids }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['parents', schoolId]);
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
            queryClient.invalidateQueries(['parents', schoolId]);
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
            queryClient.invalidateQueries(['parents', schoolId]);
            toast.success('Parents activated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to activate parents');
        }
    });

    // Link student mutation
    const linkStudentMutation = useMutation({
        mutationFn: async ({ parentId, studentIds }) => {
            const promises = studentIds.map(studentId =>
                axios.patch(`/api/schools/${schoolId}/parents/${parentId}/link-student`, {
                    studentId
                })
            );
            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['parents', schoolId]);
            toast.success('Students linked successfully');
            setDialogData(null);
            setSelectedStudents([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to link students');
        }
    });

    // Unlink student mutation
    const unlinkStudentMutation = useMutation({
        mutationFn: async ({ parentId, studentId }) => {
            const res = await axios.delete(`/api/schools/${schoolId}/parents/${parentId}/link-student?studentId=${studentId}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['parents', schoolId]);
            toast.success('Student unlinked successfully');

        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to unlink student');
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

    const openDialog = (parent) => {
        setDialogData(parent);
        setSelectedStudents([]);
    };

    const handleStudentSelect = (student) => {
        const isSelected = selectedStudents.some(s => s.userId === student.userId);
        if (isSelected) {
            setSelectedStudents(prev => prev.filter(s => s.userId !== student.userId));
        } else {
            setSelectedStudents(prev => [...prev, student]);
        }
    };

    const handleLinkStudents = () => {
        if (selectedStudents.length > 0 && dialogData) {
            linkStudentMutation.mutate({
                parentId: dialogData.id,
                studentIds: selectedStudents.map(s => s.userId)
            });
        }
    };

    const handleUnlinkStudent = (studentId) => {
        if (window.confirm('Unlink this student from parent?')) {
            unlinkStudentMutation.mutate({
                parentId: dialogData.id,
                studentId
            });
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
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
                            onClick={() => queryClient.invalidateQueries(['parents', schoolId])}
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
            <Card>
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
                                                <div className="flex flex-wrap gap-1">
                                                    {parent.studentLinks.slice(0, 2).map((link) => (
                                                        <Badge key={link.id} variant="outline" className="text-xs">
                                                            {link.student.name}
                                                        </Badge>
                                                    ))}
                                                    {parent.studentLinks.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{parent.studentLinks.length - 2}
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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openDialog(parent)}
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

            {/* Parent Details Dialog */}
            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => {
                    setDialogData(null);
                    setSelectedStudents([]);
                }} >
                    <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-start gap-4 pb-4 border-b">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback className="text-lg">
                                        {dialogData.name?.[0]?.toUpperCase() || "P"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-xl font-bold mb-1">
                                        {dialogData.name}
                                    </DialogTitle>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Mail className="h-3.5 w-3.5" />
                                            {dialogData.email}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            {dialogData.contactNumber}
                                        </div>
                                    </div>
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
                        </DialogHeader>

                        <div className="space-y-6 mt-4">
                            {/* Contact Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Contact Information
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'Primary Phone', value: dialogData.contactNumber, icon: Phone },
                                        { label: 'Alternate Phone', value: dialogData.alternateNumber, icon: Phone },
                                        { label: 'Email', value: dialogData.email, icon: Mail },
                                        { label: 'Blood Group', value: dialogData.bloodGroup },
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted">
                                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                {item.icon && <item.icon className="h-3 w-3" />}
                                                {item.label}
                                            </div>
                                            <div className="font-medium">{item.value || 'N/A'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Professional Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Professional Information
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'Occupation', value: dialogData.occupation, icon: Briefcase },
                                        { label: 'Qualification', value: dialogData.qualification, icon: GraduationCap },
                                        { label: 'Annual Income', value: dialogData.annualIncome, icon: DollarSign },
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted">
                                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                {item.icon && <item.icon className="h-3 w-3" />}
                                                {item.label}
                                            </div>
                                            <div className="font-medium">{item.value || 'N/A'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Address Information */}
                            {(dialogData.address || dialogData.city || dialogData.state) && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Address Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {[
                                            { label: 'Address', value: dialogData.address },
                                            { label: 'City', value: dialogData.city },
                                            { label: 'State', value: dialogData.state },
                                            { label: 'Country', value: dialogData.country },
                                            { label: 'Postal Code', value: dialogData.postalCode },
                                        ].map((item, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-muted">
                                                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                                                <div className="font-medium">{item.value || 'N/A'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Emergency Contact */}
                            {(dialogData.emergencyContactName || dialogData.emergencyContactNumber) && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Emergency Contact
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {[
                                            { label: 'Name', value: dialogData.emergencyContactName },
                                            { label: 'Number', value: dialogData.emergencyContactNumber },
                                            { label: 'Relation', value: dialogData.emergencyContactRelation },
                                        ].map((item, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-muted">
                                                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                                                <div className="font-medium">{item.value || 'N/A'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Linked Students Section */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Linked Students ({dialogData.studentLinks?.length || 0})
                                </h3>

                                {dialogData.studentLinks && dialogData.studentLinks.length > 0 ? (
                                    <div className="space-y-2 mb-4">
                                        {dialogData.studentLinks.map((link) => (
                                            <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={link.student.user?.profilePicture} />
                                                        <AvatarFallback>
                                                            {link.student.name?.[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{link.student.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{link.student.class?.className}</span>
                                                            <span>•</span>
                                                            <span>{link.student.section?.name}</span>
                                                            <span>•</span>
                                                            <span>{link.student.admissionNo}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUnlinkStudent(link.studentId)}
                                                    disabled={unlinkStudentMutation.isPending}
                                                >
                                                    <X className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-muted rounded-lg mb-4">
                                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">No students linked yet</p>
                                    </div>
                                )}

                                {/* Link Students Interface */}
                                <div className="p-4 rounded-lg border bg-card">
                                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <LinkIcon className="h-4 w-4" />
                                        Link New Students
                                    </h4>

                                    <div className="space-y-3">
                                        <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between"
                                                >
                                                    {selectedStudents.length > 0
                                                        ? `${selectedStudents.length} student(s) selected`
                                                        : "Search and select students"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Search students by name, admission no..."
                                                        value={studentSearchQuery}
                                                        onValueChange={setStudentSearchQuery}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            {studentsLoading ? "Searching..." : "No students found."}
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {students.map((student) => {
                                                                const isAlreadyLinked = dialogData.studentLinks?.some(
                                                                    link => link.student.userId === student.userId
                                                                );
                                                                const isSelected = selectedStudents.some(
                                                                    s => s.userId === student.userId
                                                                );

                                                                return (
                                                                    <CommandItem
                                                                        key={student.userId}
                                                                        onSelect={() => {
                                                                            if (!isAlreadyLinked) {
                                                                                handleStudentSelect(student);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "cursor-pointer",
                                                                            isAlreadyLinked && "opacity-50 cursor-not-allowed"
                                                                        )}
                                                                        disabled={isAlreadyLinked}
                                                                    >
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <div className={cn(
                                                                                "h-4 w-4 border rounded flex items-center justify-center",
                                                                                isSelected ? 'bg-primary border-primary' : 'border-gray-300',
                                                                                isAlreadyLinked && 'bg-muted'
                                                                            )}>
                                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                                                {isAlreadyLinked && <Check className="h-3 w-3 text-muted-foreground" />}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="font-medium">{student.name}</p>
                                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                    <span>{student.admissionNo}</span>
                                                                                    {student.class && (
                                                                                        <>
                                                                                            <span>•</span>
                                                                                            <span>{student.class.className}</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {isAlreadyLinked && (
                                                                                <Badge variant="secondary" className="text-xs">
                                                                                    Already Linked
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </CommandItem>
                                                                );
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {selectedStudents.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedStudents.map((student) => (
                                                        <div
                                                            key={student.userId}
                                                            className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-md"
                                                        >
                                                            <span className="text-sm">{student.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStudentSelect(student)}
                                                                className="hover:bg-primary/20 rounded-full p-0.5"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Button
                                                    onClick={handleLinkStudents}
                                                    disabled={linkStudentMutation.isPending}
                                                    className="w-full"
                                                    size="sm"
                                                >
                                                    {linkStudentMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Linking...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LinkIcon className="mr-2 h-4 w-4" />
                                                            Link {selectedStudents.length} Student(s)
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}