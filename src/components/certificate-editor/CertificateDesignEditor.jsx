'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { QRCodeSVG } from 'qrcode.react';
import {
    Type,
    Image as ImageIcon,
    QrCode,
    Square,
    Trash2,
    Move,
    Copy,
    Layers,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    Underline
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const ELEMENT_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    QRCODE: 'qrcode',
    SHAPE: 'shape',
};

const DEFAULT_ELEMENTS = {
    [ELEMENT_TYPES.TEXT]: {
        type: ELEMENT_TYPES.TEXT,
        content: 'Double click to edit',
        width: 200,
        height: 40,
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
    },
    [ELEMENT_TYPES.IMAGE]: {
        type: ELEMENT_TYPES.IMAGE,
        url: '', // Placeholder or upload
        width: 100,
        height: 100,
        opacity: 1,
        borderRadius: 0,
    },
    [ELEMENT_TYPES.QRCODE]: {
        type: ELEMENT_TYPES.QRCODE,
        content: '{{verificationUrl}}', // Default dynamic content
        width: 100,
        height: 100,
        color: '#000000',
        backgroundColor: '#ffffff',
    },
    [ELEMENT_TYPES.SHAPE]: {
        type: ELEMENT_TYPES.SHAPE,
        shapeType: 'rectangle', // rectangle, circle, line
        width: 100,
        height: 100,
        backgroundColor: '#e2e8f0',
        borderColor: '#000000',
        borderWidth: 1,
        borderRadius: 0,
    },
};

