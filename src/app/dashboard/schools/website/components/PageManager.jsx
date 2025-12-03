import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function PageManager({ pages, activePageId, onSelectPage, onAddPage, onUpdatePage, onDeletePage }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newPageName, setNewPageName] = useState("");
    const [newPageSlug, setNewPageSlug] = useState("");
    const [editingPageId, setEditingPageId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editSlug, setEditSlug] = useState("");

    const handleAdd = () => {
        if (!newPageName || !newPageSlug) return;
        onAddPage({ name: newPageName, slug: newPageSlug.startsWith('/') ? newPageSlug : `/${newPageSlug}` });
        setNewPageName("");
        setNewPageSlug("");
        setIsAdding(false);
    };

    const startEdit = (page) => {
        setEditingPageId(page.id);
        setEditName(page.name);
        setEditSlug(page.slug);
    };

    const saveEdit = () => {
        if (!editName || !editSlug) return;
        onUpdatePage(editingPageId, { name: editName, slug: editSlug.startsWith('/') ? editSlug : `/${editSlug}` });
        setEditingPageId(null);
    };

    return (
        <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between bg-background">
                <h2 className="font-semibold text-sm">Pages</h2>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Page</DialogTitle>
                            <DialogDescription>Create a new page for your website.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Page Name</Label>
                                <Input
                                    placeholder="e.g. About Us"
                                    value={newPageName}
                                    onChange={(e) => setNewPageName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL Slug</Label>
                                <Input
                                    placeholder="e.g. /about"
                                    value={newPageSlug}
                                    onChange={(e) => setNewPageSlug(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button onClick={handleAdd}>Create Page</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {pages.map(page => (
                    <div
                        key={page.id}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${activePageId === page.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                        onClick={() => onSelectPage(page.id)}
                    >
                        <div className="flex-1 truncate">
                            {editingPageId === page.id ? (
                                <div className="space-y-1" onClick={e => e.stopPropagation()}>
                                    <Input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="h-7 text-xs"
                                    />
                                    <Input
                                        value={editSlug}
                                        onChange={e => setEditSlug(e.target.value)}
                                        className="h-7 text-xs"
                                    />
                                    <div className="flex gap-1 mt-1">
                                        <Button size="icon" className="h-6 w-6" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingPageId(null)}><X className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div>{page.name}</div>
                                    <div className="text-xs text-muted-foreground">{page.slug}</div>
                                </div>
                            )}
                        </div>

                        {!editingPageId && (
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); startEdit(page); }}
                                >
                                    <Edit2 className="h-3 w-3" />
                                </Button>
                                {page.slug !== '/' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
