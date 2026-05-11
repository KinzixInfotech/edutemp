'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Search, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export default function MyDocumentTemplatesPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [orientation, setOrientation] = useState('all');

    const templatesQuery = useQuery({
        queryKey: ['my-document-templates'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/my');
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        staleTime: 60_000,
    });

    const categoriesQuery = useQuery({
        queryKey: ['marketplace-template-categories'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/marketplace/categories');
            if (!res.ok) throw new Error('Failed to load categories');
            return res.json();
        },
        staleTime: 5 * 60_000,
    });

    const filteredTemplates = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (templatesQuery.data || [])
            .filter((template) => category === 'all' || template.category?.slug === category)
            .filter((template) => orientation === 'all' || template.orientation === orientation)
            .filter((template) => !q || [template.name, template.description, template.category?.name, template.documentType]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q)));
    }, [templatesQuery.data, query, category, orientation]);

    if (templatesQuery.isLoading) {
        return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-muted/20">
            <div className="border-b bg-background">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">My Templates</h1>
                            <p className="text-sm text-muted-foreground">Purchased, unlocked, downloaded, and customized school document templates.</p>
                        </div>
                        <Button onClick={() => router.push('/dashboard/documents/templates/marketplace')}>Open Marketplace</Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Search my templates..." value={query} onChange={(event) => setQuery(event.target.value)} />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {(categoriesQuery.data || []).map((item) => <SelectItem key={item.id} value={item.slug}>{item.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={orientation} onValueChange={setOrientation}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All orientations</SelectItem>
                                <SelectItem value="portrait">Portrait</SelectItem>
                                <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template) => {
                    const aspectRatio = `${template.canvasWidth || 794} / ${template.canvasHeight || 1123}`;
                    const preview = template.previewImage || template.layoutConfig?.backgroundImage;
                    return (
                        <article key={`${template.source}-${template.id}`} className="overflow-hidden rounded-lg border bg-background shadow-sm">
                            <div className="relative bg-slate-100 p-4">
                                <div className="mx-auto overflow-hidden rounded border bg-white shadow-sm" style={{ aspectRatio, maxHeight: 280 }}>
                                    {preview ? (
                                        <img src={preview} alt={template.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <Sparkles className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute left-3 top-3 flex gap-2">
                                    <Badge>{template.source === 'school-copy' ? 'My copy' : template.pricing}</Badge>
                                    {template.updateAvailable && <Badge variant="secondary">Update available</Badge>}
                                </div>
                            </div>
                            <div className="space-y-3 p-4">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="font-semibold leading-tight">{template.name}</h2>
                                        <Badge variant="outline" className="capitalize">{template.orientation}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{template.category?.name || template.documentType}</p>
                                </div>
                                <Button className="w-full" onClick={() => router.push(`/dashboard/documents/generate?templateId=${template.id}`)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate
                                </Button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
