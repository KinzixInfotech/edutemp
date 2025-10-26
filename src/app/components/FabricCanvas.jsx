'use client';

import { useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic'; // For SSR safety
import { Canvas, Text, Image } from 'fabric'; // v6 import style

// Dynamic import for any SSR-sensitive parts (optional)
const QRCodeComponent = dynamic(() => import('qrcode.react'), { ssr: false });

export default function FabricCanvas({ layoutJson = {}, onUpdate, placeholders = [], width = 800, height = 600, backgroundImageUrl = null }) {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const debounceRef = useRef(null);

    // Debounced update to prevent rapid re-renders
    const debouncedUpdate = useCallback((config) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onUpdate(config), 300);
    }, [onUpdate]);

    useEffect(() => {
        if (!canvasRef.current || fabricCanvasRef.current) return;

        // Initialize v6 Canvas
        fabricCanvasRef.current = new Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true, // For layering
        });

        // Set background if provided
        if (backgroundImageUrl) {
            fabric.Image.fromURL(backgroundImageUrl, (img) => {
                img.scaleToWidth(width);
                img.scaleToHeight(height);
                fabricCanvasRef.current.setBackgroundImage(img, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
            });
        }

        // Add snap grid (optional, from docs)
        fabricCanvasRef.current.on('object:moving', (e) => {
            const obj = e.target;
            obj.set({
                left: Math.round(obj.left / 10) * 10, // Snap to 10px grid
                top: Math.round(obj.top / 10) * 10,
            });
        });

        // Add initial placeholders as draggable Text objects
        placeholders.forEach((ph, index) => {
            const text = new Text(ph, {
                left: 50 + (index % 3) * 150,
                top: 50 + Math.floor(index / 3) * 80,
                fontSize: 16,
                fill: '#999999',
                editable: true,
                selectable: true,
                evented: true, // Enable drag events
            });
            fabricCanvasRef.current.add(text);
        });

        // Listen for modifications (drag, resize, rotate)
        fabricCanvasRef.current.on('object:modified', () => {
            const config = fabricCanvasRef.current.toJSON(['left', 'top', 'fontSize', 'fill', 'scaleX', 'scaleY', 'angle']); // Full JSON export
            debouncedUpdate(config); // Debounced to avoid loops
        });

        // Load existing layoutJson
        if (layoutJson && Object.keys(layoutJson).length > 0) {
            fabricCanvasRef.current.loadFromJSON(layoutJson, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
        }

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [width, height, backgroundImageUrl, placeholders, debouncedUpdate, layoutJson]);

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm">
            <canvas ref={canvasRef} className="w-full h-[400px] bg-white" />
            <div className="p-2 bg-gray-50 text-xs text-gray-600">
                Drag placeholders to position. Snap to 10px grid enabled.
            </div>
        </div>
    );
}