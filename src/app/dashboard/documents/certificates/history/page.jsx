'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Download,
    Loader2,
    Award,
    Eye,
    Trash2,
    Search,
    Filter,
    Plus,
    Users,
    Share2,
    RefreshCw
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export default function CertificateHistoryPage() {
    const router = useRouter();
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const [searchQuery, setSearchQuery] = useState('');
    const [templateFilter, setTemplateFilter] = useState('all');
    const [deleteId, setDeleteId] = useState(null);

    // Fetch certificates
    const { data: certificates, isLoading, refetch } = useQuery({
        queryKey: ['certificates-history', schoolId, templateFilter],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const params = new URLSearchParams({ schoolId });
            if (templateFilter !== 'all') params.append('templateId', templateFilter);

            const res = await fetch(`/api/documents/${schoolId}/certificates/history?${params}`);
            if (!res.ok) throw new Error('Failed to fetch certificates');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch templates for filter
    const { data: templates } = useQuery({
        queryKey: ['certificate-templates-all', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/documents/${schoolId}/certificate-templates`);
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async ({ id, isBatch }) => {
            const params = new URLSearchParams(isBatch ? { batchId: id } : { id });
            const res = await fetch(`/api/documents/${schoolId}/certificates/history?${params.toString()}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete certificate');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Deleted successfully');
            queryClient.invalidateQueries(['certificates-history']);
            refetch();
            setDeleteId(null);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete');
        },
    });

    // Filter certificates based on search
    const filteredCertificates = certificates?.filter((cert) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            cert.student?.name?.toLowerCase().includes(searchLower) ||
            cert.student?.rollNumber?.toLowerCase().includes(searchLower) ||
            cert.certificateNumber?.toLowerCase().includes(searchLower) ||
            cert.template?.name?.toLowerCase().includes(searchLower)
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
                        <Award className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                        <span>Certificate History</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        View and manage all generated certificates
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        onClick={() => router.push('/dashboard/documents/certificates/bulk')}
                        variant="outline"
                        size="sm"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Bulk Generate
                    </Button>
                    <Button
                        onClick={() => router.push('/dashboard/documents/certificates/generate')}
                        size="sm"
                        disabled // Disabled until we have a generic generate page or redirect to templates
                        title="Use 'Generate' from sidebar to select type"
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
                                placeholder="Search by student, certificate no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Template Filter */}
                        <Select value={templateFilter} onValueChange={setTemplateFilter}>
                            <SelectTrigger>
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filter by template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Templates</SelectItem>
                                {templates?.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
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
                                Generated Certificates
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {isLoading ? 'Loading...' : `${filteredCertificates?.length || 0} certificates found`}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredCertificates?.length > 0 ? (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type / Student</TableHead>
                                        <TableHead>Template / Title</TableHead>
                                        <TableHead>Certificate No</TableHead>
                                        <TableHead>Issue Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const groups = new Map();
                                        const sorted = [...filteredCertificates].sort((a, b) =>
                                            new Date(b.issueDate) - new Date(a.issueDate)
                                        );

                                        sorted.forEach(cert => {
                                            const batchId = cert.customFields?.batchId;
                                            let key;

                                            if (batchId) {
                                                key = `batch-${batchId}`;
                                            } else {
                                                const timeKey = new Date(cert.issueDate).toISOString().slice(0, 16);
                                                key = `time-${cert.templateId}-${timeKey}`;
                                            }

                                            if (!groups.has(key)) {
                                                groups.set(key, []);
                                            }
                                            groups.get(key).push(cert);
                                        });

                                        const rows = [];
                                        groups.forEach((certs, key) => {
                                            if (certs.length > 1) {
                                                const first = certs[0];
                                                rows.push({
                                                    type: 'BATCH',
                                                    id: key,
                                                    count: certs.length,
                                                    template: first.template,
                                                    issueDate: first.issueDate,
                                                    zipUrl: first.customFields?.zipUrl,
                                                    certs: certs
                                                });
                                            } else {
                                                rows.push({
                                                    type: 'SINGLE',
                                                    ...certs[0]
                                                });
                                            }
                                        });

                                        return rows.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {item.type === 'BATCH' ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-primary/10 p-2 rounded-md">
                                                                <Users className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">Bulk Generation</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {item.count} Students
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border">
                                                                <AvatarImage src={item.student?.user?.profilePicture} alt={item.student?.name} />
                                                                <AvatarFallback>{item.student?.name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{item.student?.name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Roll: {item.student?.rollNumber}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{item.template?.name}</span>
                                                        <span className="text-xs text-muted-foreground capitalize">{item.template?.type || 'Certificate'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {item.type === 'BATCH' ? (
                                                        <Badge variant="secondary">
                                                            {item.count} Certificates
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="font-mono">
                                                            {item.certificateNumber}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {format(new Date(item.issueDate), 'MMM dd, yyyy h:mm a')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {item.type === 'BATCH' ? (
                                                            <>
                                                                {item.zipUrl ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => window.open(item.zipUrl, '_blank')}
                                                                        title="Download ZIP"
                                                                    >
                                                                        <Download className="h-4 w-4 text-green-600" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="ghost" size="sm" disabled>
                                                                        <Download className="h-4 w-4 text-muted-foreground" />
                                                                    </Button>
                                                                )}
                                                                {item.zipUrl && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(item.zipUrl);
                                                                            toast.success('Link copied to clipboard');
                                                                        }}
                                                                        title="Copy Link"
                                                                    >
                                                                        <Share2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        toast.info("Showing filters for this batch");
                                                                        setTemplateFilter(item.template?.id || 'all');
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => router.push(`/dashboard/documents/certificates/view/${item.id}`)} // Assuming view page or generate with ID
                                                                    disabled={!item.id} // Placeholder
                                                                    className="opacity-50 cursor-not-allowed" // Until View page is ready
                                                                    title="View functionality coming soon"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (item.fileUrl) {
                                                                            const link = document.createElement('a');
                                                                            link.href = item.fileUrl;
                                                                            link.download = `certificate-${item.certificateNumber}.pdf`;
                                                                            link.click();
                                                                        } else {
                                                                            toast.error("PDF not available");
                                                                        }
                                                                    }}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (item.fileUrl) {
                                                                            navigator.clipboard.writeText(item.fileUrl);
                                                                            toast.success('Link copied to clipboard');
                                                                        } else {
                                                                            toast.error("Link not available");
                                                                        }
                                                                    }}
                                                                    title="Copy Link"
                                                                >
                                                                    <Share2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteId({
                                                                id: item.type === 'BATCH' ? item.id.replace('batch-', '') : item.id,
                                                                isBatch: item.type === 'BATCH'
                                                            })} // Handle batch ID properly
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    })()}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Award className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Certificates Found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mb-4">
                                Start generating certificates to see them here
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Certificate?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the certificate history.
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
