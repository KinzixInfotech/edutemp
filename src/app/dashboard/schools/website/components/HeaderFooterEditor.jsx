import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploadButton from "@/components/fileupload";

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

    const handleLogoChange = (url) => {
        onChange({
            ...config,
            global: {
                ...config.global,
                logo: url
            }
        });
    };

    const handleAddLink = () => {
        const links = config.global?.header?.links || [];
        handleHeaderChange('links', [...links, {
            id: Date.now().toString(),
            label: 'New Link',
            url: '#',
            target: 'section',
            submenu: []
        }]);
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

    const handleAddSubmenu = (linkIndex) => {
        const links = [...(config.global?.header?.links || [])];
        const submenu = links[linkIndex].submenu || [];
        links[linkIndex].submenu = [...submenu, {
            id: Date.now().toString(),
            label: 'Submenu Item',
            url: '#',
            target: 'page'
        }];
        handleHeaderChange('links', links);
    };

    const handleUpdateSubmenu = (linkIndex, submenuIndex, key, value) => {
        const links = [...(config.global?.header?.links || [])];
        const submenu = [...(links[linkIndex].submenu || [])];
        submenu[submenuIndex] = { ...submenu[submenuIndex], [key]: value };
        links[linkIndex].submenu = submenu;
        handleHeaderChange('links', links);
    };

    const handleDeleteSubmenu = (linkIndex, submenuIndex) => {
        const links = [...(config.global?.header?.links || [])];
        const submenu = [...(links[linkIndex].submenu || [])];
        submenu.splice(submenuIndex, 1);
        links[linkIndex].submenu = submenu;
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
                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <Label>School Logo</Label>
                            <FileUploadButton
                                field="School Logo"
                                onChange={handleLogoChange}
                            />
                            {(config.global?.logo || config.school?.profilePicture) && (
                                <div className="mt-2">
                                    <img
                                        src={config.global?.logo || config.school?.profilePicture}
                                        alt="Logo Preview"
                                        className="h-16 w-auto object-contain border rounded p-2"
                                    />
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">Recommended: PNG/SVG with transparent background, 200x60px</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                            {/* Header Style */}
                            <div className="space-y-2">
                                <Label>Header Style</Label>
                                <Select
                                    value={config.global?.header?.style || 'sticky'}
                                    onValueChange={(value) => handleHeaderChange('style', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sticky">Sticky (Stays on scroll)</SelectItem>
                                        <SelectItem value="static">Static (Normal)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="text-base font-semibold">Call-to-Action Button (Optional)</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm">Button Text</Label>
                                    <Input
                                        value={config.global?.header?.ctaText || ''}
                                        onChange={(e) => handleHeaderChange('ctaText', e.target.value)}
                                        placeholder="e.g., Admissions Open"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">Button Link</Label>
                                    <Input
                                        value={config.global?.header?.ctaLink || ''}
                                        onChange={(e) => handleHeaderChange('ctaLink', e.target.value)}
                                        placeholder="/admissions"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Menu Links */}
                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Navigation Links</Label>
                                <Button size="sm" onClick={handleAddLink}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Link
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {(config.global?.header?.links || []).map((link, index) => (
                                    <Card key={link.id || index} className="bg-muted/30">
                                        <CardContent className="p-4 space-y-3">
                                            {/* Main Link */}
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
                                                        <SelectItem value="section">Anchor Link</SelectItem>
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
                                                    <Input
                                                        placeholder="#section-id"
                                                        value={link.url || ''}
                                                        onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                                                        className="col-span-2"
                                                    />
                                                ) : (
                                                    <Input
                                                        placeholder="https://example.com"
                                                        value={link.url || ''}
                                                        onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                                                        className="col-span-2"
                                                    />
                                                )}
                                            </div>

                                            {/* Submenu Section */}
                                            <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm text-muted-foreground">Submenu Items</Label>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAddSubmenu(index)}
                                                        className="h-7 text-xs"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Add Submenu
                                                    </Button>
                                                </div>
                                                {(link.submenu || []).map((submenuItem, submenuIndex) => (
                                                    <div key={submenuItem.id || submenuIndex} className="flex gap-2 items-start pl-2">
                                                        <ChevronRight className="h-4 w-4 mt-2 text-muted-foreground flex-shrink-0" />
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    placeholder="Submenu label"
                                                                    value={submenuItem.label || ''}
                                                                    onChange={(e) => handleUpdateSubmenu(index, submenuIndex, 'label', e.target.value)}
                                                                    className="flex-1 h-8 text-sm"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleDeleteSubmenu(index, submenuIndex)}
                                                                >
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            </div>
                                                            <Input
                                                                placeholder="Link URL"
                                                                value={submenuItem.url || ''}
                                                                onChange={(e) => handleUpdateSubmenu(index, submenuIndex, 'url', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!link.submenu || link.submenu.length === 0) && (
                                                    <p className="text-xs text-muted-foreground pl-2">No submenu items</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
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
