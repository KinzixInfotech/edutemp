import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function HeaderFooterEditor({ config, onChange }) {
    const handleHeaderChange = (key, value) => {
        onChange({
            ...config,
            global: {
                ...config.global,
                header: { ...config.global.header, [key]: value }
            }
        });
    };

    const handleAddLink = () => {
        const links = config.global?.header?.links || [];
        handleHeaderChange('links', [...links, { label: 'New Link', url: '#', target: 'section' }]);
    };

    const handleUpdateLink = (index, key, value) => {
        const links = [...(config.global?.header?.links || [])];
        links[index] = { ...links[index], [key]: value };
        handleHeaderChange('links', links);
    };

    const handleDeleteLink = (index) => {
        const links = [...(config.global?.header?.links || [])];
        links.splice(index, 1);
        handleHeaderChange('links', links);
    };

    const handleFooterChange = (key, value) => {
        onChange({
            ...config,
            global: {
                ...config.global,
                footer: { ...config.global.footer, [key]: value }
            }
        });
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background">
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                {/* Header Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Header Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Header Alignment */}
                            <div className="space-y-2">
                                <Label>Menu Alignment</Label>
                                <Select
                                    value={config.global?.header?.menuAlign || 'right'}
                                    onValueChange={(value) => handleHeaderChange('menuAlign', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Background Color */}
                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={config.global?.header?.bgColor || '#ffffff'}
                                        onChange={(e) => handleHeaderChange('bgColor', e.target.value)}
                                        className="w-16 h-10 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={config.global?.header?.bgColor || ''}
                                        onChange={(e) => handleHeaderChange('bgColor', e.target.value)}
                                        placeholder="#ffffff"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Menu Links */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Navigation Links</Label>
                                <Button size="sm" onClick={handleAddLink}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Link
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {(config.global?.header?.links || []).map((link, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Link Label (e.g., Home, About)"
                                                value={link.label || ''}
                                                onChange={(e) => handleUpdateLink(index, 'label', e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDeleteLink(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Select
                                                value={link.target || 'page'}
                                                onValueChange={(value) => handleUpdateLink(index, 'target', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="page">Link to Page</SelectItem>
                                                    <SelectItem value="section">Link to Section (Anchor)</SelectItem>
                                                    <SelectItem value="url">Custom URL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {link.target === 'page' ? (
                                                <Select
                                                    value={link.url || ''}
                                                    onValueChange={(value) => handleUpdateLink(index, 'url', value)}
                                                    className="col-span-2"
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a page..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {config.pages?.length > 0 ? (
                                                            config.pages.map(p => (
                                                                <SelectItem key={p.id} value={p.slug}>
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="" disabled>No pages created</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            ) : link.target === 'section' ? (
                                                <Select
                                                    value={link.url || ''}
                                                    onValueChange={(value) => handleUpdateLink(index, 'url', value)}
                                                    className="col-span-2"
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a section..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {config.pages?.map(page => (
                                                            page.sections.map(s => (
                                                                <SelectItem key={s.id} value={`${page.slug === '/' ? '' : page.slug}#${s.type}`}>
                                                                    {page.name} - {s.data.title || s.type}
                                                                </SelectItem>
                                                            ))
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    placeholder="https://example.com"
                                                    value={link.url || ''}
                                                    onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                                                    className="col-span-2"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(config.global?.header?.links || []).length === 0 && (
                                    <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-lg">
                                        No links added yet. Click "Add Link" to create navigation menu items.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Footer Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Footer Text */}
                        <div className="space-y-2">
                            <Label>Footer Text</Label>
                            <Input
                                value={config.global?.footer?.text || ''}
                                onChange={(e) => handleFooterChange('text', e.target.value)}
                                placeholder="© 2025 School Name. All rights reserved."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Footer Alignment */}
                            <div className="space-y-2">
                                <Label>Text Alignment</Label>
                                <Select
                                    value={config.global?.footer?.textAlign || 'center'}
                                    onValueChange={(value) => handleFooterChange('textAlign', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Center</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Background Color */}
                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={config.global?.footer?.bgColor || '#0f172a'}
                                        onChange={(e) => handleFooterChange('bgColor', e.target.value)}
                                        className="w-16 h-10 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={config.global?.footer?.bgColor || ''}
                                        onChange={(e) => handleFooterChange('bgColor', e.target.value)}
                                        placeholder="#0f172a"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
