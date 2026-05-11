'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Lock, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
export default function TemplateMarketplacePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [pricing, setPricing] = useState('all');
    const [orientation, setOrientation] = useState('all');
    const [featured, setFeatured] = useState('all');
    const [busyId, setBusyId] = useState(null);

    const templatesQuery = useQuery({
        queryKey: ['template-marketplace'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/templates/marketplace');
            if (!res.ok) throw new Error('Failed to load marketplace');
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

    const templates = useMemo(() => templatesQuery.data || [], [templatesQuery.data]);
    const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

    if (templatesQuery.error) {
        toast.error('Failed to load marketplace');
    }

    const ensureUsableTemplate = async (template) => {
        if (!template.isUnlocked) {
            const purchaseRes = await fetchWithAuth(`/api/templates/marketplace/${template.id}/purchase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const purchase = await purchaseRes.json();
            if (!purchaseRes.ok) throw new Error(purchase.error || 'Payment could not start');
            if (purchase.orderId) {
                await openRazorpayCheckout(template, purchase);
            }
        }

        const res = await fetchWithAuth(`/api/templates/marketplace/${template.id}/use`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not use template');
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['template-marketplace'] }),
            queryClient.invalidateQueries({ queryKey: ['my-document-templates'] }),
        ]);
        return data.copy?.id || template.id;
    };

    const filteredTemplates = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return templates.filter((template) => {
            const matchesQuery = !normalizedQuery || [template.name, template.description, template.category?.name]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedQuery));
            const matchesCategory = category === 'all' || template.category?.slug === category;
            const matchesPricing = pricing === 'all' || template.pricing === pricing;
            const matchesOrientation = orientation === 'all' || template.orientation === orientation;
            const matchesFeatured = featured === 'all' || (featured === 'featured' ? template.isFeatured : !template.isFeatured);
            return matchesQuery && matchesCategory && matchesPricing && matchesOrientation && matchesFeatured;
        });
    }, [templates, query, category, pricing, orientation, featured]);

    const handleUseTemplate = async (template) => {
        try {
            setBusyId(template.id);
            const usableTemplateId = await ensureUsableTemplate(template);
            toast.success(template.hasSchoolCopy ? 'Template copy ready' : 'Template copied for your school');
            router.push(`/dashboard/documents/generate?templateId=${usableTemplateId}`);
        } catch (error) {
            toast.error(error.message || 'Could not use template');
        } finally {
            setBusyId(null);
        }
    };

    const openRazorpayCheckout = (template, order) => new Promise((resolve, reject) => {
        const startCheckout = () => {
            const razorpay = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'EduBreezy Templates',
                description: template.name,
                order_id: order.orderId,
                handler: async (response) => {
                    const verifyRes = await fetchWithAuth(`/api/templates/marketplace/${template.id}/purchase`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        }),
                    });
                    if (!verifyRes.ok) {
                        const data = await verifyRes.json();
                        reject(new Error(data.error || 'Payment verification failed'));
                        return;
                    }
                    toast.success('Template unlocked');
                    resolve();
                },
                modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
            });
            razorpay.open();
        };

        if (window.Razorpay) {
            startCheckout();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = startCheckout;
        script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
        document.body.appendChild(script);
    });

    if (templatesQuery.isLoading) {
        return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-muted/20">
            <div className="border-b bg-background">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Template Marketplace</h1>
                            <p className="text-sm text-muted-foreground">Browse EduBreezy-created school documents and create school-owned copies.</p>
                        </div>
                        <Badge variant="outline">{filteredTemplates.length} templates</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_200px_170px_170px_160px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Search templates..." value={query} onChange={(event) => setQuery(event.target.value)} />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map((item) => <SelectItem key={item.id} value={item.slug}>{item.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={pricing} onValueChange={setPricing}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Free and premium</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
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
                        <Select value={featured} onValueChange={setFeatured}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Featured and regular</SelectItem>
                                <SelectItem value="featured">Featured only</SelectItem>
                                <SelectItem value="regular">Regular only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template) => {
                    const aspectRatio = `${template.canvasWidth || 794} / ${template.canvasHeight || 1123}`;
                    return (
                        <article key={template.id} className="overflow-hidden rounded-lg border bg-background shadow-sm">
                            <div className="relative bg-slate-100 p-4">
                                <div className="mx-auto overflow-hidden rounded border bg-white shadow-sm" style={{ aspectRatio, maxHeight: 280 }}>
                                    {template.previewImage ? (
                                        <img src={template.previewImage} alt={template.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <Sparkles className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute left-3 top-3 flex gap-2">
                                    <Badge>{template.pricing === 'premium' ? 'Premium' : 'Free'}</Badge>
                                    {template.isFeatured && <Badge variant="secondary">Featured</Badge>}
                                </div>
                            </div>
                            <div className="space-y-3 p-4">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="font-semibold leading-tight">{template.name}</h2>
                                        <Badge variant="outline" className="capitalize">{template.orientation}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{template.description || template.category?.name}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs text-muted-foreground">
                                        {template.category?.name || template.documentType}
                                        {template.currentVersionNumber && (
                                            <span className="ml-2">v{template.currentVersionNumber}</span>
                                        )}
                                        {template.updateAvailable && (
                                            <Badge variant="secondary" className="ml-2">Update available</Badge>
                                        )}
                                        {template.pricing === 'premium' && (
                                            <span className="ml-2 font-medium text-foreground">Rs. {Math.round((template.pricePaise || 0) / 100)}</span>
                                        )}
                                    </div>
                                    <Button size="sm" onClick={() => handleUseTemplate(template)} disabled={busyId === template.id}>
                                        {busyId === template.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : template.isUnlocked ? <FileText className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                                        {template.hasSchoolCopy ? 'Generate' : template.isUnlocked ? 'Use Template' : 'Unlock'}
                                    </Button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
