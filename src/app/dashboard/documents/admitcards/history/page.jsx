'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';

import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Download,
    Loader2,
    FileText,
    Eye,
    Trash2,
    Search,
    Filter,
    Calendar,
    User,
    MoreVertical,
    CheckCircle,
    XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdmitCardHistoryPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [searchQuery, setSearchQuery] = useState('');
    const [examFilter, setExamFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleteId, setDeleteId] = useState(null);

    // Fetch admit cards history
    const { data: admitCards, isLoading, refetch } = useQuery({
        queryKey: ['admitcards-history', schoolId, examFilter, statusFilter],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({
                schoolId,
                ...(examFilter !== 'all' && { examId: examFilter }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
            });
            const res = await fetch(`/api/documents/${schoolId}/admitcards/history?${params}`);
            if (!res.ok) throw new Error('Failed to fetch admit cards');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch exams for filter
    const { data: exams } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/exams?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch exams');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/documents/${schoolId}/admitcards/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete admit card');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Admit card deleted successfully');
            refetch();
            setDeleteId(null);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete admit card');
        },
    });

    // Filter admit cards based on search
    const filteredAdmitCards = admitCards?.filter((card) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            card.student?.name?.toLowerCase().includes(searchLower) ||
            card.student?.rollNumber?.toLowerCase().includes(searchLower) ||
            card.seatNumber?.toLowerCase().includes(searchLower) ||
            card.exam?.title?.toLowerCase().includes(searchLower)
        );
    });

    if (!schoolId || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                        <span>Admit Cards History</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        View and manage all generated admit cards
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/documents/admitcards/generate')}
                    size="sm"
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Generate New
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by student, roll no, seat no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Exam Filter */}
                        <Select value={examFilter} onValueChange={setExamFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by exam" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Exams</SelectItem>
                                {exams?.map((exam) => (
                                    <SelectItem key={exam.id} value={exam.id.toString()}>
                                        {exam.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="issued">Issued</SelectItem>
                                <SelectItem value="downloaded">Downloaded</SelectItem>
                                <SelectItem value="printed">Printed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base sm:text-lg">
                                Generated Admit Cards
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {filteredAdmitCards?.length || 0} admit cards found
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAdmitCards?.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Exam</TableHead>
                                        <TableHead>Seat No</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAdmitCards.map((card) => (
                                        <TableRow key={card.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{card.student?.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Roll: {card.student?.rollNumber}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{card.exam?.title}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {card.center || 'N/A'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{card.seatNumber}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">
                                                        {format(new Date(card.issueDate), 'MMM dd, yyyy')}
                                                    </span>
                                                    {card.examTime && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {card.examTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        card.status === 'issued'
                                                            ? 'default'
                                                            : card.status === 'downloaded'
                                                                ? 'secondary'
                                                                : 'outline'
                                                    }
                                                >
                                                    {card.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(card.fileUrl, '_blank')}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = card.fileUrl;
                                                                link.download = `admit-card-${card.seatNumber}.pdf`;
                                                                link.click();
                                                            }}
                                                        >
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Download
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteId(card.id)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Admit Cards Found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mb-4">
                                {searchQuery || examFilter !== 'all' || statusFilter !== 'all'
                                    ? 'No admit cards match your search criteria'
                                    : 'Start generating admit cards to see them here'}
                            </p>
                            <Button onClick={() => router.push('/dashboard/documents/admitcards/generate')}>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Admit Card
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Admit Card?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the admit card
                            from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}