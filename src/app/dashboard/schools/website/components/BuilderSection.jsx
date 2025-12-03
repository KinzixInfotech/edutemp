import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuilderSection({ section, isSelected, onSelect, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getSectionPreview = () => {
        const { type, data } = section;

        // Hero Sections
        if (type === 'hero-slider') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Hero Slider • {data.slides?.length || 0} slides</div>
                    {data.slides?.[0] && (
                        <div className="border rounded p-3 bg-muted space-y-1">
                            <div className="font-medium text-sm truncate text-foreground">{data.slides[0].title}</div>
                            <div className="text-xs text-muted-foreground truncate">{data.slides[0].subtitle}</div>
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'hero-simple' || type === 'hero-split') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold capitalize">{type.replace('-', ' ')}</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{data.subtitle}</div>
                    </div>
                </div>
            );
        }

        // Content Sections
        if (type === 'content-image-text') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Image + Text • {data.layout}</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{data.content}</div>
                    </div>
                </div>
            );
        }

        if (type === 'content-cards') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Content Cards • {data.cards?.length || 0} cards • {data.columns} columns</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        {data.subheading && <div className="text-xs text-muted-foreground truncate">{data.subheading}</div>}
                        <div className="grid grid-cols-3 gap-1 mt-2">
                            {data.cards?.slice(0, 3).map((card, i) => (
                                <div key={i} className="bg-background border rounded p-1.5 text-center">
                                    <div className="text-lg">{card.icon}</div>
                                    <div className="text-[10px] font-medium truncate text-foreground">{card.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'content-features') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Features • {data.features?.length || 0} items</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        <div className="grid grid-cols-2 gap-1 mt-2">
                            {data.features?.slice(0, 4).map((feature, i) => (
                                <div key={i} className="bg-background border rounded p-1.5 text-center">
                                    <div className="text-sm">{feature.icon}</div>
                                    <div className="text-[10px] font-medium truncate text-foreground">{feature.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'content-stats') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Statistics • {data.stats?.length || 0} stats</div>
                    <div className="border rounded p-3 bg-primary text-primary-foreground grid grid-cols-4 gap-2 text-center">
                        {data.stats?.map((stat, i) => (
                            <div key={i}>
                                <div className="text-sm font-bold">{stat.number}</div>
                                <div className="text-[10px] opacity-90">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Message Sections
        if (type === 'message-profile') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Profile Message • {data.layout}</div>
                    <div className="border rounded p-3 bg-muted">
                        <div className="flex gap-2 items-start">
                            <div className="w-12 h-12 rounded bg-muted-foreground/20 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate text-foreground">{data.name}</div>
                                <div className="text-xs text-primary truncate">{data.designation}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{data.message}</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'message-quote') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Testimonial</div>
                    <div className="border rounded p-3 bg-muted space-y-2 text-center">
                        <div className="text-xs italic text-muted-foreground line-clamp-2">"{data.quote}"</div>
                        <div className="text-[10px] font-medium text-foreground">— {data.author}</div>
                    </div>
                </div>
            );
        }

        // Media Sections
        if (type === 'gallery-grid' || type === 'gallery-masonry') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">{type === 'gallery-grid' ? 'Gallery Grid' : 'Gallery Masonry'} • {data.images?.length || 0} images</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        <div className={`grid ${type === 'gallery-grid' ? `grid-cols-${Math.min(data.columns || 4, 4)}` : 'grid-cols-3'} gap-1 mt-2`}>
                            {data.images?.slice(0, 6).map((img, i) => (
                                <div key={i} className="aspect-video bg-muted-foreground/20 rounded border" />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'video-section') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Video Section</div>
                    <div className="border rounded p-3 bg-muted space-y-2">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        <div className="aspect-video bg-muted-foreground/20 rounded border flex items-center justify-center">
                            <div className="text-4xl">▶️</div>
                        </div>
                    </div>
                </div>
            );
        }

        // Interactive Sections
        if (type === 'tabs-content') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Tabs • {data.tabs?.length || 0} tabs</div>
                    <div className="border rounded p-3 bg-muted space-y-2">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        <div className="flex gap-1">
                            {data.tabs?.slice(0, 3).map((tab, i) => (
                                <div key={i} className={`text-[10px] px-2 py-1 rounded ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                                    {tab.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'accordion') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Accordion • {data.items?.length || 0} items</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        {data.items?.slice(0, 3).map((item, i) => (
                            <div key={i} className="bg-background border rounded px-2 py-1 text-[10px] flex justify-between">
                                <span className="truncate flex-1 text-foreground">{item.title}</span>
                                <span>▼</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (type === 'timeline') {
            return (
                <div className="space-y-2">
                    <div className="text-xs font-semibold">Timeline • {data.events?.length || 0} events</div>
                    <div className="border rounded p-3 bg-muted space-y-1">
                        <div className="font-medium text-sm truncate text-foreground">{data.heading}</div>
                        {data.events?.slice(0, 3).map((event, i) => (
                            <div key={i} className="flex gap-2">
                                <div className="text-[10px] font-bold text-primary w-12">{event.year}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-medium truncate text-foreground">{event.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Legacy sections
        if (type === 'dynamic_notices') {
            return (
                <div className="space-y-1">
                    <div className="text-xs font-semibold">Dynamic Notices</div>
                    <div className="text-xs text-muted-foreground">Shows latest {data.limit || 3} notices from your notice board</div>
                </div>
            );
        }

        if (type === 'dynamic_gallery') {
            return (
                <div className="space-y-1">
                    <div className="text-xs font-semibold">Dynamic Gallery</div>
                    <div className="text-xs text-muted-foreground">Shows latest {data.limit || 6} images from your media library</div>
                </div>
            );
        }

        if (type === 'custom_layout') {
            return (
                <div className="space-y-1">
                    <div className="text-xs font-semibold">Custom Layout</div>
                    <div className="text-xs text-muted-foreground">{data.rows?.length || 0} rows with custom widgets</div>
                </div>
            );
        }

        // Default preview for legacy sections
        return (
            <div className="space-y-1">
                <div className="text-xs font-semibold capitalize">{type.replace('_', ' ')}</div>
                <div className="text-xs text-muted-foreground truncate">
                    {data.title || data.heading || data.name || data.content || "No preview available"}
                </div>
            </div>
        );
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            <Card
                className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                    isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : ""
                )}
                onClick={onSelect}
            >
                <CardHeader className="p-3 flex flex-row items-center space-y-0 gap-2 border-b">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-xs font-medium flex-1 capitalize text-muted-foreground">
                        {section.type.replace(/-/g, ' ').replace(/_/g, ' ')}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </CardHeader>
                <CardContent className="p-3">
                    {getSectionPreview()}
                </CardContent>
            </Card>
        </div>
    );
}
