// components/TemplateBuilder.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {Draggable} from '@/app/components/Draggable'
import { v4 as uuidv4 } from 'uuid';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


export default function TemplateBuilder({ layoutConfig, onUpdate, placeholders }) {
  const [elements, setElements] = useState(layoutConfig.elements || []);
  const containerRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );


  const handleDragEnd = (event) => {
    const { active, delta } = event;
    const id = active.id;

    setElements((prev) => {
      return prev.map((el) => {
        if (el.id === id) {
          return {
            ...el,
            x: el.x + delta.x,
            y: el.y + delta.y,
          };
        }
        return el;
      });
    });

    // Update parent
    onUpdate({ elements });
  };

  const addElement = (placeholder) => {
    const newElement = {
      id: uuidv4(),
      text: placeholder,
      x: 50, // Default position
      y: 50,
      fontSize: 16,
      color: '#000',
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    onUpdate({ elements: newElements });
  };

  return (
    <div className="flex gap-4">

      {/* Sidebar for placeholders */}
      <div className="w-48 border p-4">
        <Label>Fields</Label>
        <ul className="space-y-2">
          {placeholders.map((ph) => (
            <li key={ph}>
              <Button variant="outline" onClick={() => addElement(ph)} className="w-full">
                {ph}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Canvas */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          ref={containerRef}
          className="relative w-[800px] h-[600px] border bg-gray-100"
          style={{
            backgroundImage: 'url(/path/to/default-background.png)', // Add your predefined background
            backgroundSize: 'cover',
            overflow: 'hidden',
          }}
        >
          {elements.map((el) => (
            <Draggable key={el.id} id={el.id} style={{ position: 'absolute', left: el.x, top: el.y }}>
              <div
                className="p-2 bg-white border cursor-move"
                style={{ fontSize: `${el.fontSize}px`, color: el.color }}
              >
                {el.text}
              </div>
            </Draggable>
          ))}
        </div>
      </DndContext>
    </div>
  );
}