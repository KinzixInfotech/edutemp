import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from "@/components/ui/card";
import { BuilderSection } from './BuilderSection';

export function BuilderCanvas({ sections, onSelectSection, selectedSectionId, onDeleteSection }) {
    const { setNodeRef } = useDroppable({
        id: 'canvas',
    });

    return (
        <div
            ref={setNodeRef}
            className="flex-1 overflow-y-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]"
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}
        >
            <div
                className="max-w-4xl mx-auto min-h-[500px] space-y-4"
            >
                <SortableContext
                    items={sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {sections.map((section) => (
                        <BuilderSection
                            key={section.id}
                            section={section}
                            isSelected={selectedSectionId === section.id}
                            onSelect={() => onSelectSection(section)}
                            onDelete={() => onDeleteSection(section.id)}
                        />
                    ))}
                    {sections.length === 0 && (
                        <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                            Drag and drop sections here or click to add
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
