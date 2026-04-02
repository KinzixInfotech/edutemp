'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { QRCodeSVG } from 'qrcode.react';
import {
    Type,
    Image as ImageIcon,
    QrCode,
    Square,
    Table as TableIcon,
    Trash2,
    Move,
    Copy,
    Layers,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignHorizontalDistributeCenter,
    AlignVerticalDistributeCenter,
    Bold,
    Italic,
    Underline,
    Undo2,
    Redo2,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    ChevronUp,
    ChevronDown,
    Paintbrush,
    Upload,
    Search,
    Minus,
    Plus,
    RotateCcw,
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
import { PLACEHOLDER_CATEGORIES, ALL_PLACEHOLDERS, IMAGE_PLACEHOLDERS } from '@/lib/placeholder-docs';
import { uploadFilesToR2 } from '@/hooks/useR2Upload';
import { toast } from 'sonner';

const FONT_LIST = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana',
    'Trebuchet MS', 'Palatino', 'Garamond', 'Comic Sans MS',
    'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato',
    'Playfair Display', 'Merriweather', 'Nunito', 'Raleway', 'Outfit',
    'Source Sans Pro', 'Ubuntu', 'Oswald', 'Quicksand',
];

const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato',
    'Playfair Display', 'Merriweather', 'Nunito', 'Raleway', 'Outfit',
    'Source Sans Pro', 'Ubuntu', 'Oswald', 'Quicksand',
];

const PAGE_PRESETS = [
    { label: 'A4 Landscape', width: 1123, height: 794 },
    { label: 'A4 Portrait', width: 794, height: 1123 },
    { label: 'Letter Landscape', width: 1056, height: 816 },
    { label: 'Letter Portrait', width: 816, height: 1056 },
    { label: 'ID Card', width: 638, height: 1011 },
    { label: 'Custom', width: 0, height: 0 },
];

const MAX_HISTORY = 50;

const ELEMENT_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    QRCODE: 'qrcode',
    SHAPE: 'shape',
    TABLE: 'table',
};

const DEFAULT_ELEMENTS = {
    [ELEMENT_TYPES.TEXT]: {
        type: ELEMENT_TYPES.TEXT,
        content: 'Double click to edit',
        width: 200,
        height: 40,
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        backgroundColor: 'transparent',
        lineHeight: 1.4,
        letterSpacing: 0,
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
    [ELEMENT_TYPES.TABLE]: {
        type: ELEMENT_TYPES.TABLE,
        width: 600,
        height: 200,
        columns: [
            { key: 'date', label: 'Date', placeholder: '{{exam_date}}', width: 150 },
            { key: 'subject', label: 'Subject', placeholder: '{{exam_subject_name}}', width: 200 },
            { key: 'time', label: 'Time', placeholder: '{{exam_time}}', width: 150 },
            { key: 'marks', label: 'Max Marks', placeholder: '{{exam_max_marks}}', width: 100 },
        ],
        rowHeight: 30,
        headerBackgroundColor: '#e0f2fe',
        rowBackgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        fontSize: 12,
        headerFontWeight: 'bold',
        textAlign: 'center',
        dataSource: 'exam_subjects', // Special key to populate from exam subjects
    },
};

const MemoizedRndElement = React.memo(({
    el,
    isSelected,
    readOnly,
    callbacksRef,
    resizeHandleStyles,
    noResizeHandles
}) => {
    return (
        <Rnd
            key={el.id}
            size={{ width: el.width, height: el.height }}
            position={{ x: el.x, y: el.y }}
            bounds="parent"
            onDrag={!readOnly && !el.locked ? (e, d) => callbacksRef.current.handleDrag(el.id, d) : undefined}
            onDragStop={!readOnly && !el.locked ? (e, d) => callbacksRef.current.handleDragStop(el.id, d) : undefined}
            onResizeStop={!readOnly && !el.locked ? (e, direction, ref, delta, position) => callbacksRef.current.handleResizeStop(el.id, ref, position) : undefined}
            onClick={!readOnly ? () => callbacksRef.current.setSelectedId(el.id) : undefined}
            disableDragging={readOnly || el.locked}
            enableResizing={!readOnly && !el.locked && isSelected}
            resizeHandleStyles={isSelected ? resizeHandleStyles : noResizeHandles}
            className={cn(
                "transition-opacity",
                !readOnly && !isSelected && "hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-300",
                isSelected && "outline outline-2 outline-blue-500",
                el.locked && "opacity-90"
            )}
            style={{ zIndex: isSelected ? 9998 : el.zIndex, pointerEvents: readOnly ? 'none' : 'auto' }}
        >
            <ElementRenderer element={el} />
        </Rnd>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.el === nextProps.el &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.readOnly === nextProps.readOnly &&
        prevProps.resizeHandleStyles === nextProps.resizeHandleStyles
    );
});

const DebouncedColorPicker = ({ value, onChange, className, title }) => {
    const [localColor, setLocalColor] = useState(value || '#000000');
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        setLocalColor(value || '#000000');
    }, [value]);

    useEffect(() => {
        if (localColor === value) return;
        const timer = setTimeout(() => {
            onChangeRef.current(localColor);
        }, 100);
        return () => clearTimeout(timer);
    }, [localColor, value]);

    return (
        <Input
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            className={className}
            title={title}
        />
    );
};