export default function CertificateDesignEditor({
    initialConfig = {},
    onChange,
    templateType = 'certificate', // certificate, idcard, admitcard
    placeholders = []
}) {
    const [elements, setElements] = useState(initialConfig.elements || []);
    const [selectedId, setSelectedId] = useState(null);
    const [canvasSize, setCanvasSize] = useState(initialConfig.canvasSize || { width: 800, height: 600 });
    const [backgroundImage, setBackgroundImage] = useState(initialConfig.backgroundImage || '');
    const containerRef = useRef(null);

    // Update parent on change
    useEffect(() => {
        onChange?.({
            elements,
            canvasSize,
            backgroundImage
        });
    }, [elements, canvasSize, backgroundImage, onChange]);

    const addElement = (type) => {
        const newElement = {
            id: `${type}-${Date.now()}`,
            x: 50,
            y: 50,
            zIndex: elements.length + 1,
            ...DEFAULT_ELEMENTS[type],
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    const updateElement = (id, updates) => {
        setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const removeElement = (id) => {
        setElements(elements.filter(el => el.id !== id));
        setSelectedId(null);
    };

    const duplicateElement = (id) => {
        const element = elements.find(el => el.id === id);
        if (!element) return;

        const newElement = {
            ...element,
            id: `${element.type}-${Date.now()}`,
            x: element.x + 20,
            y: element.y + 20,
            zIndex: elements.length + 1,
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
    };

    const handleDragStop = (id, d) => {
        updateElement(id, { x: d.x, y: d.y });
    };

    const handleResizeStop = (id, ref, position) => {
        updateElement(id, {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height)
        });
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <div className="flex h-[calc(100vh-100px)] border rounded-lg overflow-hidden bg-background">
            {/* Sidebar Tools */}
            <div className="w-16 border-r flex flex-col items-center py-4 gap-4 bg-muted/20">
                <ToolButton icon={Type} label="Text" onClick={() => addElement(ELEMENT_TYPES.TEXT)} />
                <ToolButton icon={ImageIcon} label="Image" onClick={() => addElement(ELEMENT_TYPES.IMAGE)} />
                <ToolButton icon={QrCode} label="QR Code" onClick={() => addElement(ELEMENT_TYPES.QRCODE)} />
                <ToolButton icon={Square} label="Shape" onClick={() => addElement(ELEMENT_TYPES.SHAPE)} />
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-muted/50 relative overflow-auto flex items-start justify-center py-8 px-8">
                <div
                    ref={containerRef}
                    className="bg-white shadow-lg relative transition-all"
                    style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                    onClick={(e) => {
                        if (e.target === containerRef.current) setSelectedId(null);
                    }}
                >
                    {elements.map((el) => (
                        <Rnd
                            key={el.id}
                            size={{ width: el.width, height: el.height }}
                            position={{ x: el.x, y: el.y }}
                            onDragStop={(e, d) => handleDragStop(el.id, d)}
                            onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(el.id, ref, position)}
                            bounds="parent"
                            onClick={() => setSelectedId(el.id)}
                            className={cn(
                                "border-2 border-transparent hover:border-blue-300 transition-colors",
                                selectedId === el.id && "border-blue-500 z-50"
                            )}
                            style={{ zIndex: el.zIndex }}
                        >
                            <ElementRenderer element={el} />
                        </Rnd>
                    ))}
                </div>
            </div>

            {/* Properties Panel */}
            <div className="w-80 border-l bg-background flex flex-col">
                <Tabs defaultValue="properties" className="w-full flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start rounded-none border-b px-4 h-12 flex-shrink-0">
                        <TabsTrigger value="properties">Properties</TabsTrigger>
                        <TabsTrigger value="layers">Layers</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                                {selectedElement ? (
                                    <PropertiesEditor
                                        element={selectedElement}
                                        onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                                        onDelete={() => removeElement(selectedElement.id)}
                                        onDuplicate={() => duplicateElement(selectedElement.id)}
                                        placeholders={placeholders}
                                    />
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        Select an element to edit properties
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
                        <LayersPanel
                            elements={elements}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onReorder={setElements}
                        />
                    </TabsContent>

                    <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Canvas Size</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Width</Label>
                                            <Input
                                                type="number"
                                                value={canvasSize.width}
                                                onChange={(e) => setCanvasSize({ ...canvasSize, width: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Height</Label>
                                            <Input
                                                type="number"
                                                value={canvasSize.height}
                                                onChange={(e) => setCanvasSize({ ...canvasSize, height: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Background Image URL</Label>
                                    <Input
                                        value={backgroundImage}
                                        onChange={(e) => setBackgroundImage(e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function ToolButton({ icon: Icon, label, onClick }) {
    return (
        <Button variant="ghost" size="icon" className="h-12 w-12 flex flex-col gap-1 rounded-lg" onClick={onClick} title={label}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
        </Button>
    );
}

function ElementRenderer({ element }) {
    const style = {
        width: '100%',
        height: '100%',
        ...getElementStyle(element)
    };

    switch (element.type) {
        case ELEMENT_TYPES.TEXT:
            return (
                <div style={style} className="flex items-center overflow-hidden">
                    {element.content}
                </div>
            );
        case ELEMENT_TYPES.IMAGE:
            return (
                <div style={style} className="overflow-hidden">
                    {element.url ? (
                        <img src={element.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                        </div>
                    )}
                </div>
            );
        case ELEMENT_TYPES.QRCODE:
            return (
                <div style={style} className="flex items-center justify-center bg-white">
                    <QRCodeSVG
                        value={element.content}
                        size={Math.min(element.width, element.height)}
                        fgColor={element.color}
                        bgColor={element.backgroundColor}
                    />
                </div>
            );
        case ELEMENT_TYPES.SHAPE:
            return <div style={style} />;
        default:
            return null;
    }
}

function getElementStyle(element) {
    const base = {
        opacity: element.opacity,
    };

    switch (element.type) {
        case ELEMENT_TYPES.TEXT:
            return {
                ...base,
                fontSize: `${element.fontSize}px`,
                fontFamily: element.fontFamily,
                fontWeight: element.fontWeight,
                fontStyle: element.fontStyle,
                textDecoration: element.textDecoration,
                textAlign: element.textAlign,
                color: element.color,
                backgroundColor: element.backgroundColor,
            };
        case ELEMENT_TYPES.SHAPE:
            return {
                ...base,
                backgroundColor: element.backgroundColor,
                borderWidth: `${element.borderWidth}px`,
                borderColor: element.borderColor,
                borderStyle: 'solid',
                borderRadius: element.shapeType === 'circle' ? '50%' : `${element.borderRadius}px`,
            };
        default:
            return base;
    }
}

function PropertiesEditor({ element, onUpdate, onDelete, onDuplicate, placeholders }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium capitalize">{element.type} Properties</h3>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicate">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Common Position & Size */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs">X</Label>
                    <Input type="number" value={Math.round(element.x)} onChange={(e) => onUpdate({ x: parseInt(e.target.value) })} />
                </div>
                <div>
                    <Label className="text-xs">Y</Label>
                    <Input type="number" value={Math.round(element.y)} onChange={(e) => onUpdate({ y: parseInt(e.target.value) })} />
                </div>
                <div>
                    <Label className="text-xs">Width</Label>
                    <Input type="number" value={Math.round(element.width)} onChange={(e) => onUpdate({ width: parseInt(e.target.value) })} />
                </div>
                <div>
                    <Label className="text-xs">Height</Label>
                    <Input type="number" value={Math.round(element.height)} onChange={(e) => onUpdate({ height: parseInt(e.target.value) })} />
                </div>
            </div>

            {/* Type Specific Properties */}
            {element.type === ELEMENT_TYPES.TEXT && (
                <>
                    <div className="space-y-2">
                        <Label>Content / Placeholder</Label>
                        <Select
                            value={element.content.replace(/[{}]/g, '')}
                            onValueChange={(value) => onUpdate({ content: `{{${value}}}` })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a placeholder or type custom text" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_custom_">Custom Text...</SelectItem>
                                {placeholders.map(ph => (
                                    <SelectItem key={ph.value} value={ph.value}>
                                        {ph.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {element.content !== `{{${element.content.replace(/[{}]/g, '')}}}` && (
                            <Input
                                value={element.content}
                                onChange={(e) => onUpdate({ content: e.target.value })}
                                placeholder="Enter custom text"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            Use placeholders for dynamic data or enter custom text
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Font Size</Label>
                        <Slider
                            value={[element.fontSize]}
                            min={8}
                            max={100}
                            step={1}
                            onValueChange={([val]) => onUpdate({ fontSize: val })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={element.fontWeight === 'bold' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={element.fontStyle === 'italic' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={element.textDecoration === 'underline' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}
                        >
                            <Underline className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={element.textAlign === 'left' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ textAlign: 'left' })}
                        >
                            <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={element.textAlign === 'center' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ textAlign: 'center' })}
                        >
                            <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={element.textAlign === 'right' ? 'secondary' : 'outline'}
                            size="icon"
                            onClick={() => onUpdate({ textAlign: 'right' })}
                        >
                            <AlignRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            <Input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="w-12 p-1 h-8" />
                            <Input value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="flex-1 h-8" />
                        </div>
                    </div>
                </>
            )}

            {element.type === ELEMENT_TYPES.IMAGE && (
                <>
                    <div className="space-y-2">
                        <Label>Image Source</Label>
                        <Select
                            value={element.url?.replace(/[{}]/g, '') || ''}
                            onValueChange={(value) => onUpdate({ url: value === '_custom_' ? '' : `{{${value}}}` })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select image source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_custom_">Custom URL...</SelectItem>
                                {placeholders.filter(ph => ph.value.toLowerCase().includes('photo') || ph.value.toLowerCase().includes('image') || ph.value.toLowerCase().includes('signature')).map(ph => (
                                    <SelectItem key={ph.value} value={ph.value}>
                                        {ph.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {element.url !== `{{${element.url?.replace(/[{}]/g, '')}}}` && (
                            <Input
                                value={element.url || ''}
                                onChange={(e) => onUpdate({ url: e.target.value })}
                                placeholder="Enter image URL"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            Select a dynamic field or enter a custom image URL
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Opacity</Label>
                        <Slider
                            value={[element.opacity * 100]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([val]) => onUpdate({ opacity: val / 100 })}
                        />
                    </div>
                </>
            )}

            {element.type === ELEMENT_TYPES.QRCODE && (
                <div className="space-y-2">
                    <Label>Content</Label>
                    <Input value={element.content} onChange={(e) => onUpdate({ content: e.target.value })} />
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <Input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="w-full h-8" />
                    </div>
                    <div className="space-y-2">
                        <Label>Background Color</Label>
                        <Input type="color" value={element.backgroundColor} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} className="w-full h-8" />
                    </div>
                </div>
            )}

            {element.type === ELEMENT_TYPES.SHAPE && (
                <>
                    <div className="space-y-2">
                        <Label>Shape Type</Label>
                        <Select value={element.shapeType} onValueChange={(val) => onUpdate({ shapeType: val })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rectangle">Rectangle</SelectItem>
                                <SelectItem value="circle">Circle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Background Color</Label>
                        <Input type="color" value={element.backgroundColor} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} className="w-full h-8" />
                    </div>
                    <div className="space-y-2">
                        <Label>Border Color</Label>
                        <Input type="color" value={element.borderColor} onChange={(e) => onUpdate({ borderColor: e.target.value })} className="w-full h-8" />
                    </div>
                    <div className="space-y-2">
                        <Label>Border Width</Label>
                        <Slider
                            value={[element.borderWidth]}
                            min={0}
                            max={20}
                            step={1}
                            onValueChange={([val]) => onUpdate({ borderWidth: val })}
                        />
                    </div>
                    {element.shapeType !== 'circle' && (
                        <div className="space-y-2">
                            <Label>Border Radius</Label>
                            <Slider
                                value={[element.borderRadius]}
                                min={0}
                                max={100}
                                step={1}
                                onValueChange={([val]) => onUpdate({ borderRadius: val })}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function LayersPanel({ elements, selectedId, onSelect, onReorder }) {
    // Sort by zIndex descending for display
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    const getElementLabel = (el) => {
        if (el.type === ELEMENT_TYPES.TEXT) {
            const content = el.content || 'Text';
            // Truncate very long text for better display
            return content.length > 50 ? content.substring(0, 50) + '...' : content;
        }
        return el.id || el.type;
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
                {sortedElements.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                        No elements yet
                    </div>
                ) : (
                    sortedElements.map((el) => {
                        const label = getElementLabel(el);
                        const fullLabel = el.type === ELEMENT_TYPES.TEXT ? (el.content || 'Text') : (el.id || el.type);
                        return (
                            <div
                                key={el.id}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted transition-colors overflow-hidden",
                                    selectedId === el.id && "bg-blue-50 border-blue-200 dark:bg-blue-950"
                                )}
                                onClick={() => onSelect(el.id)}
                                title={fullLabel}
                            >
                                <div className="flex-shrink-0">
                                    {el.type === ELEMENT_TYPES.TEXT && <Type className="h-4 w-4 text-muted-foreground" />}
                                    {el.type === ELEMENT_TYPES.IMAGE && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                                    {el.type === ELEMENT_TYPES.QRCODE && <QrCode className="h-4 w-4 text-muted-foreground" />}
                                    {el.type === ELEMENT_TYPES.SHAPE && <Square className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <span className="text-sm truncate flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                    {label}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">z:{el.zIndex}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </ScrollArea>
    );
}
