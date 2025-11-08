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
    Link as LinkIcon,
    ChevronLeft,
    ChevronRight,
    UserX
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

export default function StudentListPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selected, setSelected] = useState([]);
    const [dialogData, setDialogData] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [classFilter, setClassFilter] = useState('ALL');
    const [sectionFilter, setSectionFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch classes & sections
    const { data: allClasses = [] } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            return res.data || [];
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Derive sections dynamically based on selected class
    const allSections = classFilter === 'ALL'
        ? allClasses.flatMap(c => c.sections || [])
        : allClasses.find(c => c.className === classFilter)?.sections || [];

    // Fetch students with optimized query
    const { data: studentData = {}, isLoading: studentsLoading, isFetching } = useQuery({
        queryKey: ['students', schoolId, page, search, classFilter, sectionFilter],
        queryFn: async () => {
            const classId = classFilter === 'ALL' ? '' : allClasses.find(c => c.className === classFilter)?.classId || '';
            const sectionId = sectionFilter === 'ALL' ? '' : allSections.find(s => s.name === sectionFilter)?.sectionId || '';
            const res = await axios.get(`/api/schools/${schoolId}/students`, {
                params: { page, limit: itemsPerPage, classId, sectionId, search }
            });
            return res.data || {};
        },
        enabled: !!schoolId,
        keepPreviousData: true,
        staleTime: 30 * 1000, // 30 seconds
    });

    const students = studentData.students || [];
    const total = studentData.total || 0;
    const pageCount = Math.ceil(total / itemsPerPage);

    // Fetch all parents (only when dialog is open)
    const { data: allParents = [] } = useQuery({
        queryKey: ['parents', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/parents`);
            return res.data.parents || [];
        },
        enabled: !!schoolId && !!dialogData,
        staleTime: 5 * 60 * 1000,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.delete(`/api/schools/${schoolId}/students`, {
                data: { studentIds: ids }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['students', schoolId]);
            toast.success('Students deleted successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete students');
        }
    });

    // Inactivate mutation
    const inactivateMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await axios.patch(`/api/schools/${schoolId}/students/status`, {
                studentIds: ids,
                status: 'INACTIVE'
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['students', schoolId]);
            toast.success('Students inactivated successfully');
            setSelected([]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to inactivate students');
        }
    });

    // Link parent mutation
    const linkParentMutation = useMutation({
        mutationFn: async ({ studentId, parentId }) => {
            const res = await axios.patch(`/api/schools/${schoolId}/students/${studentId}/link-parent`, {
                parentId
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['students', schoolId]);
            toast.success('Parent linked successfully');
            setDialogData(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to link parent');
        }
    });

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${selected.length} student(s)?`)) {
            deleteMutation.mutate(selected);
        }
    };

    const handleInactivateSelected = () => {
        if (window.confirm(`Inactivate ${selected.length} student(s)?`)) {
            inactivateMutation.mutate(selected);
        }
    };

    const openDialog = (student) => {
        setDialogData(student);
        setSelectedParentId(student.parentId || null);
    };

    const handleLinkParent = () => {
        if (selectedParentId && dialogData) {
            linkParentMutation.mutate({
                studentId: dialogData.userId,
                parentId: selectedParentId
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
                        <span>Student Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {total} {total === 1 ? 'student' : 'students'} registered
                    </p>
                </div>
                <Link href={`/dashboard/schools/${schoolId}/profiles/students/new`}>
                    <Button className="w-full sm:w-auto dark:text-white" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Student
                    </Button>
                </Link>
            </div>

            {/* Filters Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
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

                        <Select value={classFilter} onValueChange={(val) => {
                            setClassFilter(val);
                            setSectionFilter('ALL');
                            setPage(1);
                        }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Classes</SelectItem>
                                {allClasses.map(cls => (
                                    <SelectItem key={cls.id} value={cls.className}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Select
                                value={sectionFilter}
                                onValueChange={(val) => {
                                    setSectionFilter(val);
                                    setPage(1);
                                }}
                                disabled={!allSections.length}
                            >
                                <SelectTrigger className="bg-muted text-sm flex-1">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Sections</SelectItem>
                                    {allSections.map(sec => (
                                        <SelectItem key={sec.id} value={sec.name}>
                                            {sec.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted"
                                onClick={() => queryClient.invalidateQueries(['students', schoolId])}
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
                                {selected.length} {selected.length === 1 ? 'student' : 'students'} selected
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

            {/* Students Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={selected.length === students.length && students.length > 0}
                                        onChange={(e) => setSelected(e.target.checked ? students.map(s => s.userId) : [])}
                                    />
                                </TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Class / Section</TableHead>
                                <TableHead>Roll No</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Loading students...</p>
                                    </TableCell>
                                </TableRow>
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">No students found</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {search || classFilter !== 'ALL' || sectionFilter !== 'ALL'
                                                ? 'Try adjusting your filters'
                                                : 'Add your first student to get started'}
                                        </p>
                                        <Link href={`/dashboard/schools/${schoolId}/profiles/students/new`}>
                                            <Button size="sm">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Student
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map(student => (
                                    <TableRow
                                        key={student.userId}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="cursor-pointer"
                                                checked={selected.includes(student.userId)}
                                                onChange={() => toggleSelect(student.userId)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={student.user?.profilePicture} />
                                                    <AvatarFallback className="text-xs">
                                                        {student.name?.[0]?.toUpperCase() || "S"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {student.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        ID: {student.admissionNo || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {student.user?.email || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="text-xs">
                                                    {student.class?.className || 'N/A'}
                                                </Badge>
                                                <span className="text-muted-foreground">/</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {student.section?.name || 'N/A'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {student.rollNumber || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    student.user?.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
                                                        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400"
                                                )}
                                            >
                                                {student.user?.status || 'UNKNOWN'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openDialog(student)}
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
                                Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, total)} of {total} students
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

            {/* Student Details Dialog */}
            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-start gap-4 pb-4 border-b">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback className="text-lg">
                                        {dialogData.name?.[0]?.toUpperCase() || "S"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-xl font-bold mb-1">
                                        {dialogData.name}
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {dialogData.user?.email || 'No email'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {dialogData.class?.className || 'N/A'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {dialogData.section?.name || 'N/A'}
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
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'User ID', value: dialogData.userId },
                                        { label: 'Admission No', value: dialogData.admissionNo },
                                        { label: 'Roll Number', value: dialogData.rollNumber },
                                        { label: 'Admission Date', value: dialogData.admissionDate ? new Date(dialogData.admissionDate).toLocaleDateString() : 'N/A' },
                                        { label: 'Date of Birth', value: dialogData.dob ? new Date(dialogData.dob).toLocaleDateString() : 'N/A' },
                                        { label: 'Blood Group', value: dialogData.bloodGroup },
                                        { label: 'House', value: dialogData.House },
                                        { label: 'Fee Status', value: dialogData.FeeStatus },
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted">
                                            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                                            <div className="font-medium">{item.value || 'N/A'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Address Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Address Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'Address', value: dialogData.Address },
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

                            {/* Parent Information */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Parent/Guardian Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        { label: 'Father Name', value: dialogData.FatherName },
                                        { label: 'Father Number', value: dialogData.FatherNumber },
                                        { label: 'Mother Name', value: dialogData.MotherName },
                                        { label: 'Mother Number', value: dialogData.MotherNumber },
                                        { label: 'Guardian Name', value: dialogData.GuardianName },
                                        { label: 'Guardian Relation', value: dialogData.GuardianRelation },
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-lg bg-muted">
                                            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                                            <div className="font-medium">{item.value || 'N/A'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Link Parent Account */}
                            <div className="p-4 rounded-lg border bg-card">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" />
                                    Link Parent Account
                                </h3>
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedParentId || ''}
                                        onValueChange={setSelectedParentId}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select Parent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allParents.map((parent) => (
                                                <SelectItem key={parent.userId} value={parent.userId}>
                                                    {parent.name} ({parent.user?.email || 'No Email'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={handleLinkParent}
                                        disabled={!selectedParentId || linkParentMutation.isPending}
                                        size="sm"
                                    >
                                        {linkParentMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Link'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}