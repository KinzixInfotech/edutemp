'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download, FileText, Filter, Loader2, RefreshCw, Search, Share2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function UnifiedDocumentHistoryPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [mode, setMode] = useState('all');
    const [templateId, setTemplateId] = useState('all');

    const categoriesQuery = useQuery({
        queryKey: ['marketplace-template-categories'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/marketplace/categories');
            if (!res.ok) throw new Error('Failed to load categories');
            return res.json();
        },
        staleTime: 5 * 60_000,
    });

    const templatesQuery = useQuery({
        queryKey: ['my-document-templates'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/my');
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        staleTime: 60_000,
    });

    const historyQuery = useInfiniteQuery({
        queryKey: ['document-generation-history', schoolId, query, category, mode, templateId],
        queryFn: async ({ pageParam = 0 }) => {
            const params = new URLSearchParams({
                limit: '30',
                offset: String(pageParam),
                q: query,
                category,
                mode,
                templateId,
            });
            const res = await fetchWithAuth(`/api/documents/${schoolId}/generation-history?${params}`);
            if (!res.ok) throw new Error('Failed to load document history');
            return res.json();
        },
        enabled: !!schoolId,
        getNextPageParam: (lastPage) => lastPage.nextOffset,
        initialPageParam: 0,
    });

    const items = useMemo(
        () => historyQuery.data?.pages.flatMap((page) => page.items || []) || [],
        [historyQuery.data],
    );
    const total = historyQuery.data?.pages?.[0]?.total || 0;

    const deleteItem = async (item) => {
        const batchId = item.metadata?.batchId;
        const params = new URLSearchParams(item.generationMode === 'bulk' && batchId ? { batchId } : { id: item.id });
        const res = await fetchWithAuth(`/api/documents/${schoolId}/generation-history?${params}`, { method: 'DELETE' });
        if (!res.ok) {
            toast.error('Could not delete history record');
            return;
        }
        toast.success('History record deleted');
        historyQuery.refetch();
    };

    if (!schoolId) {
        return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <FileText className="h-6 w-6 text-primary" />
                        Document History
                    </h1>
                    <p className="text-sm text-muted-foreground">All generated certificates, admit cards, IDs, report cards, and school documents.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => historyQuery.refetch()} disabled={historyQuery.isFetching}>
                        <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/documents/certificates/bulk')}>
                        <Users className="mr-2 h-4 w-4" />
                        Bulk Generate
                    </Button>
                    <Button onClick={() => router.push('/dashboard/documents/generate')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-[1fr_200px_180px_220px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Search student, template, document..." value={query} onChange={(event) => setQuery(event.target.value)} />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {(categoriesQuery.data || []).map((item) => <SelectItem key={item.id} value={item.slug}>{item.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Single and bulk</SelectItem>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="bulk">Bulk</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All templates</SelectItem>
                                {(templatesQuery.data || []).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Generated Documents</CardTitle>
                            <p className="text-sm text-muted-foreground">{historyQuery.isLoading ? 'Loading...' : `${total} records found`}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {historyQuery.isLoading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : items.length > 0 ? (
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Student / Batch</TableHead>
                                        <TableHead>Generated</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-medium">{item.templateName}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        <Badge variant="outline">{item.categoryName || item.documentType}</Badge>
                                                        <Badge variant={item.generationMode === 'bulk' ? 'default' : 'secondary'}>{item.generationMode}</Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.generationMode === 'bulk' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded-md bg-primary/10 p-2 text-primary"><Users className="h-4 w-4" /></div>
                                                        <div>
                                                            <div className="font-medium">Bulk generation</div>
                                                            <div className="text-xs text-muted-foreground">Batch {item.metadata?.batchId?.slice(0, 8) || item.id.slice(0, 8)}</div>
                                                        </div>
                                                    </div>
                                                ) : item.student ? (
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarImage src={item.student.profilePicture} />
                                                            <AvatarFallback>{item.student.name?.slice(0, 1) || 'S'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{item.student.name}</div>
                                                            <div className="text-xs text-muted-foreground">{item.student.className || ''} {item.student.sectionName || ''} {item.student.rollNumber ? `- Roll ${item.student.rollNumber}` : ''}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No student</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{format(new Date(item.createdAt), 'MMM dd, yyyy h:mm a')}</TableCell>
                                            <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={!item.fileUrl && !item.zipUrl}
                                                        onClick={() => window.open(item.zipUrl || item.fileUrl, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={!item.fileUrl && !item.zipUrl}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(item.zipUrl || item.fileUrl);
                                                            toast.success('Link copied');
                                                        }}
                                                    >
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteItem(item)}>
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
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <FileText className="mb-3 h-14 w-14" />
                            <h3 className="text-lg font-semibold text-foreground">No documents found</h3>
                            <p className="mt-1 text-sm">Generate from any marketplace template to see records here.</p>
                        </div>
                    )}

                    {historyQuery.hasNextPage && (
                        <div className="mt-4 flex justify-center">
                            <Button variant="outline" onClick={() => historyQuery.fetchNextPage()} disabled={historyQuery.isFetchingNextPage}>
                                {historyQuery.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Load more
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
