import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LayoutTemplate, Type, Image, Grid, Menu, Phone, Bell, Layout,
    Layers, FileText, Users, Award, MessageSquare, Calendar,
    Video, List, ChevronDown, BarChart3, Sparkles
} from "lucide-react";

export function BuilderSidebar({ onAddSection, pages, activePageId, onSelectPage }) {
    const sectionCategories = [
        {
            category: 'Hero Sections',
            sections: [
                { type: 'hero-slider', label: 'Hero Slider', icon: Layers },
                { type: 'hero-simple', label: 'Simple Hero', icon: LayoutTemplate },
                { type: 'hero-split', label: 'Split Hero', icon: Layout },
            ]
        },
        {
            category: 'Content Sections',
            sections: [
                { type: 'content-image-text', label: 'Image + Text', icon: FileText },
                { type: 'content-cards', label: 'Content Cards', icon: Grid },
                { type: 'content-features', label: 'Features', icon: Sparkles },
                { type: 'content-stats', label: 'Statistics', icon: BarChart3 },
            ]
        },
        {
            category: 'Message Sections',
            sections: [
                { type: 'message-profile', label: 'Profile Message', icon: Users },
                { type: 'message-quote', label: 'Testimonial', icon: MessageSquare },
            ]
        },
        {
            category: 'Media Sections',
            sections: [
                { type: 'gallery-grid', label: 'Gallery Grid', icon: Image },
                { type: 'gallery-masonry', label: 'Gallery Masonry', icon: Layout },
                { type: 'video-section', label: 'Video Section', icon: Video },
            ]
        },
        {
            category: 'Interactive Sections',
            sections: [
                { type: 'tabs-content', label: 'Tabs', icon: Menu },
                { type: 'accordion', label: 'Accordion', icon: List },
                { type: 'timeline', label: 'Timeline', icon: Calendar },
            ]
        },
        {
            category: 'Dynamic Sections',
            sections: [
                { type: 'dynamic_notices', label: 'Dynamic Notices', icon: Bell },
                { type: 'dynamic_gallery', label: 'Dynamic Gallery', icon: Image },
            ]
        },
        {
            category: 'Legacy',
            sections: [
                { type: 'hero', label: 'Hero (Old)', icon: LayoutTemplate },
                { type: 'about', label: 'About (Old)', icon: Type },
                { type: 'features', label: 'Features (Old)', icon: Grid },
                { type: 'gallery', label: 'Gallery (Old)', icon: Image },
                { type: 'principal', label: 'Principal (Old)', icon: Type },
                { type: 'contact', label: 'Contact (Old)', icon: Phone },
            ]
        }
    ];

    return (
        <Card className="h-full w-64 flex-shrink-0 border-r rounded-none flex flex-col">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg mb-2">Page</CardTitle>
                <select
                    className="w-full p-2 border rounded-md text-sm bg-background"
                    value={activePageId}
                    onChange={(e) => onSelectPage(e.target.value)}
                >
                    {pages?.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
                    ))}
                </select>
            </CardHeader>
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 pb-6">
                {sectionCategories.map((category, idx) => (
                    <div key={category.category}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {category.category}
                        </p>
                        <div className="space-y-1">
                            {category.sections.map((section) => (
                                <Button
                                    key={section.type}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-9"
                                    onClick={() => onAddSection(section.type)}
                                >
                                    <section.icon className="h-3.5 w-3.5" />
                                    <span className="text-xs">{section.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
