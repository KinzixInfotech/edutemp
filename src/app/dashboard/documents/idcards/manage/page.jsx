'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    Loader2,
    Search,
    Trash2,
    RefreshCw,
    Download,
    Eye,
    MoreVertical,
    FileText,
    Filter,
    CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function ManageIdCardsPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    // Fetch ID Cards History
    const { data: idCards, isLoading } = useQuery({
        queryKey: ['idcards-history', schoolId, searchQuery],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${schoolId}/idcards/history`);
            if (!res.ok) throw new Error("Failed to fetch history");
            return res.json();
        },
        enabled: !!schoolId
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async ({ id, batchId }) => {
            const params = new URLSearchParams();
            if (id) params.append('id', id);
            if (batchId) params.append('batchId', batchId);

            const res = await fetch(`/api/documents/${schoolId}/idcards/history?${params.toString()}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Deleted successfully");
            queryClient.invalidateQueries(['idcards-history']);
        },
        onError: () => toast.error("Delete failed")
    });

    // Filter cards based on search
    const filteredCards = idCards?.filter(card =>
        card.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.student?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.student?.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Group by Batch (Optional view logic - currently flat list is easier for first iteration, 
    // but users might want to see batches. Let's stick to flat list with Batch indicators for now like Admit Cards)

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 space-y-6 bg-secondary/10 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-primary" />
                        ID Card Management
                    </h1>
                    <p className="text-muted-foreground">Manage generated student ID cards</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => router.push('/dashboard/documents/idcards/generate')}>
                        Generate New IDs
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Generated IDs</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search student..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Generated On</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Valid Until</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCards.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No ID cards found. Generate some first.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCards.map((card) => (
                                    <TableRow key={card.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={card.student?.user?.profilePicture} />
                                                    <AvatarFallback>{card.student?.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{card.student?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{card.student?.admissionNo}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {card.student?.class?.className} - {card.student?.section?.name}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(card.generatedAt), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                                                {card.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {card.validUntil ? format(new Date(card.validUntil), 'MMM dd, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {card.layoutConfig?.zipUrl ? (
                                                    <Button variant="ghost" size="icon" title="Download Batch ZIP" onClick={() => window.open(card.layoutConfig.zipUrl, '_blank')}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                ) : card.fileUrl ? (
                                                    <Button variant="ghost" size="icon" title="Download ID" onClick={() => window.open(card.fileUrl, '_blank')}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                ) : null}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => deleteMutation.mutate({ id: card.id })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
