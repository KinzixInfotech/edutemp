// components/Draggable.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useDraggable } from '@dnd-kit/core';

export function Draggable({ id, children, style }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const combinedStyle = {
    ...style,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={combinedStyle} {...listeners} {...attributes}>
      {children}
    </div>
  );
}