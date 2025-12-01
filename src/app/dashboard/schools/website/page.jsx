"use client"

import { useState, useEffect } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from "sonner"
import { Loader2, Save, Download, Eye, Monitor, Smartphone, Tablet, Code, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/AuthContext"
import { useSidebar } from "@/components/ui/sidebar"
import { BuilderSidebar } from "./components/BuilderSidebar"
import { BuilderCanvas } from "./components/BuilderCanvas"
import { SectionEditor } from "./components/SectionEditor"
import { LivePreview } from "./components/LivePreview"
import { HeaderFooterEditor } from "./components/HeaderFooterEditor"
import { CustomCssDrawer } from "./components/CustomCssDrawer"
import FileUploadButton from "@/components/fileupload"
import { v4 as uuidv4 } from 'uuid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function ManageWebsitePage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [activeTab, setActiveTab] = useState("editor")
    const [settingsOpen, setSettingsOpen] = useState(false)

    // Builder State
    const [config, setConfig] = useState({
        global: {
            theme: 'modern-white',
            colors: { primary: '#2563eb', secondary: '#1e293b' },
            header: { links: [] },
            customCss: ''
        },
        sections: []
    })
    const [selectedSectionId, setSelectedSectionId] = useState(null)
    const [school, setSchool] = useState(null)

    const { fullUser } = useAuth()
    const { setOpen } = useSidebar()
    const schoolId = fullUser?.schoolId || fullUser?.school?.id

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Auto-close sidebar on mount
        setOpen(false)
    }, [])

    useEffect(() => {
        if (schoolId) {
            fetchWebsiteConfig()
            fetchSchoolDetails()
        }
    }, [schoolId])

    const fetchSchoolDetails = async () => {
        // Fetch basic school info for preview (name, logo)
        // Ideally this should be in context or separate API
        // For now using what we have or mocking
        setSchool({ name: fullUser?.school?.name || "School Name" })
    }

    const fetchWebsiteConfig = async () => {
        if (!schoolId) return
        try {
            const res = await fetch(`/api/schools/website/get?schoolId=${schoolId}`)
            if (!res.ok) throw new Error("Failed to fetch config")
            const data = await res.json()

            // Migrate old config to new structure if needed
            if (data.config && !Array.isArray(data.config.sections)) {
                // Migration logic could go here, or just start fresh/default
                // Let's map old keys to new sections for backward compatibility
                const newSections = []
                if (data.config.hero) newSections.push({ id: uuidv4(), type: 'hero', data: data.config.hero })
                if (data.config.about) newSections.push({ id: uuidv4(), type: 'about', data: data.config.about })
                if (data.config.principal) newSections.push({ id: uuidv4(), type: 'principal', data: data.config.principal })
                if (data.config.contact) newSections.push({ id: uuidv4(), type: 'contact', data: data.config.contact })

                setConfig({
                    global: { ...config.global },
                    sections: newSections
                })
            } else if (data.config) {
                setConfig(data.config)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to load website configuration")
        } finally {
            setLoading(false)
        }
    }

    const handleAddSection = (type) => {
        const newSection = {
            id: uuidv4(),
            type,
            data: { title: `New ${type} Section` },
            settings: {}
        }
        setConfig(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }))
        setSelectedSectionId(newSection.id)
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setConfig((prev) => {
                const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
                const newIndex = prev.sections.findIndex((s) => s.id === over.id);
                return {
                    ...prev,
                    sections: arrayMove(prev.sections, oldIndex, newIndex),
                };
            });
        }
    };

    const handleUpdateSection = (updatedSection) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === updatedSection.id ? updatedSection : s)
        }))
    }

    const handleDeleteSection = (id) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== id)
        }))
        if (selectedSectionId === id) setSelectedSectionId(null)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/schools/website/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...config, schoolId }),
            })
            if (!res.ok) throw new Error("Failed to save")
            toast.success("Website configuration saved!")
        } catch (error) {
            toast.error("Failed to save configuration")
        } finally {
            setSaving(false)
        }
    }

    const handleDownload = async () => {
        setDownloading(true)
        try {
            const res = await fetch(`/api/schools/website/download?schoolId=${schoolId}`)
            if (!res.ok) throw new Error("Failed to generate ZIP")

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "school-website.zip"
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success("Website downloaded successfully!")
        } catch (error) {
            console.error(error)
            toast.error("Failed to download website")
        } finally {
            setDownloading(false)
        }
    }

    const handleGlobalChange = (key, value) => {
        setConfig(prev => ({
            ...prev,
            global: { ...prev.global, [key]: value }
        }))
    }

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>
    }

    const selectedSection = config.sections.find(s => s.id === selectedSectionId)

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Header Toolbar */}
            <div className="h-16 border-b bg-background flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Website Builder</h1>
                    <div className="flex bg-muted rounded-md p-1">
                        <Button variant={activeTab === 'editor' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('editor')}><Monitor className="h-4 w-4 mr-2" /> Editor</Button>
                        <Button variant={activeTab === 'header' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('header')}>Header/Footer</Button>
                        <Button variant={activeTab === 'preview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('preview')}><Eye className="h-4 w-4 mr-2" /> Live Preview</Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-2" /> Global Settings
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Global Settings</DialogTitle>
                                <DialogDescription>Manage global website settings.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>School Logo</Label>
                                    <FileUploadButton
                                        field="School Logo"
                                        onChange={(url) => {
                                            // We might want to update the school profile picture or just a website specific logo
                                            // For now, let's store it in global config
                                            handleGlobalChange('logo', url)
                                        }}
                                    />
                                    {config.global?.logo && (
                                        <img src={config.global.logo} alt="Logo" className="h-16 object-contain" />
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                        {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export ZIP
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden rounded-none">
                {activeTab === 'editor' ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <BuilderSidebar onAddSection={handleAddSection} />
                        <BuilderCanvas
                            sections={config.sections}
                            onSelectSection={(s) => setSelectedSectionId(s.id)}
                            selectedSectionId={selectedSectionId}
                            onDeleteSection={handleDeleteSection}
                        />
                        <SectionEditor
                            section={selectedSection}
                            onChange={handleUpdateSection}
                        />
                    </DndContext>
                ) : activeTab === 'header' ? (
                    <HeaderFooterEditor config={config} onChange={setConfig} />
                ) : (
                    <LivePreview config={config} school={school} />
                )}
            </div>
        </div>
    )
}
