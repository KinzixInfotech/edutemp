'use client';

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Save, Upload, Send, Star, FileText, Tags, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import CertificateDesignEditor from '@/components/certificate-editor/CertificateDesignEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { uploadFilesToR2 } from '@/hooks/useR2Upload';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { extractTemplatePlaceholders, normalizeTemplateLayout } from '@/lib/shared-field-resolver';
import { buildSamplePreviewLayout, validateTemplateLayout } from '@/lib/template-rendering';

const BLANK_LAYOUT = {
    elements: [],
    canvasSize: { width: 794, height: 1123 },
    backgroundImage: '',
    backgroundAsset: null,
};

export default function SuperAdminTemplateStudioPage() {
    const { user, loading: authLoading } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const [templatePanelCollapsed, setTemplatePanelCollapsed] = useState(false);
    const [publishPanelCollapsed, setPublishPanelCollapsed] = useState(false);
    const [details, setDetails] = useState({
        name: 'Untitled Marketplace Template',
        description: '',
        categoryId: '',
        documentType: 'school-document',
        pricing: 'free',
        pricePaise: 0,
        visibility: 'draft',
        isFeatured: false,
    });
    const [layoutConfig, setLayoutConfig] = useState(BLANK_LAYOUT);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId),
        [templates, selectedTemplateId],
    );
    const validation = useMemo(() => validateTemplateLayout(layoutConfig), [layoutConfig]);
    const samplePreviewLayout = useMemo(() => buildSamplePreviewLayout(layoutConfig), [layoutConfig]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [templateRes, categoryRes] = await Promise.all([
                fetchWithAuth('/api/super-admin/template-studio'),
                fetchWithAuth('/api/templates/marketplace/categories'),
            ]);
            if (!templateRes.ok || !categoryRes.ok) {
                throw new Error(templateRes.status === 401 || categoryRes.status === 401 ? 'Unauthorized' : 'Failed to load');
            }
            const [templateData, categoryData] = await Promise.all([templateRes.json(), categoryRes.json()]);
            setTemplates(Array.isArray(templateData) ? templateData : []);
            setCategories(Array.isArray(categoryData) ? categoryData : []);
            if (!selectedTemplateId && templateData?.[0]) setSelectedTemplateId(templateData[0].id);
        } catch (error) {
            toast.error('Failed to load template studio');
        } finally {
            setLoading(false);
        }
    };
    const hasFetched = useRef(false);

    useEffect(() => {
        if (authLoading || !user || hasFetched.current) return;
        hasFetched.current = true;
        loadData();
    }, [authLoading, user]);

    useEffect(() => {
        if (!selectedTemplate) return;
        setDetails({
            name: selectedTemplate.name || '',
            description: selectedTemplate.description || '',
            categoryId: selectedTemplate.categoryId || '',
            documentType: selectedTemplate.documentType || 'school-document',
            pricing: selectedTemplate.pricing || 'free',
            pricePaise: selectedTemplate.pricePaise || 0,
            visibility: selectedTemplate.visibility || 'draft',
            isFeatured: Boolean(selectedTemplate.isFeatured),
        });
        setLayoutConfig(selectedTemplate.layoutConfig || BLANK_LAYOUT);
    }, [selectedTemplate]);

    const resetDraft = () => {
        setSelectedTemplateId(null);
        setDetails({
            name: 'Untitled Marketplace Template',
            description: '',
            categoryId: categories[0]?.id || '',
            documentType: categories[0]?.slug || 'school-document',
            pricing: 'free',
            pricePaise: 0,
            visibility: 'draft',
            isFeatured: false,
        });
        setLayoutConfig(BLANK_LAYOUT);
    };

    const uploadBackground = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const uploaded = await uploadFilesToR2('templates', { files: [file] });
            const url = uploaded?.[0]?.url;
            if (!url) throw new Error('Upload failed');
            const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');
            setLayoutConfig((current) => ({
                ...current,
                backgroundImage: mimeType.startsWith('image/') ? url : '',
                backgroundAsset: { url, mimeType, fileName: file.name, source: 'super-admin-upload' },
            }));
            toast.success('Background uploaded. Map fields on top of it.');
        } catch (error) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const createCategory = async () => {
        if (!newCategoryName.trim()) return;
        const res = await fetchWithAuth('/api/templates/marketplace/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        if (!res.ok) {
            toast.error('Could not create category');
            return;
        }
        const category = await res.json();
        setCategories((current) => [...current, category]);
        setDetails((current) => ({ ...current, categoryId: category.id, documentType: category.slug }));
        setNewCategoryName('');
    };

    const saveTemplate = async (publish = false) => {
        if (!details.name.trim()) {
            toast.error('Template name is required');
            return;
        }
        try {
            setSaving(true);
            const stableLayout = normalizeTemplateLayout({
                ...layoutConfig,
                mappingPlaceholders: extractTemplatePlaceholders(layoutConfig.elements || []),
            });
            const report = validateTemplateLayout(stableLayout);
            if (publish && !report.valid) {
                toast.error('Fix template validation issues before publishing');
                return;
            }
            const url = selectedTemplateId
                ? `/api/super-admin/template-studio/${selectedTemplateId}`
                : '/api/super-admin/template-studio';
            const res = await fetchWithAuth(url, {
                method: selectedTemplateId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...details, layoutConfig: stableLayout, publish }),
            });
            if (!res.ok) throw new Error((await res.json())?.error || 'Save failed');
            toast.success(publish ? 'Template published to marketplace' : 'Draft saved');
            await loadData();
        } catch (error) {
            toast.error(error.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <aside className={`${templatePanelCollapsed ? 'w-12' : 'w-80'} shrink-0 border-r bg-background transition-[width] duration-200`}>
                <div className="flex h-14 items-center justify-between border-b px-4">
                    {templatePanelCollapsed ? (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setTemplatePanelCollapsed(false)}
                            title="Expand templates"
                        >
                            <PanelLeftOpen className="h-4 w-4" />
                        </Button>
                    ) : (
                        <>
                            <div>
                                <h1 className="text-sm font-semibold">Template Studio</h1>
                                <p className="text-xs text-muted-foreground">Super Admin publishing</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" onClick={() => setTemplatePanelCollapsed(true)} title="Collapse templates">
                                    <PanelLeftClose className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" onClick={resetDraft}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </>
                    )}
                </div>
                {templatePanelCollapsed ? (
                    <div className="flex flex-col items-center gap-2 p-2">
                        <Button size="icon" variant="outline" onClick={resetDraft} title="New template"><Plus className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <div className="space-y-2 overflow-auto p-3">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplateId(template.id)}
                                className={`w-full rounded-md border p-3 text-left text-sm ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'bg-background'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium line-clamp-1">{template.name}</span>
                                    <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>{template.status}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{template.category?.name || template.documentType}</p>
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-14 items-center justify-between border-b px-4">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-semibold">{details.name}</span>
                        <Badge variant="outline">{layoutConfig.canvasSize?.width || 794} x {layoutConfig.canvasSize?.height || 1123}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={uploading} asChild>
                            <label>
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Canva Background
                                <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={uploadBackground} />
                            </label>
                        </Button>
                        <Button variant={previewMode ? 'default' : 'outline'} onClick={() => setPreviewMode((value) => !value)}>
                            {previewMode ? 'Design Mode' : 'Sample Preview'}
                        </Button>
                        <Button variant="outline" onClick={() => saveTemplate(false)} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" /> Save Draft
                        </Button>
                        <Button onClick={() => saveTemplate(true)} disabled={saving}>
                            <Send className="mr-2 h-4 w-4" /> Publish
                        </Button>
                    </div>
                </div>

                <div className={`grid min-h-0 flex-1 ${publishPanelCollapsed ? 'grid-cols-[1fr_48px]' : 'grid-cols-[1fr_340px]'}`}>
                    <CertificateDesignEditor
                        key={previewMode ? 'sample-preview' : 'design-builder'}
                        initialConfig={previewMode ? samplePreviewLayout : layoutConfig}
                        onChange={previewMode ? undefined : setLayoutConfig}
                        templateType="marketplace"
                        readOnly={previewMode}
                    />
                    <aside className={`${publishPanelCollapsed ? 'overflow-hidden p-2' : 'overflow-auto p-4'} border-l bg-background transition-all duration-200`}>
                        {publishPanelCollapsed ? (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPublishPanelCollapsed(false)}
                                title="Expand publishing"
                            >
                                <PanelRightOpen className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-semibold">Publishing</h2>
                                        <p className="text-xs text-muted-foreground">Marketplace details</p>
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => setPublishPanelCollapsed(true)} title="Collapse publishing">
                                        <PanelRightClose className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea rows={3} value={details.description} onChange={(event) => setDetails({ ...details, description: event.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={details.categoryId}
                                        onValueChange={(categoryId) => {
                                            const category = categories.find((item) => item.id === categoryId);
                                            setDetails({ ...details, categoryId, documentType: category?.slug || details.documentType });
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-2">
                                        <Input placeholder="New category" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
                                        <Button variant="outline" size="icon" onClick={createCategory}><Tags className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Pricing</Label>
                                        <Select value={details.pricing} onValueChange={(pricing) => setDetails({ ...details, pricing })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Free</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price</Label>
                                        <Input type="number" value={Math.round((details.pricePaise || 0) / 100)} onChange={(event) => setDetails({ ...details, pricePaise: Number(event.target.value || 0) * 100 })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Visibility</Label>
                                    <Select value={details.visibility} onValueChange={(visibility) => setDetails({ ...details, visibility })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="hidden">Hidden</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <Label>Featured</Label>
                                        <p className="text-xs text-muted-foreground">Promote in marketplace</p>
                                    </div>
                                    <Switch checked={details.isFeatured} onCheckedChange={(isFeatured) => setDetails({ ...details, isFeatured })} />
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground"><Star className="h-3.5 w-3.5" /> Field mappings</div>
                                    {(extractTemplatePlaceholders(layoutConfig.elements || []).length ? extractTemplatePlaceholders(layoutConfig.elements || []) : ['No mappings yet']).map((field) => (
                                        <Badge key={field} variant="outline" className="mb-1 mr-1">{field}</Badge>
                                    ))}
                                </div>
                                <div className={`rounded-md border p-3 text-xs ${validation.valid ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                                    <div className="mb-2 font-medium">Publish validation</div>
                                    {validation.issues.length === 0 ? (
                                        <p>No blocking issues.</p>
                                    ) : validation.issues.map((issue) => (
                                        <p key={issue} className="mb-1">{issue}</p>
                                    ))}
                                    {validation.warnings.length > 0 && (
                                        <div className="mt-3 border-t border-current/20 pt-2">
                                            <p className="mb-1 font-medium">Warnings</p>
                                            {validation.warnings.slice(0, 8).map((warning) => (
                                                <p key={warning} className="mb-1">{warning}</p>
                                            ))}
                                            {validation.warnings.length > 8 && <p>{validation.warnings.length - 8} more warnings</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
}
