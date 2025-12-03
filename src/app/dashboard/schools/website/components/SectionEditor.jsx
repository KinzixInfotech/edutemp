import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MoveUp, MoveDown, Image as ImageIcon } from "lucide-react";
import FileUploadButton from "@/components/fileupload";
import { v4 as uuidv4 } from 'uuid';

export function SectionEditor({ section, onChange }) {
    if (!section) {
        return (
            <Card className="h-full w-80 flex-shrink-0 border-l rounded-none">
                <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                    Select a section to edit
                </CardContent>
            </Card>
        );
    }

    const handleChange = (key, value) => {
        onChange({
            ...section,
            data: { ...section.data, [key]: value }
        });
    };

    const handleArrayUpdate = (arrayKey, index, field, value) => {
        const newArray = [...(section.data[arrayKey] || [])];
        newArray[index] = { ...newArray[index], [field]: value };
        handleChange(arrayKey, newArray);
    };

    const handleArrayAdd = (arrayKey, newItem) => {
        const newArray = [...(section.data[arrayKey] || []), newItem];
        handleChange(arrayKey, newArray);
    };

    const handleArrayRemove = (arrayKey, index) => {
        const newArray = (section.data[arrayKey] || []).filter((_, i) => i !== index);
        handleChange(arrayKey, newArray);
    };

    const handleArrayMove = (arrayKey, index, direction) => {
        const newArray = [...(section.data[arrayKey] || [])];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newArray.length) return;
        [newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];
        handleChange(arrayKey, newArray);
    };

    return (
        <Card className="h-full w-96 flex-shrink-0 border-l rounded-none flex flex-col overflow-hidden">
            <CardHeader className="pb-3 pt-2 px-6 z-20 border-b flex-shrink-0">
                <CardTitle className="text-base font-semibold capitalize">
                    {section.type.replace(/-/g, ' ').replace(/_/g, ' ')} Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6 overflow-y-auto flex-1">

                {/* HERO SLIDER */}
                {section.type === 'hero-slider' && (
                    <>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Slides</Label>
                                <Button
                                    onClick={() => handleArrayAdd('slides', {
                                        id: uuidv4(),
                                        image: '',
                                        title: 'New Slide',
                                        subtitle: 'Slide description',
                                        buttonText: 'Learn More',
                                        buttonLink: '#'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Slide
                                </Button>
                            </div>
                            {(section.data.slides || []).map((slide, index) => (
                                <Card key={slide.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Slide {index + 1}</span>
                                            <div className="flex gap-1">
                                                {index > 0 && (
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleArrayMove('slides', index, 'up')}>
                                                        <MoveUp className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {index < (section.data.slides || []).length - 1 && (
                                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleArrayMove('slides', index, 'down')}>
                                                        <MoveDown className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('slides', index)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Image</Label>
                                            <FileUploadButton
                                                field={`Slide ${index + 1} Image`}
                                                onChange={(url) => handleArrayUpdate('slides', index, 'image', url)}
                                            />
                                            {slide.image && <img src={slide.image} alt="Preview" className="w-full h-20 object-cover rounded mt-1" />}
                                        </div>

                                        <div>
                                            <Label className="text-xs">Title</Label>
                                            <Input
                                                value={slide.title || ''}
                                                onChange={(e) => handleArrayUpdate('slides', index, 'title', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Subtitle</Label>
                                            <Input
                                                value={slide.subtitle || ''}
                                                onChange={(e) => handleArrayUpdate('slides', index, 'subtitle', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs">Button Text</Label>
                                                <Input
                                                    value={slide.buttonText || ''}
                                                    onChange={(e) => handleArrayUpdate('slides', index, 'buttonText', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Button Link</Label>
                                                <Input
                                                    value={slide.buttonLink || ''}
                                                    onChange={(e) => handleArrayUpdate('slides', index, 'buttonLink', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Height</Label>
                                <Input
                                    value={section.data.height || '600px'}
                                    onChange={(e) => handleChange('height', e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Autoplay Interval (ms)</Label>
                                <Input
                                    type="number"
                                    value={section.data.interval || 5000}
                                    onChange={(e) => handleChange('interval', parseInt(e.target.value))}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* HERO SIMPLE & SPLIT */}
                {(section.type === 'hero-simple' || section.type === 'hero-split') && (
                    <>
                        <div className="space-y-2">
                            <Label>Background Image</Label>
                            <FileUploadButton
                                field="Hero Image"
                                onChange={(url) => handleChange('image', url)}
                            />
                            {section.data.image && <img src={section.data.image} alt="Preview" className="w-full h-32 object-cover rounded" />}
                        </div>

                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={section.data.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Input
                                value={section.data.subtitle || ''}
                                onChange={(e) => handleChange('subtitle', e.target.value)}
                            />
                        </div>

                        {section.type === 'hero-split' && (
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={section.data.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Button Text</Label>
                                <Input
                                    value={section.data.buttonText || ''}
                                    onChange={(e) => handleChange('buttonText', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Button Link</Label>
                                <Input
                                    value={section.data.buttonLink || ''}
                                    onChange={(e) => handleChange('buttonLink', e.target.value)}
                                />
                            </div>
                        </div>

                        {section.type === 'hero-split' && (
                            <div className="space-y-2">
                                <Label>Image Position</Label>
                                <Select
                                    value={section.data.imagePosition || 'left'}
                                    onValueChange={(value) => handleChange('imagePosition', value)}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </>
                )}

                {/* CONTENT IMAGE TEXT */}
                {section.type === 'content-image-text' && (
                    <>
                        <div className="space-y-2">
                            <Label>Image</Label>
                            <FileUploadButton
                                field="Section Image"
                                onChange={(url) => handleChange('image', url)}
                            />
                            {section.data.image && <img src={section.data.image} alt="Preview" className="w-full h-32 object-cover rounded" />}
                        </div>

                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Content</Label>
                            <Textarea
                                value={section.data.content || ''}
                                onChange={(e) => handleChange('content', e.target.value)}
                                rows={5}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Button Text</Label>
                                <Input
                                    value={section.data.buttonText || ''}
                                    onChange={(e) => handleChange('buttonText', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Button Link</Label>
                                <Input
                                    value={section.data.buttonLink || ''}
                                    onChange={(e) => handleChange('buttonLink', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Layout</Label>
                            <Select
                                value={section.data.layout || 'image-left'}
                                onValueChange={(value) => handleChange('layout', value)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image-left">Image Left</SelectItem>
                                    <SelectItem value="image-right">Image Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* CONTENT CARDS */}
                {section.type === 'content-cards' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Subheading (Optional)</Label>
                            <Input
                                value={section.data.subheading || ''}
                                onChange={(e) => handleChange('subheading', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Columns</Label>
                            <Select
                                value={String(section.data.columns || 3)}
                                onValueChange={(value) => handleChange('columns', parseInt(value))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">2 Columns</SelectItem>
                                    <SelectItem value="3">3 Columns</SelectItem>
                                    <SelectItem value="4">4 Columns</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Cards</Label>
                                <Button
                                    onClick={() => handleArrayAdd('cards', {
                                        id: uuidv4(),
                                        icon: '🎓',
                                        title: 'New Card',
                                        description: 'Card description',
                                        link: '#'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Card
                                </Button>
                            </div>
                            {(section.data.cards || []).map((card, index) => (
                                <Card key={card.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Card {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('cards', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Icon/Emoji</Label>
                                            <Input
                                                value={card.icon || ''}
                                                onChange={(e) => handleArrayUpdate('cards', index, 'icon', e.target.value)}
                                                className="h-8 text-sm"
                                                placeholder="🎓"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Title</Label>
                                            <Input
                                                value={card.title || ''}
                                                onChange={(e) => handleArrayUpdate('cards', index, 'title', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Description</Label>
                                            <Textarea
                                                value={card.description || ''}
                                                onChange={(e) => handleArrayUpdate('cards', index, 'description', e.target.value)}
                                                rows={2}
                                                className="text-sm"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Link (Optional)</Label>
                                            <Input
                                                value={card.link || ''}
                                                onChange={(e) => handleArrayUpdate('cards', index, 'link', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* GALLERY GRID */}
                {(section.type === 'gallery-grid' || section.type === 'gallery-masonry') && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>

                        {section.type === 'gallery-grid' && (
                            <div className="space-y-2">
                                <Label>Columns</Label>
                                <Select
                                    value={String(section.data.columns || 4)}
                                    onValueChange={(value) => handleChange('columns', parseInt(value))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2">2 Columns</SelectItem>
                                        <SelectItem value="3">3 Columns</SelectItem>
                                        <SelectItem value="4">4 Columns</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Images</Label>
                                <Button
                                    onClick={() => handleArrayAdd('images', { id: uuidv4(), url: '', caption: '' })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Image
                                </Button>
                            </div>
                            {(section.data.images || []).map((image, index) => (
                                <Card key={image.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Image {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('images', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <div>
                                            <FileUploadButton
                                                field={`Image ${index + 1}`}
                                                onChange={(url) => handleArrayUpdate('images', index, 'url', url)}
                                            />
                                            {image.url && <img src={image.url} alt="Preview" className="w-full h-20 object-cover rounded mt-1" />}
                                        </div>

                                        <div>
                                            <Label className="text-xs">Caption (Optional)</Label>
                                            <Input
                                                value={image.caption || ''}
                                                onChange={(e) => handleArrayUpdate('images', index, 'caption', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* MESSAGE PROFILE */}
                {section.type === 'message-profile' && (
                    <>
                        <div className="space-y-2">
                            <Label>Profile Image</Label>
                            <FileUploadButton
                                field="Profile Image"
                                onChange={(url) => handleChange('image', url)}
                            />
                            {section.data.image && <img src={section.data.image} alt="Preview" className="w-full h-32 object-cover rounded" />}
                        </div>

                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={section.data.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input
                                value={section.data.designation || ''}
                                onChange={(e) => handleChange('designation', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Heading (Optional)</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                                value={section.data.message || ''}
                                onChange={(e) => handleChange('message', e.target.value)}
                                rows={5}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Layout</Label>
                            <Select
                                value={section.data.layout || 'image-left'}
                                onValueChange={(value) => handleChange('layout', value)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image-left">Image Left</SelectItem>
                                    <SelectItem value="image-right">Image Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* MESSAGE QUOTE */}
                {section.type === 'message-quote' && (
                    <>
                        <div className="space-y-2">
                            <Label>Quote</Label>
                            <Textarea
                                value={section.data.quote || ''}
                                onChange={(e) => handleChange('quote', e.target.value)}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Author Name</Label>
                            <Input
                                value={section.data.author || ''}
                                onChange={(e) => handleChange('author', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Input
                                value={section.data.designation || ''}
                                onChange={(e) => handleChange('designation', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Author Image</Label>
                            <FileUploadButton
                                field="Author Image"
                                onChange={(url) => handleChange('image', url)}
                            />
                            {section.data.image && <img src={section.data.image} alt="Preview" className="w-16 h-16 object-cover rounded-full mt-2" />}
                        </div>
                    </>
                )}

                {/* CONTENT FEATURES */}
                {section.type === 'content-features' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Columns</Label>
                            <Select
                                value={String(section.data.columns || 3)}
                                onValueChange={(value) => handleChange('columns', parseInt(value))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">2 Columns</SelectItem>
                                    <SelectItem value="3">3 Columns</SelectItem>
                                    <SelectItem value="4">4 Columns</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Features</Label>
                                <Button
                                    onClick={() => handleArrayAdd('features', {
                                        id: uuidv4(),
                                        icon: '✨',
                                        title: 'New Feature',
                                        description: 'Feature description'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Feature
                                </Button>
                            </div>
                            {(section.data.features || []).map((feature, index) => (
                                <Card key={feature.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Feature {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('features', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Icon/Emoji</Label>
                                            <Input
                                                value={feature.icon || ''}
                                                onChange={(e) => handleArrayUpdate('features', index, 'icon', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Title</Label>
                                            <Input
                                                value={feature.title || ''}
                                                onChange={(e) => handleArrayUpdate('features', index, 'title', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Description</Label>
                                            <Textarea
                                                value={feature.description || ''}
                                                onChange={(e) => handleArrayUpdate('features', index, 'description', e.target.value)}
                                                rows={2}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* CONTENT STATS */}
                {section.type === 'content-stats' && (
                    <>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Statistics</Label>
                                <Button
                                    onClick={() => handleArrayAdd('stats', {
                                        id: uuidv4(),
                                        number: '100+',
                                        label: 'Label'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Stat
                                </Button>
                            </div>
                            {(section.data.stats || []).map((stat, index) => (
                                <Card key={stat.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Stat {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('stats', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs">Number</Label>
                                                <Input
                                                    value={stat.number || ''}
                                                    onChange={(e) => handleArrayUpdate('stats', index, 'number', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Label</Label>
                                                <Input
                                                    value={stat.label || ''}
                                                    onChange={(e) => handleArrayUpdate('stats', index, 'label', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* VIDEO SECTION */}
                {section.type === 'video-section' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={section.data.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Video URL (Embed Link)</Label>
                            <Input
                                value={section.data.videoUrl || ''}
                                onChange={(e) => handleChange('videoUrl', e.target.value)}
                                placeholder="https://www.youtube.com/embed/..."
                            />
                            <p className="text-xs text-muted-foreground">Make sure to use the embed URL, not the watch URL.</p>
                        </div>
                    </>
                )}

                {/* TABS CONTENT */}
                {section.type === 'tabs-content' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Tabs</Label>
                                <Button
                                    onClick={() => handleArrayAdd('tabs', {
                                        id: uuidv4(),
                                        label: 'New Tab',
                                        content: 'Tab content goes here.'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Tab
                                </Button>
                            </div>
                            {(section.data.tabs || []).map((tab, index) => (
                                <Card key={tab.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Tab {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('tabs', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Label</Label>
                                            <Input
                                                value={tab.label || ''}
                                                onChange={(e) => handleArrayUpdate('tabs', index, 'label', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Content</Label>
                                            <Textarea
                                                value={tab.content || ''}
                                                onChange={(e) => handleArrayUpdate('tabs', index, 'content', e.target.value)}
                                                rows={3}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* ACCORDION */}
                {section.type === 'accordion' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Items</Label>
                                <Button
                                    onClick={() => handleArrayAdd('items', {
                                        id: uuidv4(),
                                        title: 'New Item',
                                        content: 'Content goes here.'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Item
                                </Button>
                            </div>
                            {(section.data.items || []).map((item, index) => (
                                <Card key={item.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Item {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('items', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Title</Label>
                                            <Input
                                                value={item.title || ''}
                                                onChange={(e) => handleArrayUpdate('items', index, 'title', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Content</Label>
                                            <Textarea
                                                value={item.content || ''}
                                                onChange={(e) => handleArrayUpdate('items', index, 'content', e.target.value)}
                                                rows={3}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* TIMELINE */}
                {section.type === 'timeline' && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Events</Label>
                                <Button
                                    onClick={() => handleArrayAdd('events', {
                                        id: uuidv4(),
                                        year: '2024',
                                        title: 'Event Title',
                                        description: 'Event description.'
                                    })}
                                    size="sm"
                                    variant="outline"
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Event
                                </Button>
                            </div>
                            {(section.data.events || []).map((event, index) => (
                                <Card key={event.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium">Event {index + 1}</span>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleArrayRemove('events', index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <Label className="text-xs">Year</Label>
                                                <Input
                                                    value={event.year || ''}
                                                    onChange={(e) => handleArrayUpdate('events', index, 'year', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs">Title</Label>
                                                <Input
                                                    value={event.title || ''}
                                                    onChange={(e) => handleArrayUpdate('events', index, 'title', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Description</Label>
                                            <Textarea
                                                value={event.description || ''}
                                                onChange={(e) => handleArrayUpdate('events', index, 'description', e.target.value)}
                                                rows={2}
                                                className="text-sm"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* DYNAMIC SECTIONS */}
                {(section.type === 'dynamic_notices' || section.type === 'dynamic_gallery') && (
                    <>
                        <div className="space-y-2">
                            <Label>Heading</Label>
                            <Input
                                value={section.data.heading || ''}
                                onChange={(e) => handleChange('heading', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Number of Items to Show</Label>
                            <Input
                                type="number"
                                value={section.data.count || 6}
                                onChange={(e) => handleChange('count', parseInt(e.target.value))}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            This section will automatically pull content from your dashboard's {section.type === 'dynamic_notices' ? 'Noticeboard' : 'Gallery'}.
                        </p>
                    </>
                )}

                {/* COMMON BACKGROUND COLOR */}
                <div className="space-y-2 pt-4 border-t">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                        <Input
                            type="color"
                            value={section.data.backgroundColor || '#ffffff'}
                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            className="w-16 h-10 p-1"
                        />
                        <Input
                            value={section.data.backgroundColor || ''}
                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            placeholder="#ffffff"
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
