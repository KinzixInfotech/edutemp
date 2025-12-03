import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Type, Image, Grid, Menu, Phone, Bell, Layout } from "lucide-react";

export function BuilderSidebar({ onAddSection, pages, activePageId, onSelectPage }) {
    const sections = [
        { type: 'hero', label: 'Hero Section', icon: LayoutTemplate },
        { type: 'about', label: 'About Section', icon: Type },
        { type: 'features', label: 'Features Grid', icon: Grid },
        { type: 'gallery', label: 'Gallery', icon: Image },
        { type: 'principal', label: 'Principal Message', icon: Type },
        { type: 'contact', label: 'Contact Info', icon: Phone },
        { type: 'dynamic_notices', label: 'Dynamic Notices', icon: Bell },
        { type: 'dynamic_gallery', label: 'Dynamic Gallery', icon: Image },
        { type: 'custom_layout', label: 'Custom Layout', icon: Layout },
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
            <CardContent className="space-y-2 overflow-y-auto flex-1">
                {sections.map((section) => (
                    <Button
                        key={section.type}
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => onAddSection(section.type)}
                    >
                        <section.icon className="h-4 w-4" />
                        {section.label}
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}
