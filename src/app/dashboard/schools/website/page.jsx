"use client"

import React, { useState, useEffect } from 'react';

import { useSidebar } from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Globe, Layout, Palette, Settings, Plus, Monitor, Smartphone, Tablet, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

// Components
import { BuilderSidebar } from './components/BuilderSidebar';
import { BuilderCanvas } from './components/BuilderCanvas';
import { SectionEditor } from './components/SectionEditor';
import { HeaderFooterEditor } from './components/HeaderFooterEditor';
import { CustomCssDrawer } from './components/CustomCssDrawer';
import { PageManager } from './components/PageManager';
import { WebsiteRenderer } from '@/components/website/WebsiteRenderer';
import { useAuth } from '@/context/AuthContext';

export default function ManageWebsitePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState("editor");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState('desktop'); // desktop, tablet, mobile
    const [showLivePreview, setShowLivePreview] = useState(false);

    // Builder State
    const [config, setConfig] = useState({
        global: {
            theme: 'modern-white',
            colors: { primary: '#2563eb', secondary: '#1e293b' },
            header: { links: [] },
            footer: { text: '', links: [] },
            customCss: ''
        },
        pages: [
            {
                id: 'home',
                name: 'Home',
                slug: '/',
                sections: []
            }
        ]
    });

    const [activePageId, setActivePageId] = useState('home');
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [school, setSchool] = useState(null);
    const { fullUser } = useAuth();
    const { setOpen } = useSidebar();
    const schoolId = fullUser?.schoolId || fullUser?.school?.id;

    // Sensors for Drag and Drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Auto-close sidebar on mount
        setOpen(false);
    }, []);

    useEffect(() => {
        if (schoolId) {
            fetchWebsiteConfig();
            fetchSchoolDetails();
        }
    }, [schoolId]);

    const fetchSchoolDetails = async () => {
        setSchool({ name: fullUser?.school?.name || "School Name" });
    };

    const fetchWebsiteConfig = async () => {
        if (!schoolId) return;
        try {
            setLoading(true);
            const response = await fetch(`/api/schools/website/get?schoolId=${schoolId}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.config) {
                    // Ensure pages array exists
                    let loadedConfig = data.config;
                    if (!loadedConfig.pages || loadedConfig.pages.length === 0) {
                        loadedConfig.pages = [{ id: 'home', name: 'Home', slug: '/', sections: loadedConfig.sections || [] }];
                    } else {
                        // Ensure all pages have a 'sections' array
                        loadedConfig.pages = loadedConfig.pages.map(page => ({
                            ...page,
                            sections: page.sections || []
                        }));
                    }
                    setConfig(loadedConfig);
                    if (loadedConfig.pages?.length > 0 && !loadedConfig.pages.find(p => p.id === activePageId)) {
                        setActivePageId(loadedConfig.pages[0].id)
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch website config", error);
            toast.error("Failed to load website configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`/api/schools/website/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...config, schoolId }),
            });

            if (response.ok) {
                toast.success("Website saved successfully");
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save website");
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const response = await fetch(`/api/schools/website/download?schoolId=${schoolId}`);
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "school-website.zip";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Website downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download website");
        } finally {
            setDownloading(false);
        }
    };

    // Page Management
    const handleAddPage = (pageData) => {
        const newPage = { ...pageData, id: uuidv4(), sections: [] };
        setConfig(prev => ({
            ...prev,
            pages: [...(prev.pages || []), newPage]
        }));
        setActivePageId(newPage.id);
        toast.success(`Page ${newPage.name} created`);
    };

    const handleUpdatePage = (pageId, updates) => {
        setConfig(prev => ({
            ...prev,
            pages: prev.pages.map(p => p.id === pageId ? { ...p, ...updates } : p)
        }));
    };

    const handleDeletePage = (pageId) => {
        if (config.pages.length <= 1) {
            toast.error("Cannot delete the last page");
            return;
        }
        if (pageId === 'home') {
            toast.error("Cannot delete home page");
            return;
        }
        setConfig(prev => ({
            ...prev,
            pages: prev.pages.filter(p => p.id !== pageId)
        }));
        if (activePageId === pageId) setActivePageId(config.pages.find(p => p.id !== pageId).id);
        toast.success("Page deleted");
    };

    // Section Management
    const handleAddSection = (type) => {
        const newSection = {
            id: uuidv4(),
            type,
            data: getDefaultDataForType(type),
            customCss: ''
        };

        setConfig(prev => ({
            ...prev,
            pages: prev.pages.map(p => p.id === activePageId ? {
                ...p,
                sections: [...(p.sections || []), newSection]
            } : p)
        }));

        setSelectedSectionId(newSection.id);
        toast.success("Section added");
    };

    const handleUpdateSection = (updatedSection) => {
        setConfig(prev => ({
            ...prev,
            pages: prev.pages.map(p => p.id === activePageId ? {
                ...p,
                sections: p.sections.map(s => s.id === updatedSection.id ? updatedSection : s)
            } : p)
        }));
    };

    const handleDeleteSection = (sectionId) => {
        setConfig(prev => ({
            ...prev,
            pages: prev.pages.map(p => p.id === activePageId ? {
                ...p,
                sections: p.sections.filter(s => s.id !== sectionId)
            } : p)
        }));
        if (selectedSectionId === sectionId) setSelectedSectionId(null);
        toast.success("Section deleted");
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        setConfig((prev) => {
            const activePage = prev.pages.find(p => p.id === activePageId);
            if (!activePage) return prev;

            const oldIndex = activePage.sections.findIndex((s) => s.id === active.id);
            const newIndex = activePage.sections.findIndex((s) => s.id === over.id);

            if (oldIndex === -1 || newIndex === -1) return prev;

            const newSections = arrayMove(activePage.sections, oldIndex, newIndex);

            return {
                ...prev,
                pages: prev.pages.map(p => p.id === activePageId ? { ...p, sections: newSections } : p)
            };
        });
    };

    const handleGlobalChange = (key, value) => {
        setConfig(prev => ({
            ...prev,
            global: { ...prev.global, [key]: value }
        }));
    };

    const getDefaultDataForType = (type) => {
        switch (type) {
            case 'hero': return { title: 'Welcome to Our School', subtitle: 'Nurturing Minds, Building Futures', ctaText: 'Learn More', ctaLink: '/about', bgColor: '#ffffff', textColor: '#000000' };
            case 'about': return { title: 'About Us', content: 'We are dedicated to providing quality education...', bgColor: '#f8f9fa', textColor: '#000000' };
            case 'principal': return { name: 'Dr. Principal', message: 'Welcome to our school website...', bgColor: '#ffffff', textColor: '#000000' };
            case 'contact': return { address: '123 School Lane', phone: '+1 234 567 890', email: 'info@school.edu', bgColor: '#1e293b', textColor: '#ffffff' };
            case 'dynamic_notices': return { title: 'Latest Notices', limit: 3, viewAllLink: '/notices', bgColor: '#f8f9fa', textColor: '#000000' };
            case 'dynamic_gallery': return { title: 'Photo Gallery', limit: 6, viewAllLink: '/gallery', bgColor: '#ffffff', textColor: '#000000' };
            case 'custom_layout': return { rows: [{ id: uuidv4(), columns: [{ id: uuidv4(), width: '100%', widget: { type: 'text', content: 'Custom Content' } }] }] };
            default: return {};
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    const activePage = config.pages?.find(p => p.id === activePageId) || config.pages?.[0];
    const selectedSection = activePage?.sections?.find(s => s.id === selectedSectionId);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header Toolbar */}
            <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold text-lg">Website Builder</h1>
                    <div className="flex items-center bg-muted rounded-md p-1">
                        <Button
                            variant={activeTab === 'editor' && !showLivePreview ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setActiveTab('editor'); setShowLivePreview(false); }}
                            className="h-7 text-xs"
                        >
                            <Layout className="h-3 w-3 mr-1" /> Editor
                        </Button>
                        <Button
                            variant={activeTab === 'pages' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setActiveTab('pages'); setShowLivePreview(false); }}
                            className="h-7 text-xs"
                        >
                            <Globe className="h-3 w-3 mr-1" /> Pages
                        </Button>
                        <Button
                            variant={activeTab === 'theme' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setActiveTab('theme'); setShowLivePreview(false); }}
                            className="h-7 text-xs"
                        >
                            <Palette className="h-3 w-3 mr-1" /> Theme
                        </Button>
                        <Button
                            variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { setActiveTab('settings'); setShowLivePreview(false); }}
                            className="h-7 text-xs"
                        >
                            <Settings className="h-3 w-3 mr-1" /> Settings
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-md p-1 mr-2">
                        <Button variant={previewMode === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setPreviewMode('desktop')}><Monitor className="h-4 w-4" /></Button>
                        <Button variant={previewMode === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setPreviewMode('tablet')}><Tablet className="h-4 w-4 " /></Button>
                        <Button variant={previewMode === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setPreviewMode('mobile')}><Smartphone className="h-4 w-4" /></Button>
                    </div>
                    <Button
                        variant={'outline'}
                        size="sm"
                        className={'dark:text-white '}
                        onClick={() => setShowLivePreview(!showLivePreview)}
                    >
                        {showLivePreview ? <Layout className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showLivePreview ? 'Back to Editor' : 'Preview'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                        <Download className="h-4 w-4 mr-2" /> {downloading ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {activeTab === 'editor' ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex h-full w-full">
                            {/* Left Sidebar - Components (Hidden in Preview) */}
                            {!showLivePreview && (
                                <BuilderSidebar
                                    onAddSection={handleAddSection}
                                    pages={config.pages}
                                    activePageId={activePageId}
                                    onSelectPage={setActivePageId}
                                />
                            )}

                            {/* Center Canvas / Preview */}
                            <div className="flex-1 bg-muted/30 dark:bg-muted/10 overflow-hidden flex flex-col relative">
                                {!showLivePreview && (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur border rounded-full px-4 py-1 text-xs font-medium shadow-sm">
                                        Editing: {activePage?.name} ({activePage?.slug})
                                    </div>
                                )}

                                <div className={`flex-1 overflow-y-auto transition-all duration-300 mx-auto ${previewMode === 'mobile' ? 'w-[375px] my-8 border-x shadow-2xl bg-white' :
                                    previewMode === 'tablet' ? 'w-[768px] my-8 border-x shadow-2xl bg-white' :
                                        'w-full'
                                    }`}>
                                    {showLivePreview ? (
                                        <WebsiteRenderer
                                            config={config}
                                            school={school || {}}
                                            activePage={activePage}
                                            notices={[]}
                                            gallery={[]}
                                        />
                                    ) : (
                                        <BuilderCanvas
                                            sections={activePage?.sections || []}
                                            selectedSectionId={selectedSectionId}
                                            onSelectSection={(s) => setSelectedSectionId(s.id)}
                                            onDeleteSection={handleDeleteSection}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Right Sidebar - Properties (Hidden in Preview) */}
                            {!showLivePreview && (
                                <SectionEditor
                                    section={selectedSection}
                                    onChange={handleUpdateSection}
                                />
                            )}
                        </div>
                    </DndContext>
                ) : activeTab === 'pages' ? (
                    <PageManager
                        pages={config.pages || []}
                        activePageId={activePageId}
                        onSelectPage={setActivePageId}
                        onAddPage={handleAddPage}
                        onUpdatePage={handleUpdatePage}
                        onDeletePage={handleDeletePage}
                    />
                ) : activeTab === 'theme' ? (
                    <div className="flex h-full w-full">
                        <div className="w-80 border-r p-6 space-y-6 bg-background">
                            <div>
                                <h3 className="font-semibold mb-4">Global Colors</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                value={config.global.colors?.primary || '#2563eb'}
                                                onChange={(e) => handleGlobalChange('colors', { ...config.global.colors, primary: e.target.value })}
                                                className="w-12 h-10 p-1"
                                            />
                                            <Input
                                                value={config.global.colors?.primary || '#2563eb'}
                                                onChange={(e) => handleGlobalChange('colors', { ...config.global.colors, primary: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Secondary Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                value={config.global.colors?.secondary || '#1e293b'}
                                                onChange={(e) => handleGlobalChange('colors', { ...config.global.colors, secondary: e.target.value })}
                                                className="w-12 h-10 p-1"
                                            />
                                            <Input
                                                value={config.global.colors?.secondary || '#1e293b'}
                                                onChange={(e) => handleGlobalChange('colors', { ...config.global.colors, secondary: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <CustomCssDrawer
                                css={config.global.customCss || ''}
                                onChange={(css) => handleGlobalChange('customCss', css)}
                            />
                        </div>
                        <div className="flex-1 bg-muted/30 p-8 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Palette className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Theme changes apply globally to all pages</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <HeaderFooterEditor
                        config={config}
                        onChange={setConfig}
                    />
                )}
            </div>
        </div>
    );
}
