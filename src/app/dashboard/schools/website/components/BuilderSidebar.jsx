import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Type, Image, Grid, Menu, Phone } from "lucide-react";

export function BuilderSidebar({ onAddSection }) {
    const sections = [
        { type: 'hero', label: 'Hero Section', icon: LayoutTemplate },
        { type: 'about', label: 'About Section', icon: Type },
        { type: 'features', label: 'Features Grid', icon: Grid },
        { type: 'gallery', label: 'Gallery', icon: Image },
        { type: 'principal', label: 'Principal Message', icon: Type },
        { type: 'contact', label: 'Contact Info', icon: Phone },
    ];

    return (
        <Card className="h-full w-64 flex-shrink-0 border-r rounded-none">
            <CardHeader>
                <CardTitle className="text-lg">Add Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