export default function CertificateDesignEditor({
    initialConfig = {},
    onChange,
    templateType = 'certificate', // certificate, idcard, admitcard
    placeholders = [],
    readOnly = false
}) {
    const safeConfig = initialConfig || {};
    const [elements, setElements] = useState(safeConfig.elements || []);
    const [selectedId, setSelectedId] = useState(null);
    const [canvasSize, setCanvasSize] = useState(safeConfig.canvasSize || { width: 800, height: 600 });
    const [backgroundImage, setBackgroundImage] = useState(safeConfig.backgroundImage || '');
    const [backgroundColor, setBackgroundColor] = useState(safeConfig.backgroundColor || '#ffffff');
    const [customFonts, setCustomFonts] = useState(safeConfig.customFonts || []);
    const containerRef = useRef(null);
    const canvasAreaRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const onChangeRef = useRef(onChange);
    const [canvasScale, setCanvasScale] = useState(1);
    const guideXRef = useRef(null);
    const guideYRef = useRef(null);
    const SNAP_THRESHOLD = 6;
    onChangeRef.current = onChange;

    const callbacksRef = useRef({ handleDrag: () => { }, handleDragStop: () => { }, handleResizeStop: () => { }, setSelectedId: () => { } });

    // Undo/Redo history
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoRedoRef = useRef(false);

    // Push state to history whenever elements change (not from undo/redo)
    useEffect(() => {
        if (isUndoRedoRef.current) { isUndoRedoRef.current = false; return; }
        if (!isInitialized) return;
        const timer = setTimeout(() => {
            setHistory(prev => {
                const currentStr = JSON.stringify(elements);
                const lastItem = prev[historyIndex];
                if (lastItem && JSON.stringify(lastItem) === currentStr) return prev;

                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(JSON.parse(currentStr));
                if (newHistory.length > MAX_HISTORY) newHistory.shift();
                return newHistory;
            });
            setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
        }, 300);

        return () => clearTimeout(timer);
    }, [elements, isInitialized]);

    const undo = useCallback(() => {
        if (historyIndex <= 0) return;
        isUndoRedoRef.current = true;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;
        isUndoRedoRef.current = true;
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }, [historyIndex, history]);

    // Load Google Fonts
    useEffect(() => {
        const link = document.getElementById('google-fonts-cert-editor');
        if (!link) {
            const el = document.createElement('link');
            el.id = 'google-fonts-cert-editor';
            el.rel = 'stylesheet';
            el.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`).join('&')}&display=swap`;
            document.head.appendChild(el);
        }
    }, []);

    // Load custom fonts from R2
    useEffect(() => {
        customFonts.forEach(font => {
            if (!document.getElementById(`custom-font-${font.name}`)) {
                const style = document.createElement('style');
                style.id = `custom-font-${font.name}`;
                style.textContent = `@font-face { font-family: '${font.name}'; src: url('${font.url}') format('${font.format || 'truetype'}'); }`;
                document.head.appendChild(style);
            }
        });
    }, [customFonts]);

    // Keyboard shortcuts
    useEffect(() => {
        if (readOnly) return;
        const handler = (e) => {
            // Delete/Backspace to remove selected element
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                removeElement(selectedId);
            }
            // Ctrl+Z / Cmd+Z = Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                redo();
            }
            // Ctrl+D = Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
                e.preventDefault();
                duplicateElement(selectedId);
            }
            // Arrow keys = Nudge
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const nudge = e.shiftKey ? 10 : 1;
                const updates = {};
                if (e.key === 'ArrowUp') updates.y = (elements.find(el => el.id === selectedId)?.y || 0) - nudge;
                if (e.key === 'ArrowDown') updates.y = (elements.find(el => el.id === selectedId)?.y || 0) + nudge;
                if (e.key === 'ArrowLeft') updates.x = (elements.find(el => el.id === selectedId)?.x || 0) - nudge;
                if (e.key === 'ArrowRight') updates.x = (elements.find(el => el.id === selectedId)?.x || 0) + nudge;
                updateElement(selectedId, updates);
            }
            // Escape = Deselect
            if (e.key === 'Escape') setSelectedId(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, selectedId, elements, undo, redo]);

    // Update state when initialConfig changes
    useEffect(() => {
        if (initialConfig && !isInitialized && !readOnly) {
            if (initialConfig.elements) setElements(initialConfig.elements);
            if (initialConfig.canvasSize) setCanvasSize(initialConfig.canvasSize);
            if (initialConfig.backgroundImage !== undefined) setBackgroundImage(initialConfig.backgroundImage);
            if (initialConfig.backgroundColor) setBackgroundColor(initialConfig.backgroundColor);
            if (initialConfig.customFonts) setCustomFonts(initialConfig.customFonts);
            setIsInitialized(true);
        }
        // For readOnly mode, always sync with initialConfig
        if (readOnly && initialConfig) {
            setElements(initialConfig.elements || []);
            setCanvasSize(initialConfig.canvasSize || { width: 800, height: 600 });
            setBackgroundImage(initialConfig.backgroundImage || '');
            setBackgroundColor(initialConfig.backgroundColor || '#ffffff');
        }
    }, [initialConfig, readOnly, isInitialized]);

    // Update parent on change - only in edit mode
    useEffect(() => {
        if (!readOnly && isInitialized) {
            const timer = setTimeout(() => {
                onChangeRef.current?.({
                    elements,
                    canvasSize,
                    backgroundImage,
                    backgroundColor,
                    customFonts,
                });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [elements, canvasSize, backgroundImage, backgroundColor, customFonts, readOnly, isInitialized]);

    // Auto-scale canvas to fit the available area (edit mode only)
    useEffect(() => {
        if (readOnly) { setCanvasScale(1); return; }
        const area = canvasAreaRef.current;
        if (!area) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const availableW = entry.contentRect.width - 64; // account for padding
                const availableH = entry.contentRect.height - 64;
                const scaleW = availableW / canvasSize.width;
                const scaleH = availableH / canvasSize.height;
                const scale = Math.min(scaleW, scaleH, 1); // never scale up
                setCanvasScale(Math.max(scale, 0.3));
            }
        });
        observer.observe(area);
        return () => observer.disconnect();
    }, [canvasSize, readOnly]);

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

    // Find the single closest snap per axis — no React state, pure DOM
    const findSnap = useCallback((dragId, x, y, w, h) => {
        const cw = canvasSize.width;
        const ch = canvasSize.height;

        // Candidate vertical lines (x positions) on the canvas
        const xTargets = [0, cw / 2, cw];
        // Candidate horizontal lines (y positions) on the canvas
        const yTargets = [0, ch / 2, ch];

        // Add other element edges/centers
        elements.forEach(el => {
            if (el.id === dragId) return;
            xTargets.push(el.x, el.x + el.width / 2, el.x + el.width);
            yTargets.push(el.y, el.y + el.height / 2, el.y + el.height);
        });

        // Element edges: left, centerX, right
        const myXEdges = [x, x + w / 2, x + w];
        const myYEdges = [y, y + h / 2, y + h];

        let bestX = null, bestXDist = SNAP_THRESHOLD + 1, bestXOffset = 0;
        let bestY = null, bestYDist = SNAP_THRESHOLD + 1, bestYOffset = 0;

        for (const t of xTargets) {
            for (const edge of myXEdges) {
                const dist = Math.abs(edge - t);
                if (dist < bestXDist) {
                    bestXDist = dist;
                    bestX = t;
                    bestXOffset = t - edge;
                }
            }
        }
        for (const t of yTargets) {
            for (const edge of myYEdges) {
                const dist = Math.abs(edge - t);
                if (dist < bestYDist) {
                    bestYDist = dist;
                    bestY = t;
                    bestYOffset = t - edge;
                }
            }
        }

        const snappedX = bestXDist <= SNAP_THRESHOLD ? x + bestXOffset : x;
        const snappedY = bestYDist <= SNAP_THRESHOLD ? y + bestYOffset : y;
        const showX = bestXDist <= SNAP_THRESHOLD ? bestX : null;
        const showY = bestYDist <= SNAP_THRESHOLD ? bestY : null;

        return { snappedX, snappedY, showX, showY };
    }, [canvasSize, elements]);

    // Direct DOM manipulation — no setState, zero lag
    const showGuides = useCallback((showX, showY) => {
        if (guideXRef.current) {
            guideXRef.current.style.display = showX !== null ? 'block' : 'none';
            if (showX !== null) guideXRef.current.style.left = `${showX}px`;
        }
        if (guideYRef.current) {
            guideYRef.current.style.display = showY !== null ? 'block' : 'none';
            if (showY !== null) guideYRef.current.style.top = `${showY}px`;
        }
    }, []);

    const hideGuides = useCallback(() => {
        if (guideXRef.current) guideXRef.current.style.display = 'none';
        if (guideYRef.current) guideYRef.current.style.display = 'none';
    }, []);

    const handleDrag = useCallback((id, d) => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        const { showX, showY } = findSnap(id, d.x, d.y, el.width, el.height);
        showGuides(showX, showY);
    }, [elements, findSnap, showGuides]);

    const handleDragStop = (id, d) => {
        const el = elements.find(e => e.id === id);
        if (!el) { updateElement(id, { x: d.x, y: d.y }); hideGuides(); return; }
        if (el.locked) { hideGuides(); return; }
        const { snappedX, snappedY } = findSnap(id, d.x, d.y, el.width, el.height);
        // Clamp within canvas bounds
        const clampedX = Math.max(0, Math.min(snappedX, canvasSize.width - el.width));
        const clampedY = Math.max(0, Math.min(snappedY, canvasSize.height - el.height));
        updateElement(id, { x: clampedX, y: clampedY });
        hideGuides();
    };

    const handleResizeStop = (id, ref, position) => {
        const newWidth = parseInt(ref.style.width);
        const newHeight = parseInt(ref.style.height);
        // Clamp size and position within canvas
        const clampedW = Math.min(newWidth, canvasSize.width);
        const clampedH = Math.min(newHeight, canvasSize.height);
        updateElement(id, {
            width: clampedW,
            height: clampedH,
        });
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    // Keep callbacks fresh for memoized children
    useEffect(() => {
        callbacksRef.current = {
            handleDrag,
            handleDragStop,
            handleResizeStop,
            setSelectedId
        };
    }, [handleDrag, handleDragStop, handleResizeStop, setSelectedId]);

    // Canvas alignment helpers
    const alignElement = (alignment) => {
        if (!selectedElement) return;
        const updates = {};
        switch (alignment) {
            case 'left': updates.x = 0; break;
            case 'center-h': updates.x = Math.round((canvasSize.width - selectedElement.width) / 2); break;
            case 'right': updates.x = canvasSize.width - selectedElement.width; break;
            case 'top': updates.y = 0; break;
            case 'center-v': updates.y = Math.round((canvasSize.height - selectedElement.height) / 2); break;
            case 'bottom': updates.y = canvasSize.height - selectedElement.height; break;
        }
        updateElement(selectedElement.id, updates);
    };

    // Custom font upload handler
    const handleCustomFontUpload = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ttf,.woff,.woff2,.otf';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const fontName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
                const format = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : file.name.endsWith('.otf') ? 'opentype' : 'truetype';
                const res = await uploadFilesToR2('fonts', { files: [file] });
                if (res && res[0]?.url) {
                    setCustomFonts(prev => [...prev, { name: fontName, url: res[0].url, format }]);
                    toast.success(`Font "${fontName}" uploaded!`);
                }
            } catch (err) {
                toast.error('Failed to upload font');
            }
        };
        input.click();
    };

    // All available fonts (built-in + custom)
    const allFonts = [...FONT_LIST, ...customFonts.map(f => f.name)];

    // Canva-style resize handle styling
    const resizeHandleStyles = {
        topLeft: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', top: -5, left: -5, cursor: 'nw-resize' },
        topRight: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', top: -5, right: -5, cursor: 'ne-resize' },
        bottomLeft: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', bottom: -5, left: -5, cursor: 'sw-resize' },
        bottomRight: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', bottom: -5, right: -5, cursor: 'se-resize' },
        top: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', top: -5, left: '50%', marginLeft: -5, cursor: 'n-resize' },
        bottom: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', bottom: -5, left: '50%', marginLeft: -5, cursor: 's-resize' },
        left: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', top: '50%', left: -5, marginTop: -5, cursor: 'w-resize' },
        right: { width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', top: '50%', right: -5, marginTop: -5, cursor: 'e-resize' },
    };
    const noResizeHandles = { top: { display: 'none' }, right: { display: 'none' }, bottom: { display: 'none' }, left: { display: 'none' }, topRight: { display: 'none' }, bottomRight: { display: 'none' }, bottomLeft: { display: 'none' }, topLeft: { display: 'none' } };

    return (
        <div className={cn("flex flex-col border overflow-hidden bg-background", readOnly ? "h-auto border-none" : "h-[calc(100vh-64px)]")}>
            {/* ── Canva-style Contextual Top Toolbar ── */}
            {!readOnly && (
                <div className="h-11 border-b bg-background flex items-center px-3 gap-1.5 flex-shrink-0 overflow-x-auto">
                    {/* Undo / Redo */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
                        <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)">
                        <Redo2 className="h-4 w-4" />
                    </Button>
                    <div className="h-5 w-px bg-border mx-1" />

                    {!selectedElement ? (
                        /* ── Canvas toolbar (nothing selected) ── */
                        <>
                            {/* Page Preset */}
                            <Select
                                value={PAGE_PRESETS.find(p => p.width === canvasSize.width && p.height === canvasSize.height)?.label || 'Custom'}
                                onValueChange={(label) => {
                                    const preset = PAGE_PRESETS.find(p => p.label === label);
                                    if (preset && preset.width > 0) setCanvasSize({ width: preset.width, height: preset.height });
                                }}
                            >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_PRESETS.map(p => (
                                        <SelectItem key={p.label} value={p.label} disabled={p.width === 0}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Orientation flip */}
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Swap Orientation" onClick={() => setCanvasSize({ width: canvasSize.height, height: canvasSize.width })}>
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <div className="h-5 w-px bg-border mx-1" />
                            {/* Background Color */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">BG</span>
                                <Input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    className="w-8 h-8 p-0.5 cursor-pointer rounded border"
                                    title="Background Color"
                                />
                            </div>
                            <div className="h-5 w-px bg-border mx-1" />
                            {/* Background Image */}
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*';
                                input.onchange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setBackgroundImage(ev.target.result); reader.readAsDataURL(file); } };
                                input.click();
                            }}>
                                <ImageIcon className="h-3.5 w-3.5 mr-1" /> BG Image
                            </Button>
                            {backgroundImage && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setBackgroundImage('')}>Clear BG</Button>
                            )}
                            {/* Custom dimensions */}
                            <div className="h-5 w-px bg-border mx-1" />
                            <div className="flex items-center gap-1">
                                <Input type="number" value={canvasSize.width} onChange={(e) => setCanvasSize(s => ({ ...s, width: parseInt(e.target.value) || 100 }))} className="h-8 w-16 text-xs" title="Width" />
                                <span className="text-xs text-muted-foreground">×</span>
                                <Input type="number" value={canvasSize.height} onChange={(e) => setCanvasSize(s => ({ ...s, height: parseInt(e.target.value) || 100 }))} className="h-8 w-16 text-xs" title="Height" />
                            </div>
                        </>
                    ) : selectedElement.type === ELEMENT_TYPES.TEXT ? (
                        /* ── Text toolbar ── */
                        <>
                            <Select value={selectedElement.fontFamily} onValueChange={(v) => updateElement(selectedElement.id, { fontFamily: v })}>
                                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {allFonts.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                                    <Separator className="my-1" />
                                    <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={handleCustomFontUpload}>
                                        <Upload className="h-3 w-3 mr-1" /> Upload Font
                                    </Button>
                                </SelectContent>
                            </Select>
                            <Input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 12 })} className="h-8 w-14 text-xs" />
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <Button variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold className="h-3.5 w-3.5" /></Button>
                            <Button variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic className="h-3.5 w-3.5" /></Button>
                            <Button variant={selectedElement.textDecoration === 'underline' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}><Underline className="h-3.5 w-3.5" /></Button>
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <Button variant={selectedElement.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })}><AlignLeft className="h-3.5 w-3.5" /></Button>
                            <Button variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })}><AlignCenter className="h-3.5 w-3.5" /></Button>
                            <Button variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })}><AlignRight className="h-3.5 w-3.5" /></Button>
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <DebouncedColorPicker value={selectedElement.color} onChange={(val) => updateElement(selectedElement.id, { color: val })} className="w-8 h-8 p-0.5 cursor-pointer rounded" title="Text Color" />
                            {/* Canvas alignment */}
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-h')} title="Center Horizontally"><AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-v')} title="Center Vertically"><AlignVerticalDistributeCenter className="h-3.5 w-3.5" /></Button>
                        </>
                    ) : selectedElement.type === ELEMENT_TYPES.SHAPE ? (
                        /* ── Shape toolbar ── */
                        <>
                            <Select value={selectedElement.shapeType} onValueChange={(v) => updateElement(selectedElement.id, { shapeType: v })}>
                                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rectangle">Rectangle</SelectItem>
                                    <SelectItem value="circle">Circle</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Fill</span><DebouncedColorPicker value={selectedElement.backgroundColor} onChange={(val) => updateElement(selectedElement.id, { backgroundColor: val })} className="w-8 h-8 p-0.5 cursor-pointer rounded" /></div>
                            <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">Border</span><DebouncedColorPicker value={selectedElement.borderColor} onChange={(val) => updateElement(selectedElement.id, { borderColor: val })} className="w-8 h-8 p-0.5 cursor-pointer rounded" /></div>
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-h')} title="Center Horizontally"><AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-v')} title="Center Vertically"><AlignVerticalDistributeCenter className="h-3.5 w-3.5" /></Button>
                        </>
                    ) : (
                        /* ── Generic toolbar (image/qr/table) ── */
                        <>
                            <span className="text-xs text-muted-foreground capitalize">{selectedElement.type} selected</span>
                            <div className="h-5 w-px bg-border mx-0.5" />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-h')} title="Center Horizontally"><AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alignElement('center-v')} title="Center Vertically"><AlignVerticalDistributeCenter className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate (Ctrl+D)"><Copy className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeElement(selectedElement.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                    )}

                    {/* Element actions — always present when something is selected */}
                    {selectedElement && (
                        <>
                            <div className="ml-auto" />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} title={selectedElement.locked ? 'Unlock' : 'Lock'}>
                                {selectedElement.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateElement(selectedElement.id)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeElement(selectedElement.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                    )}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Tools */}
                {!readOnly && (
                    <div className="w-16 border-r flex flex-col items-center py-4 gap-4 bg-muted/20">
                        <ToolButton icon={Type} label="Text" onClick={() => addElement(ELEMENT_TYPES.TEXT)} />
                        <ToolButton icon={ImageIcon} label="Image" onClick={() => addElement(ELEMENT_TYPES.IMAGE)} />
                        <ToolButton icon={QrCode} label="QR Code" onClick={() => addElement(ELEMENT_TYPES.QRCODE)} />
                        <ToolButton icon={Square} label="Shape" onClick={() => addElement(ELEMENT_TYPES.SHAPE)} />
                        <ToolButton icon={TableIcon} label="Table" onClick={() => addElement(ELEMENT_TYPES.TABLE)} />
                    </div>
                )}

                {/* Main Canvas Area */}
                <div ref={canvasAreaRef} className={cn("flex-1 min-w-0 bg-[#f5f5f5] dark:bg-muted/50 relative overflow-auto flex items-start justify-center py-8 px-8", readOnly && "bg-transparent p-0 overflow-visible")}>
                    {/* Sizing wrapper */}
                    <div style={!readOnly ? { width: canvasSize.width * canvasScale, height: canvasSize.height * canvasScale, flexShrink: 0 } : undefined}>
                        <div
                            ref={containerRef}
                            className={cn("shadow-lg relative", readOnly && "shadow-none")}
                            style={{
                                width: canvasSize.width,
                                height: canvasSize.height,
                                backgroundColor: backgroundColor,
                                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                transform: readOnly ? 'scale(1)' : `scale(${canvasScale})`,
                                transformOrigin: 'top left',
                                overflow: 'hidden',
                            }}
                            onClick={(e) => {
                                if (!readOnly && e.target === containerRef.current) setSelectedId(null);
                            }}
                        >
                            {/* Alignment guide lines */}
                            {!readOnly && (
                                <>
                                    <div ref={guideXRef} style={{ display: 'none', position: 'absolute', top: 0, width: 1, height: '100%', background: '#3b82f6', opacity: 0.8, zIndex: 9999, pointerEvents: 'none' }} />
                                    <div ref={guideYRef} style={{ display: 'none', position: 'absolute', left: 0, height: 1, width: '100%', background: '#3b82f6', opacity: 0.8, zIndex: 9999, pointerEvents: 'none' }} />
                                </>
                            )}
                            {elements.map((el) => {
                                const isSelected = selectedId === el.id && !readOnly;
                                return (
                                    <MemoizedRndElement
                                        key={el.id}
                                        el={el}
                                        isSelected={isSelected}
                                        readOnly={readOnly}
                                        callbacksRef={callbacksRef}
                                        resizeHandleStyles={resizeHandleStyles}
                                        noResizeHandles={noResizeHandles}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Properties Panel */}
                {!readOnly && (
                    <div className="w-80 border-l bg-background flex flex-col min-h-0 overflow-hidden">
                        <Tabs defaultValue="properties" className="w-full flex-1 flex flex-col min-h-0">
                            <TabsList className="w-full justify-start rounded-none border-b px-4 h-12 flex-shrink-0">
                                <TabsTrigger value="properties">Properties</TabsTrigger>
                                <TabsTrigger value="layers">Layers</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                            </TabsList>

                            <TabsContent value="properties" className="flex-1 m-0 overflow-hidden min-h-0">
                                <ScrollArea className="h-full" style={{ height: 'calc(100vh - 100px - 48px - 48px)' }}>
                                    <div className="p-4 space-y-4">
                                        {selectedElement ? (
                                            <PropertiesEditor
                                                element={selectedElement}
                                                onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                                                onDelete={() => removeElement(selectedElement.id)}
                                                onDuplicate={() => duplicateElement(selectedElement.id)}
                                                placeholders={placeholders}
                                                allFonts={allFonts}
                                                onCustomFontUpload={handleCustomFontUpload}
                                            />
                                        ) : (
                                            <div className="text-center text-muted-foreground py-8">
                                                Select an element to edit properties
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="layers" className="flex-1 m-0 overflow-hidden min-h-0">
                                <div className="h-full overflow-hidden">
                                    <LayersPanel
                                        elements={elements}
                                        selectedId={selectedId}
                                        onSelect={setSelectedId}
                                        onReorder={setElements}
                                        onToggleLock={(id) => {
                                            const el = elements.find(e => e.id === id);
                                            if (el) updateElement(id, { locked: !el.locked });
                                        }}
                                        onToggleVisible={(id) => {
                                            const el = elements.find(e => e.id === id);
                                            if (el) updateElement(id, { hidden: !el.hidden });
                                        }}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="p-4 space-y-4">
                                        {/* Page Size Presets */}
                                        <div className="space-y-2">
                                            <Label>Page Preset</Label>
                                            <Select
                                                value={PAGE_PRESETS.find(p => p.width === canvasSize.width && p.height === canvasSize.height)?.label || 'Custom'}
                                                onValueChange={(label) => {
                                                    const preset = PAGE_PRESETS.find(p => p.label === label);
                                                    if (preset && preset.width > 0) setCanvasSize({ width: preset.width, height: preset.height });
                                                }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {PAGE_PRESETS.map(p => (
                                                        <SelectItem key={p.label} value={p.label} disabled={p.width === 0}>{p.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Custom Dimensions */}
                                        <div className="space-y-2">
                                            <Label>Canvas Size</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Width</Label>
                                                    <Input type="number" value={canvasSize.width} onChange={(e) => setCanvasSize({ ...canvasSize, width: parseInt(e.target.value) || 100 })} />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Height</Label>
                                                    <Input type="number" value={canvasSize.height} onChange={(e) => setCanvasSize({ ...canvasSize, height: parseInt(e.target.value) || 100 })} />
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => setCanvasSize({ width: canvasSize.height, height: canvasSize.width })}>
                                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Swap Orientation
                                            </Button>
                                        </div>
                                        <Separator />
                                        {/* Background Color */}
                                        <div className="space-y-2">
                                            <Label>Background Color</Label>
                                            <div className="flex gap-2">
                                                <DebouncedColorPicker value={backgroundColor} onChange={(val) => setBackgroundColor(val)} className="w-12 h-9 p-0.5 cursor-pointer" />
                                                <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1" placeholder="#ffffff" />
                                            </div>
                                        </div>
                                        {/* Background Image */}
                                        <div className="space-y-2">
                                            <Label>Background Image</Label>
                                            <Input
                                                value={backgroundImage}
                                                onChange={(e) => setBackgroundImage(e.target.value)}
                                                placeholder="Paste image URL..."
                                            />
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file'; input.accept = 'image/*';
                                                    input.onchange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setBackgroundImage(ev.target.result); reader.readAsDataURL(file); } };
                                                    input.click();
                                                }}>
                                                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Upload Image
                                                </Button>
                                                {backgroundImage && (
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setBackgroundImage('')}>Clear</Button>
                                                )}
                                            </div>
                                            {backgroundImage && (
                                                <img src={backgroundImage} alt="Background" className="w-full h-20 object-cover rounded border mt-1" />
                                            )}
                                        </div>
                                        <Separator />
                                        {/* Custom Fonts */}
                                        <div className="space-y-2">
                                            <Label>Custom Fonts</Label>
                                            <Button variant="outline" size="sm" className="w-full" onClick={handleCustomFontUpload}>
                                                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Font (.ttf, .woff2)
                                            </Button>
                                            {customFonts.length > 0 && (
                                                <div className="space-y-1">
                                                    {customFonts.map((f, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                                            <span style={{ fontFamily: f.name }}>{f.name}</span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCustomFonts(prev => prev.filter((_, idx) => idx !== i))}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Separator />
                                        {/* Available Placeholders Reference */}
                                        <div className="space-y-2">
                                            <Label>Available Placeholders</Label>
                                            <p className="text-xs text-muted-foreground">Use these in text elements: {"{{placeholder_name}}"}</p>
                                            {PLACEHOLDER_CATEGORIES.map(cat => (
                                                <div key={cat.id} className="space-y-1">
                                                    <p className="text-xs font-semibold text-muted-foreground">{cat.label}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {cat.placeholders.filter(p => p.type === 'text').map(ph => (
                                                            <span key={ph.value} className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 transition-colors" title={ph.description}
                                                                onClick={() => { navigator.clipboard.writeText(`{{${ph.value}}}`); toast.success(`Copied {{${ph.value}}}`); }}>
                                                                {`{{${ph.value}}}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
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
        case ELEMENT_TYPES.IMAGE: {
            const isPlaceholder = !element.url || (element.url.startsWith('{{ ') && element.url.endsWith('}}'));
            const placeholderLabel = isPlaceholder && element.url
                ? element.url.replace(/[{ }]/g, '').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
                : 'Image';
            return (
                <div style={style} className="overflow-hidden">
                    {isPlaceholder ? (
                        <div className="w-full h-full bg-muted/60 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded">
                            <ImageIcon className="h-6 w-6 mb-1" />
                            <span className="text-[10px] font-medium text-center px-1 leading-tight">{placeholderLabel}</span>
                        </div>
                    ) : (
                        <img src={element.url} alt="" className="w-full h-full object-cover" />
                    )}
                </div>
            );
        }
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
        case ELEMENT_TYPES.TABLE:
            return (
                <div style={{ ...style, overflow: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: `${element.fontSize || 12}px`,
                        textAlign: element.textAlign || 'center'
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: element.headerBackgroundColor || '#e0f2fe',
                                fontWeight: element.headerFontWeight || 'bold'
                            }}>
                                {element.columns && element.columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        style={{
                                            padding: '8px',
                                            border: `${element.borderWidth || 1}px solid ${element.borderColor || '#cbd5e1'}`,
                                            width: col.width || 'auto'
                                        }}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {element.tableData && element.tableData.length > 0 ? (
                                // Show actual data during generation
                                element.tableData.map((row, rowIdx) => (
                                    <tr key={rowIdx} style={{
                                        backgroundColor: element.rowBackgroundColor || '#ffffff'
                                    }}>
                                        {element.columns && element.columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                style={{
                                                    padding: '6px',
                                                    border: `${element.borderWidth || 1}px solid ${element.borderColor || '#cbd5e1'}`,
                                                    height: `${element.rowHeight || 30}px`
                                                }}
                                            >
                                                {row[col.key] || ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                // Show one sample row in builder mode
                                <tr style={{
                                    backgroundColor: element.rowBackgroundColor || '#ffffff'
                                }}>
                                    {element.columns && element.columns.map((col, idx) => (
                                        <td
                                            key={idx}
                                            style={{
                                                padding: '6px',
                                                border: `${element.borderWidth || 1}px solid ${element.borderColor || '#cbd5e1'}`,
                                                height: `${element.rowHeight || 30}px`,
                                                color: '#94a3b8'
                                            }}
                                        >
                                            {col.placeholder || ''}
                                        </td>
                                    ))}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            );
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
                lineHeight: element.lineHeight || 1.4,
                letterSpacing: `${element.letterSpacing || 0}px`,
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

function PropertiesEditor({ element, onUpdate, onDelete, onDuplicate, placeholders, allFonts = [], onCustomFontUpload }) {
    const [phSearch, setPhSearch] = useState('');

    // Filter placeholders based on search
    const filteredCategories = PLACEHOLDER_CATEGORIES.map(cat => ({
        ...cat,
        placeholders: cat.placeholders.filter(ph =>
            ph.type === 'text' && (ph.label.toLowerCase().includes(phSearch.toLowerCase()) || ph.value.toLowerCase().includes(phSearch.toLowerCase()))
        )
    })).filter(cat => cat.placeholders.length > 0);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between pb-1">
                <h3 className="text-sm font-semibold tracking-tight capitalize">{element.type}</h3>
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
            <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Position & Size</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs">X</Label>
                        <Input type="number" value={Math.round(element.x)} onChange={(e) => onUpdate({ x: parseInt(e.target.value) })} className="h-8 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs">Y</Label>
                        <Input type="number" value={Math.round(element.y)} onChange={(e) => onUpdate({ y: parseInt(e.target.value) })} className="h-8 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs">Width</Label>
                        <Input type="number" value={Math.round(element.width)} onChange={(e) => onUpdate({ width: parseInt(e.target.value) })} className="h-8 text-sm" />
                    </div>
                    <div>
                        <Label className="text-xs">Height</Label>
                        <Input type="number" value={Math.round(element.height)} onChange={(e) => onUpdate({ height: parseInt(e.target.value) })} className="h-8 text-sm" />
                    </div>
                </div>

                {/* ── TEXT PROPERTIES ── */}
                {element.type === ELEMENT_TYPES.TEXT && (
                    <>
                        {/* Smart Text Content — supports mixed static + {{placeholders}} */}
                        <div className="space-y-2">
                            <Label>Content</Label>
                            <textarea
                                value={element.content}
                                onChange={(e) => onUpdate({ content: e.target.value })}
                                placeholder="Type text or use {{placeholder_name}}..."
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px] resize-y"
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                                Mix text with dynamic fields: "This certifies that {'{{student_name}}'} of class {'{{class}}'}..."
                            </p>
                        </div>
                        {/* Quick-insert placeholders */}
                        <div className="space-y-2">
                            <Label className="text-xs">Insert Placeholder</Label>
                            <Input
                                value={phSearch}
                                onChange={(e) => setPhSearch(e.target.value)}
                                placeholder="Search placeholders..."
                                className="h-8 text-xs"
                            />
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {filteredCategories.map(cat => (
                                    <div key={cat.id}>
                                        <p className="text-[10px] font-semibold text-muted-foreground mt-1">{cat.label}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {cat.placeholders.map(ph => (
                                                <button
                                                    key={ph.value}
                                                    className="text-[10px] bg-muted hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors"
                                                    onClick={() => onUpdate({ content: (element.content || '') + `{{${ph.value}}}` })}
                                                    title={ph.description}
                                                >
                                                    {ph.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator />
                        {/* Font Family */}
                        <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Select value={element.fontFamily} onValueChange={(v) => onUpdate({ fontFamily: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {(allFonts.length > 0 ? allFonts : FONT_LIST).map(f => (
                                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                    ))}
                                    {onCustomFontUpload && (
                                        <>
                                            <Separator className="my-1" />
                                            <Button variant="ghost" size="sm" className="w-full text-xs justify-start" onClick={onCustomFontUpload}>
                                                <Upload className="h-3 w-3 mr-1" /> Upload Font
                                            </Button>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Font Size */}
                        <div className="space-y-2">
                            <Label>Font Size ({element.fontSize}px)</Label>
                            <Slider value={[element.fontSize]} min={8} max={100} step={1} onValueChange={([val]) => onUpdate({ fontSize: val })} />
                        </div>
                        {/* Bold / Italic / Underline */}
                        <div className="flex gap-2">
                            <Button variant={element.fontWeight === 'bold' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold className="h-4 w-4" /></Button>
                            <Button variant={element.fontStyle === 'italic' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic className="h-4 w-4" /></Button>
                            <Button variant={element.textDecoration === 'underline' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}><Underline className="h-4 w-4" /></Button>
                        </div>
                        {/* Alignment */}
                        <div className="flex gap-2">
                            <Button variant={element.textAlign === 'left' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></Button>
                            <Button variant={element.textAlign === 'center' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></Button>
                            <Button variant={element.textAlign === 'right' ? 'secondary' : 'outline'} size="icon" onClick={() => onUpdate({ textAlign: 'right' })}><AlignRight className="h-4 w-4" /></Button>
                        </div>
                        {/* Color */}
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                <DebouncedColorPicker value={element.color} onChange={(val) => onUpdate({ color: val })} className="w-12 p-1 h-8" />
                                <Input value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="flex-1 h-8" />
                            </div>
                        </div>
                        {/* Line Height */}
                        <div className="space-y-2">
                            <Label>Line Height ({element.lineHeight || 1.4})</Label>
                            <Slider value={[element.lineHeight ? element.lineHeight * 10 : 14]} min={10} max={30} step={1} onValueChange={([val]) => onUpdate({ lineHeight: val / 10 })} />
                        </div>
                        {/* Letter Spacing */}
                        <div className="space-y-2">
                            <Label>Letter Spacing ({element.letterSpacing || 0}px)</Label>
                            <Slider value={[element.letterSpacing || 0]} min={-2} max={10} step={0.5} onValueChange={([val]) => onUpdate({ letterSpacing: val })} />
                        </div>
                    </>
                )}

                {/* ── IMAGE PROPERTIES ── */}
                {element.type === ELEMENT_TYPES.IMAGE && (
                    <>
                        <div className="space-y-2">
                            <Label>Image Source</Label>
                            <Select
                                value={element.url?.replace(/[{}]/g, '') || '_custom_'}
                                onValueChange={(value) => onUpdate({ url: value === '_custom_' ? '' : `{{${value}}}` })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select image source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_custom_">Custom URL...</SelectItem>
                                    {IMAGE_PLACEHOLDERS.map(ph => (
                                        <SelectItem key={ph.value} value={ph.value}>{ph.label}</SelectItem>
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
                            <DebouncedColorPicker value={element.color} onChange={(val) => onUpdate({ color: val })} className="w-full h-8" />
                        </div>
                        <div className="space-y-2">
                            <Label>Background Color</Label>
                            <DebouncedColorPicker value={element.backgroundColor} onChange={(val) => onUpdate({ backgroundColor: val })} className="w-full h-8" />
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
                            <DebouncedColorPicker value={element.backgroundColor} onChange={(val) => onUpdate({ backgroundColor: val })} className="w-full h-8" />
                        </div>
                        <div className="space-y-2">
                            <Label>Border Color</Label>
                            <DebouncedColorPicker value={element.borderColor} onChange={(val) => onUpdate({ borderColor: val })} className="w-full h-8" />
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

                {element.type === ELEMENT_TYPES.TABLE && (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Table Columns</Label>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const newColumns = [...(element.columns || []), {
                                            key: `col_${Date.now()}`,
                                            label: 'New Column',
                                            placeholder: '{{placeholder}}',
                                            width: 100
                                        }];
                                        onUpdate({ columns: newColumns });
                                    }}
                                >
                                    Add Column
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {element.columns && element.columns.map((col, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Column {idx + 1}</span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const newColumns = element.columns.filter((_, i) => i !== idx);
                                                    onUpdate({ columns: newColumns });
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Label</Label>
                                            <Input
                                                value={col.label}
                                                onChange={(e) => {
                                                    const newColumns = [...element.columns];
                                                    newColumns[idx].label = e.target.value;
                                                    onUpdate({ columns: newColumns });
                                                }}
                                                placeholder="Column header"
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Data Key</Label>
                                            <Input
                                                value={col.key}
                                                onChange={(e) => {
                                                    const newColumns = [...element.columns];
                                                    newColumns[idx].key = e.target.value;
                                                    onUpdate({ columns: newColumns });
                                                }}
                                                placeholder="e.g., date, subject"
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Placeholder</Label>
                                            <Input
                                                value={col.placeholder}
                                                onChange={(e) => {
                                                    const newColumns = [...element.columns];
                                                    newColumns[idx].placeholder = e.target.value;
                                                    onUpdate({ columns: newColumns });
                                                }}
                                                placeholder="{{placeholder_name}}"
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Width (px)</Label>
                                            <Input
                                                type="number"
                                                value={col.width}
                                                onChange={(e) => {
                                                    const newColumns = [...element.columns];
                                                    newColumns[idx].width = parseInt(e.target.value);
                                                    onUpdate({ columns: newColumns });
                                                }}
                                                className="h-8"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Header Background</Label>
                            <DebouncedColorPicker value={element.headerBackgroundColor} onChange={(val) => onUpdate({ headerBackgroundColor: val })} className="w-full h-8" />
                        </div>
                        <div className="space-y-2">
                            <Label>Row Background</Label>
                            <DebouncedColorPicker value={element.rowBackgroundColor} onChange={(val) => onUpdate({ rowBackgroundColor: val })} className="w-full h-8" />
                        </div>
                        <div className="space-y-2">
                            <Label>Border Color</Label>
                            <DebouncedColorPicker value={element.borderColor} onChange={(val) => onUpdate({ borderColor: val })} className="w-full h-8" />
                        </div>
                        <div className="space-y-2">
                            <Label>Font Size</Label>
                            <Slider
                                value={[element.fontSize || 12]}
                                min={8}
                                max={24}
                                step={1}
                                onValueChange={([val]) => onUpdate({ fontSize: val })}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function LayersPanel({ elements, selectedId, onSelect, onReorder, onToggleLock, onToggleVisible }) {
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    const getIcon = (type) => {
        switch (type) {
            case ELEMENT_TYPES.TEXT: return <Type className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.IMAGE: return <ImageIcon className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.QRCODE: return <QrCode className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.SHAPE: return <Square className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.TABLE: return <TableIcon className="h-3.5 w-3.5" />;
            default: return null;
        }
    };

    const getLabel = (el) => {
        if (el.type === ELEMENT_TYPES.TEXT) {
            const c = el.content || 'Text';
            return c.length > 28 ? c.substring(0, 28) + '…' : c;
        }
        return `${el.type} ${el.id?.slice(-4) || ''}`;
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
                {sortedElements.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">No elements yet</div>
                ) : sortedElements.map((el) => (
                    <div
                        key={el.id}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted/60 transition-colors group",
                            selectedId === el.id && "bg-primary/10 ring-1 ring-primary/30",
                            el.hidden && "opacity-40"
                        )}
                        onClick={() => onSelect(el.id)}
                    >
                        <span className="text-muted-foreground flex-shrink-0">{getIcon(el.type)}</span>
                        <span className="text-xs truncate flex-1 min-w-0">{getLabel(el)}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {onToggleVisible && (
                                <button className="p-0.5 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); onToggleVisible(el.id); }} title={el.hidden ? 'Show' : 'Hide'}>
                                    {el.hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                                </button>
                            )}
                            {onToggleLock && (
                                <button className="p-0.5 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }} title={el.locked ? 'Unlock' : 'Lock'}>
                                    {el.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

        </ScrollArea>
    );
}
