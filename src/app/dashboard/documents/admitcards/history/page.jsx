'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Plus,
    Users
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
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const [searchQuery, setSearchQuery] = useState('');
    const [examFilter, setExamFilter] = useState('all');
    const [deleteId, setDeleteId] = useState(null);

    // Fetch admit cards
    const { data: admitCards, isLoading, refetch } = useQuery({
        queryKey: ['admitcards-history', schoolId, examFilter],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({ schoolId });
            if (examFilter !== 'all') params.append('examId', examFilter);
            
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
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete admit card');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Admit card deleted successfully');
            queryClient.invalidateQueries(['admitcards-history']);
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

    if (!schoolId) {
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
                <div className="flex gap-2">
                    <Button
                        onClick={() => router.push('/dashboard/documents/admitcards/bulk')}
                        variant="outline"
                        size="sm"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Bulk Generate
                    </Button>
                    <Button
                        onClick={() => router.push('/dashboard/documents/admitcards/generate')}
                        size="sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Single
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <Filter className="mr-2 h-4 w-4" />
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
                                {isLoading ? 'Loading...' : `${filteredAdmitCards?.length || 0} admit cards found`}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredAdmitCards?.length > 0 ? (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Details</TableHead>
                                        <TableHead>Exam</TableHead>
                                        <TableHead>Seat Number</TableHead>
                                        <TableHead>Center</TableHead>
                                        <TableHead>Issue Date</TableHead>
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
                                                    <span className="text-xs text-muted-foreground">
                                                        Class: {card.student?.class?.className}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{card.exam?.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">
                                                    {card.seatNumber}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{card.center || 'N/A'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {format(new Date(card.issueDate), 'MMM dd, yyyy')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/documents/admitcards/${card.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Download logic - you'll need fileUrl from API
                                                            const link = document.createElement('a');
                                                            link.href = card.fileUrl || '#';
                                                            link.download = `admit-card-${card.seatNumber}.pdf`;
                                                            link.click();
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteId(card.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                                {searchQuery || examFilter !== 'all'
                                    ? 'No admit cards match your search criteria'
                                    : 'Start generating admit cards to see them here'}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => router.push('/dashboard/documents/admitcards/generate')}
                                    size="sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Generate Single
                                </Button>
                                <Button
                                    onClick={() => router.push('/dashboard/documents/admitcards/bulk')}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Bulk Generate
                                </Button>
                            </div>
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
                            from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}