'use client';

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Loader2,
    Plus,
    Save,
    Upload,
    Send,
    Star,
    FileText,
    Tags,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    Trash2,
    Search,
} from 'lucide-react';
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
const UNTITLED_TEMPLATE_NAME = 'Untitled Marketplace Template';

export default function SuperAdminTemplateStudioPage() {
    const { user, loading: authLoading } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [templateSearch, setTemplateSearch] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const [templatePanelCollapsed, setTemplatePanelCollapsed] = useState(false);
    const [publishPanelCollapsed, setPublishPanelCollapsed] = useState(false);
    const [details, setDetails] = useState({
        name: UNTITLED_TEMPLATE_NAME,
        description: '',
        categoryId: '',
        documentType: 'school-document',
        pricing: 'free',
        pricePaise: 0,
        status: 'draft',
        visibility: 'draft',
        isFeatured: false,
    });
    const [layoutConfig, setLayoutConfig] = useState(BLANK_LAYOUT);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId),
        [templates, selectedTemplateId],
    );
    const filteredTemplates = useMemo(() => {
        const search = templateSearch.trim().toLowerCase();
        if (!search) return templates;
        return templates.filter((template) => {
            const haystack = [
                template.name,
                template.description,
                template.documentType,
                template.status,
                template.category?.name,
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(search);
        });
    }, [templates, templateSearch]);
    const validation = useMemo(() => validateTemplateLayout(layoutConfig), [layoutConfig]);
    const samplePreviewLayout = useMemo(() => buildSamplePreviewLayout(layoutConfig), [layoutConfig]);

    const upsertTemplate = (template) => {
        setTemplates((current) => {
            const exists = current.some((item) => item.id === template.id);
            if (exists) {
                return current.map((item) => (item.id === template.id ? { ...item, ...template } : item));
            }
            return [template, ...current];
        });
    };

    const loadData = async (preferredTemplateId = selectedTemplateId, options = {}) => {
        const { showLoading = true } = options;
        if (showLoading) setLoading(true);
        try {
            const [templateRes, categoryRes] = await Promise.all([
                fetchWithAuth('/api/super-admin/template-studio'),
                fetchWithAuth('/api/templates/marketplace/categories'),
            ]);
            if (!templateRes.ok || !categoryRes.ok) {
                throw new Error(templateRes.status === 401 || categoryRes.status === 401 ? 'Unauthorized' : 'Failed to load');
            }
            const [templateData, categoryData] = await Promise.all([templateRes.json(), categoryRes.json()]);
            const nextTemplates = Array.isArray(templateData) ? templateData : [];
            setTemplates(nextTemplates);
            setCategories(Array.isArray(categoryData) ? categoryData : []);
            const nextSelectedTemplate = nextTemplates.find((template) => template.id === preferredTemplateId) || nextTemplates[0];
            setSelectedTemplateId(nextSelectedTemplate?.id || null);
        } catch (error) {
            toast.error('Failed to load template studio');
        } finally {
            if (showLoading) setLoading(false);
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
            status: selectedTemplate.status || 'draft',
            visibility: selectedTemplate.visibility || 'draft',
            isFeatured: Boolean(selectedTemplate.isFeatured),
        });
        setLayoutConfig(selectedTemplate.layoutConfig || BLANK_LAYOUT);
    }, [selectedTemplate]);

    const createTemplateDraft = async () => {
        const previousTemplateId = selectedTemplateId;
        const category = categories.find((item) => item.id === details.categoryId) || categories[0];
        const tempId = `draft-${Date.now()}`;
        const draftTemplate = {
            id: tempId,
            name: UNTITLED_TEMPLATE_NAME,
            description: '',
            categoryId: category?.id || '',
            category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
            documentType: category?.slug || 'school-document',
            status: 'draft',
            visibility: 'draft',
            pricing: 'free',
            pricePaise: 0,
            isFeatured: false,
            orientation: 'portrait',
            canvasWidth: 794,
            canvasHeight: 1123,
            previewImage: '',
            backgroundAsset: null,
            layoutConfig: BLANK_LAYOUT,
            fieldPlaceholders: [],
            rendererVersion: 'fixed-layout-v1',
            currentVersionId: null,
            currentVersionNumber: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOptimistic: true,
        };

        setTemplateSearch('');
        setPreviewMode(false);
        setSelectedTemplateId(tempId);
        setDetails({
            name: UNTITLED_TEMPLATE_NAME,
            description: '',
            categoryId: category?.id || '',
            documentType: category?.slug || 'school-document',
            pricing: 'free',
            pricePaise: 0,
            status: 'draft',
            visibility: 'draft',
            isFeatured: false,
        });
        setLayoutConfig(BLANK_LAYOUT);
        setTemplates((current) => [draftTemplate, ...current]);

        try {
            setCreating(true);
            const res = await fetchWithAuth('/api/super-admin/template-studio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: UNTITLED_TEMPLATE_NAME,
                    description: '',
                    categoryId: category?.id || '',
                    documentType: category?.slug || 'school-document',
                    pricing: 'free',
                    pricePaise: 0,
                    visibility: 'draft',
                    status: 'draft',
                    isFeatured: false,
                    layoutConfig: BLANK_LAYOUT,
                    publish: false,
                }),
            });
            if (!res.ok) throw new Error((await res.json())?.error || 'Could not create template');
            const template = await res.json();
            setTemplates((current) => current.map((item) => (item.id === tempId ? template : item)));
            setSelectedTemplateId(template.id);
            toast.success('New untitled template created');
        } catch (error) {
            setTemplates((current) => current.filter((item) => item.id !== tempId));
            setSelectedTemplateId(previousTemplateId || templates[0]?.id || null);
            toast.error(error.message || 'Could not create template');
        } finally {
            setCreating(false);
        }
    };

    const deleteTemplate = async (template) => {
        if (!template?.id) return;
        const confirmed = window.confirm(`Delete "${template.name}"?\n\nPublished templates already used by schools will be hidden instead of permanently deleted.`);
        if (!confirmed) return;
        try {
            setDeletingId(template.id);
            const res = await fetchWithAuth(`/api/super-admin/template-studio/${template.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error((await res.json())?.error || 'Could not delete template');
            const result = await res.json();
            toast.success(result.archived ? 'Template hidden because it already has usage' : 'Template deleted');
            const remaining = templates.filter((item) => item.id !== template.id);
            const nextSelected = selectedTemplateId === template.id ? remaining[0]?.id : selectedTemplateId;
            if (result.archived && result.template) {
                upsertTemplate(result.template);
                setSelectedTemplateId(result.template.id);
            } else {
                setTemplates(remaining);
                setSelectedTemplateId(nextSelected || null);
            }
        } catch (error) {
            toast.error(error.message || 'Could not delete template');
        } finally {
            setDeletingId(null);
        }
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
                body: JSON.stringify({
                    ...details,
                    status: publish ? 'published' : (details.status || selectedTemplate?.status || 'draft'),
                    visibility: publish ? 'published' : details.visibility,
                    layoutConfig: stableLayout,
                    publish,
                }),
            });
            if (!res.ok) throw new Error((await res.json())?.error || 'Save failed');
            const savedTemplate = await res.json();
            toast.success(publish ? 'Template published to marketplace' : 'Draft saved');
            if (savedTemplate?.id) {
                upsertTemplate(savedTemplate);
                setSelectedTemplateId(savedTemplate.id);
            }
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
                                <Button size="icon" variant="outline" onClick={createTemplateDraft} disabled={creating} title="Create new template">
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
                {templatePanelCollapsed ? (
                    <div className="flex flex-col items-center gap-2 p-2">
                        <Button size="icon" variant="outline" onClick={createTemplateDraft} disabled={creating} title="New template">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                ) : (
                    <div className="flex h-[calc(100%-3.5rem)] flex-col">
                        <div className="border-b p-3">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={templateSearch}
                                    onChange={(event) => setTemplateSearch(event.target.value)}
                                    placeholder="Search templates..."
                                    className="h-9 pl-9"
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{templates.length} total templates</span>
                                <span>{filteredTemplates.length} shown</span>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
                            {filteredTemplates.length === 0 ? (
                                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                                    No templates found. Use the plus button to create a draft.
                                </div>
                            ) : filteredTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`group rounded-md border text-sm ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'bg-background hover:bg-muted/40'}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        className="w-full p-3 text-left"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="min-w-0 flex-1 font-medium line-clamp-1">{template.name}</span>
                                            <Badge variant={template.status === 'published' ? 'default' : template.status === 'hidden' ? 'destructive' : 'secondary'}>
                                                {template.status}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{template.category?.name || template.documentType}</p>
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>{template.orientation || 'portrait'} · {template.canvasWidth || 794} x {template.canvasHeight || 1123}</span>
                                            <span>{template.pricing === 'premium' ? 'Premium' : 'Free'}</span>
                                        </div>
                                    </button>
                                    <div className="flex items-center justify-between border-t px-3 py-2">
                                        <span className="text-[11px] text-muted-foreground">
                                            {template.currentVersionNumber ? `v${template.currentVersionNumber}` : 'Draft only'}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => deleteTemplate(template)}
                                            disabled={deletingId === template.id}
                                            title="Delete template"
                                        >
                                            {deletingId === template.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        <Button variant="outline" onClick={() => saveTemplate(false)} disabled={saving || creating}>
                            <Save className="mr-2 h-4 w-4" /> Save Draft
                        </Button>
                        <Button onClick={() => saveTemplate(true)} disabled={saving || creating}>
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
