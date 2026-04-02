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
        width: 450,
        height: 100,
        columns: [
            { key: 'col1', label: 'Column 1', placeholder: '{{data_1}}', width: 150 },
            { key: 'col2', label: 'Column 2', placeholder: '{{data_2}}', width: 150 },
            { key: 'col3', label: 'Column 3', placeholder: '{{data_3}}', width: 150 },
        ],
        rowHeight: 30,
        headerBackgroundColor: '#f1f5f9',
        rowBackgroundColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderWidth: 1,
        fontSize: 12,
        headerFontWeight: 'bold',
        textAlign: 'center',
        dataSource: 'custom', 
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
            <ElementRenderer 
                element={el}
                isSelected={isSelected}
                readOnly={readOnly}
                onUpdate={(updates) => callbacksRef.current.updateElement(el.id, updates)}
            />
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
    const [selectedIds, setSelectedIds] = useState([]);
    const [canvasSize, setCanvasSize] = useState(safeConfig.canvasSize || { width: 800, height: 600 });
    const [backgroundImage, setBackgroundImage] = useState(safeConfig.backgroundImage || '');
    const [backgroundColor, setBackgroundColor] = useState(safeConfig.backgroundColor || '#ffffff');
    const [customFonts, setCustomFonts] = useState(safeConfig.customFonts || []);
    const containerRef = useRef(null);
    const canvasAreaRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const onChangeRef = useRef(onChange);
    const [canvasScale, setCanvasScale] = useState(1);
    const [isAutoFit, setIsAutoFit] = useState(true);
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
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                setSelectedIds([]);
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
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.length > 0) {
                e.preventDefault();
                duplicateElements(selectedIds);
            }
            // Arrow keys = Nudge
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                const nudge = e.shiftKey ? 10 : 1;
                setElements(prev => prev.map(el => {
                    if (!selectedIds.includes(el.id)) return el;
                    const updates = {};
                    if (e.key === 'ArrowUp') updates.y = el.y - nudge;
                    if (e.key === 'ArrowDown') updates.y = el.y + nudge;
                    if (e.key === 'ArrowLeft') updates.x = el.x - nudge;
                    if (e.key === 'ArrowRight') updates.x = el.x + nudge;
                    return { ...el, ...updates };
                }));
            }
            // Escape = Deselect
            if (e.key === 'Escape') setSelectedIds([]);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [readOnly, selectedIds, elements, undo, redo]);

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
        if (!isAutoFit) return;
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
    }, [canvasSize, readOnly, isAutoFit]);

    const addElement = (type) => {
        const newElement = {
            id: `${type}-${Date.now()}`,
            x: 50,
            y: 50,
            zIndex: elements.length + 1,
            ...DEFAULT_ELEMENTS[type],
        };
        setElements(prev => [...prev, newElement]);
        setSelectedIds([newElement.id]);
    };

    const updateElement = useCallback((id, updates) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    }, []);

    const removeElement = (id) => {
        setElements(prev => prev.filter(el => el.id !== id));
        setSelectedIds(prev => prev.filter(i => i !== id));
    };

    const duplicateElements = useCallback((ids) => {
        setElements(prev => {
            const newElements = [];
            const newIds = [];
            let maxZ = Math.max(0, ...prev.map(e => e.zIndex));
            ids.forEach(id => {
                const element = prev.find(el => el.id === id);
                if (element) {
                    const newElement = {
                        ...element,
                        id: `${element.type}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                        x: element.x + 20,
                        y: element.y + 20,
                        zIndex: ++maxZ,
                    };
                    newElements.push(newElement);
                    newIds.push(newElement.id);
                }
            });
            setSelectedIds(newIds);
            return [...prev, ...newElements];
        });
    }, []);

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

    const handleSelect = useCallback((id, e) => {
        if (e && e.shiftKey) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedIds([id]);
        }
    }, []);

    const selectedElement = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null;

    const computeSelectionBBox = () => {
         if (selectedIds.length === 0) return null;
         const selEls = elements.filter(el => selectedIds.includes(el.id));
         if (selEls.length === 0) return null;
         
         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
         selEls.forEach(el => {
             const x = el.x;
             const y = el.y;
             const w = typeof el.width === 'number' ? el.width : parseInt(el.width || 100);
             const h = typeof el.height === 'number' ? el.height : parseInt(el.height || 50);
             if (x < minX) minX = x;
             if (y < minY) minY = y;
             if ((x + w) > maxX) maxX = x + w;
             if ((y + h) > maxY) maxY = y + h;
         });
         return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    const handleGroup = () => {
         if (selectedIds.length < 2) return;
         const selEls = elements.filter(el => selectedIds.includes(el.id));
         const bbox = computeSelectionBBox();
         if (!bbox) return;

         const groupedItems = selEls.map(el => ({
             ...el,
             x: el.x - bbox.x,
             y: el.y - bbox.y
         }));

         const newGroup = {
             id: `group-${Date.now()}`,
             type: ELEMENT_TYPES.GROUP,
             x: bbox.x,
             y: bbox.y,
             width: Math.max(bbox.width, 20),
             height: Math.max(bbox.height, 20),
             zIndex: Math.max(...selEls.map(e => e.zIndex)) + 1,
             items: groupedItems,
         };

         setElements(prev => [
             ...prev.filter(el => !selectedIds.includes(el.id)),
             newGroup
         ]);
         setSelectedIds([newGroup.id]);
    };

    const handleUngroup = (groupId) => {
         const group = elements.find(el => el.id === groupId);
         if (!group || group.type !== ELEMENT_TYPES.GROUP) return;

         const restoredItems = group.items.map((child, index) => ({
             ...child,
             x: group.x + child.x,
             y: group.y + child.y,
             zIndex: group.zIndex + index
         }));

         setElements(prev => [
             ...prev.filter(el => el.id !== groupId),
             ...restoredItems
         ]);
         setSelectedIds(restoredItems.map(r => r.id));
    };

    useEffect(() => {
        callbacksRef.current = {
            handleDrag,
            handleDragStop,
            handleResizeStop,
            setSelectedId: handleSelect,
            updateElement
        };
    }, [handleDrag, handleDragStop, handleResizeStop, handleSelect, updateElement]);

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
                    
                    {/* Zoom Slider */}
                    {!readOnly && (
                        <div className="fixed bottom-6 right-80 bg-background/90 backdrop-blur-md border rounded-lg shadow-xl flex items-center px-3 py-2 gap-3 z-50">
                            <span className="text-xs font-mono w-10 text-right">{Math.round(canvasScale * 100)}%</span>
                            <Slider 
                               value={[canvasScale * 100]} 
                               min={10} 
                               max={500} 
                               step={5} 
                               className="w-32"
                               onValueChange={([val]) => {
                                   setIsAutoFit(false);
                                   setCanvasScale(val / 100);
                               }}
                            />
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 border" onClick={() => setIsAutoFit(true)}>
                                Fit
                            </Button>
                        </div>
                    )}

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
                                if (!readOnly && e.target === containerRef.current) setSelectedIds([]);
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
                                const isSelected = selectedIds.includes(el.id) && !readOnly;
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

                            {/* Floating Context Toolbar */}
                            {!readOnly && selectedIds.length > 0 && (() => {
                                const bbox = computeSelectionBBox();
                                if (!bbox) return null;
                                const isGroup = selectedIds.length > 1;
                                return (
                                    <div 
                                        className="absolute flex items-center bg-[#18191b] rounded-full shadow-lg border border-white/10 px-2 py-1.5 gap-1 text-white z-[9999]"
                                        style={{ 
                                             left: bbox.x + bbox.width / 2, 
                                             top: bbox.y - 48, 
                                             transform: 'translateX(-50%)',
                                             pointerEvents: 'auto'
                                        }}
                                        onPointerDown={e => e.stopPropagation()}
                                        onClick={e => e.stopPropagation()}
                                    >
                                         {isGroup ? (
                                             <button onClick={handleGroup} className="flex items-center gap-2 px-3 py-1 hover:bg-white/20 rounded-full text-xs font-medium focus:outline-none">
                                                 <Layers className="h-3.5 w-3.5" /> Group
                                             </button>
                                         ) : selectedElement?.type === ELEMENT_TYPES.GROUP ? (
                                             <button onClick={() => handleUngroup(selectedElement.id)} className="flex items-center gap-2 px-3 py-1 hover:bg-white/20 rounded-full text-xs font-medium focus:outline-none">
                                                 <Layers className="h-3.5 w-3.5" /> Ungroup
                                             </button>
                                         ) : null}

                                         {(isGroup || selectedElement?.type === ELEMENT_TYPES.GROUP) && <div className="w-[1px] h-4 bg-white/20 mx-1" />}

                                         <button onClick={() => duplicateElements(selectedIds)} className="p-1.5 hover:bg-white/20 rounded-full focus:outline-none" title="Duplicate">
                                             <Copy className="h-3.5 w-3.5" />
                                         </button>
                                         <button onClick={() => {
                                             setElements(prev => prev.map(el => selectedIds.includes(el.id) ? { ...el, locked: !el.locked } : el));
                                         }} className="p-1.5 hover:bg-white/20 rounded-full focus:outline-none" title="Lock/Unlock">
                                             {elements.find(el => selectedIds.includes(el.id))?.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                         </button>
                                         <button onClick={() => {
                                             setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                                             setSelectedIds([]);
                                         }} className="p-1.5 hover:bg-white/20 rounded-full text-red-500 focus:outline-none" title="Delete">
                                             <Trash2 className="h-3.5 w-3.5" />
                                         </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Properties Panel */}
                {!readOnly && (
                    <div className="properties-sidebar">
                        <Tabs defaultValue="properties" className="w-full  flex-1 flex flex-col min-h-0">
                            <div className='bg-[#ebeef0] dark:bg-black border-b'>
                                <TabsList className="w-full rounded-none border-b px-2 h-11 flex-shrink-0 grid grid-cols-3  gap-1">
                                    <TabsTrigger value="properties" className="text-xs ">Properties</TabsTrigger>
                                    <TabsTrigger value="layers" className="text-xs">Layers</TabsTrigger>
                                    <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                                </TabsList>
                            </div>

                            {/* PROPERTIES TAB */}
                            <TabsContent value="properties" className="flex-1 m-0 overflow-hidden min-h-0 flex flex-col">
                                <div className="sidebar-inner-scroll">
                                    {selectedIds.length > 1 ? (
                                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                                            <span className="text-4xl opacity-20"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg></span>
                                            <p className="text-sm leading-relaxed">{selectedIds.length} elements selected<br />Use floating toolbar to group</p>
                                        </div>
                                    ) : selectedElement ? (
                                        <PropertiesEditor
                                            element={selectedElement}
                                            onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                                            onDelete={() => removeElement(selectedElement.id)}
                                            onDuplicate={() => duplicateElements([selectedElement.id])}
                                            placeholders={placeholders}
                                            allFonts={allFonts}
                                            onCustomFontUpload={handleCustomFontUpload}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                                            <span className="text-4xl opacity-20">↖</span>
                                            <p className="text-sm leading-relaxed">Select an element<br />to edit its properties</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* LAYERS TAB */}
                            <TabsContent value="layers" className="flex-1 m-0 overflow-hidden min-h-0 flex flex-col">
                                <div className="sidebar-inner-scroll">
                                    <LayersPanel
                                        elements={elements}
                                        selectedIds={selectedIds}
                                        onSelect={(id) => setSelectedIds([id])}
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

                            {/* SETTINGS TAB */}
                            <TabsContent value="settings" className="flex-1 m-0 overflow-hidden min-h-0 flex flex-col">
                                <div className="sidebar-inner-scroll">
                                    {/* ── Page Size Presets ── */}
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
                                    {/* ── Custom Dimensions ── */}
                                    <div className="space-y-2 mt-4">
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
                                    <Separator className="my-4" />
                                    {/* ── Background Color ── */}
                                    <div className="space-y-2">
                                        <Label>Background Color</Label>
                                        <div className="flex gap-2">
                                            <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-12 h-9 p-0.5 cursor-pointer" />
                                            <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1" placeholder="#ffffff" />
                                        </div>
                                    </div>
                                    {/* ── Background Image ── */}
                                    <div className="space-y-2 mt-4">
                                        <Label>Background Image</Label>
                                        <Input value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} placeholder="Paste image URL..." />
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file'; input.accept = 'image/*';
                                                input.onchange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setBackgroundImage(ev.target.result); reader.readAsDataURL(file); } };
                                                input.click();
                                            }}>
                                                <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Upload
                                            </Button>
                                            {backgroundImage && (
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setBackgroundImage('')}>Clear</Button>
                                            )}
                                        </div>
                                        {backgroundImage && (
                                            <img src={backgroundImage} alt="Background" className="w-full h-20 object-cover rounded border mt-1" />
                                        )}
                                    </div>
                                    <Separator className="my-4" />
                                    {/* ── Available Placeholders Reference ── */}
                                    <div className="space-y-2">
                                        <Label>Available Placeholders</Label>
                                        <p className="text-xs text-muted-foreground">Click to copy, then paste in a text element</p>
                                        {PLACEHOLDER_CATEGORIES.map(cat => (
                                            <div key={cat.id} className="space-y-1">
                                                <p className="ph-cat-label">{cat.label}</p>
                                                <div className="ph-chip-wrap">
                                                    {cat.placeholders.filter(p => p.type === 'text').map(ph => (
                                                        <button key={ph.value} className="ph-chip"
                                                            title={ph.description}
                                                            onClick={() => { navigator.clipboard.writeText(`{{${ph.value}}}`); toast.success(`Copied {{${ph.value}}}`); }}>
                                                            {`{{${ph.value}}}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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

function ElementRenderer({ element, isSelected, readOnly, onUpdate }) {
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
        case ELEMENT_TYPES.GROUP:
            return (
                <div style={{ ...style, position: 'relative', width: '100%', height: '100%' }}>
                    {element.items && element.items.map(child => (
                        <div key={child.id} style={{ position: 'absolute', left: child.x, top: child.y, width: child.width, height: child.height }}>
                             <ElementRenderer element={child} readOnly={readOnly} />
                        </div>
                    ))}
                </div>
            );
        case ELEMENT_TYPES.SHAPE:
            return <div style={style} />;
        case ELEMENT_TYPES.TABLE: {
            const displayRows = element.rows || [{
                id: 'row_1',
                cells: element.columns?.reduce((acc, col) => ({ ...acc, [col.key]: col.placeholder }), {}) || {}
            }];

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
                                            width: col.width || 'auto',
                                            position: 'relative'
                                        }}
                                    >
                                        {!readOnly && isSelected ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    value={col.label}
                                                    onChange={e => {
                                                        const newCols = [...element.columns];
                                                        newCols[idx] = { ...newCols[idx], label: e.target.value };
                                                        onUpdate({ columns: newCols });
                                                    }}
                                                    onPointerDown={e => e.stopPropagation()}
                                                    className="bg-transparent border-none outline-none text-center w-full focus:ring-1 focus:ring-blue-500 rounded px-1"
                                                    style={{ color: 'inherit', fontWeigth: 'inherit', fontSize: 'inherit' }}
                                                />
                                                <div className="opacity-0 hover:opacity-100 flex flex-col absolute -top-6 left-1/2 -translate-x-1/2 bg-white border shadow-sm rounded overflow-hidden">
                                                    <div className="flex">
                                                      <button 
                                                          onClick={e => {
                                                              e.stopPropagation();
                                                              if (element.columns.length <= 1) return;
                                                              onUpdate({ columns: element.columns.filter((_, i) => i !== idx) });
                                                          }} 
                                                          className="p-1 hover:bg-destructive hover:text-white"
                                                      >
                                                          <Trash2 className="h-3 w-3" />
                                                      </button>
                                                      <button 
                                                          onClick={e => {
                                                              e.stopPropagation();
                                                              const newCols = [...element.columns];
                                                              newCols.splice(idx + 1, 0, { key: `col_${Date.now()}`, label: 'New Col', placeholder: 'Data', width: 100 });
                                                              onUpdate({ columns: newCols });
                                                          }} 
                                                          className="p-1 hover:bg-accent text-primary"
                                                      >
                                                          <Plus className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            col.label
                                        )}
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
                                // Show builder rows in design mode
                                displayRows.map((row, rowIdx) => (
                                    <tr key={row.id || rowIdx} style={{
                                        backgroundColor: element.rowBackgroundColor || '#ffffff'
                                    }}>
                                        {element.columns && element.columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                style={{
                                                    padding: '6px',
                                                    border: `${element.borderWidth || 1}px solid ${element.borderColor || '#cbd5e1'}`,
                                                    height: `${element.rowHeight || 30}px`,
                                                    color: '#94a3b8',
                                                    position: 'relative'
                                                }}
                                            >
                                                {!readOnly && isSelected ? (
                                                    <div className="flex items-center gap-1 group">
                                                        <input
                                                            value={row.cells?.[col.key] || ''}
                                                            onChange={e => {
                                                                const currentRows = element.rows ? [...element.rows] : [...displayRows];
                                                                currentRows[rowIdx] = { ...currentRows[rowIdx], cells: { ...currentRows[rowIdx].cells, [col.key]: e.target.value } };
                                                                onUpdate({ rows: currentRows });
                                                            }}
                                                            onPointerDown={e => e.stopPropagation()}
                                                            className="bg-transparent border-none outline-none text-center w-full focus:ring-1 focus:ring-blue-500 rounded px-1"
                                                            style={{ color: 'inherit', fontSize: 'inherit' }}
                                                        />
                                                        {colIdx === 0 && (
                                                            <div className="opacity-0 group-hover:opacity-100 flex absolute top-1/2 -left-6 -translate-y-1/2 bg-white border shadow-sm rounded overflow-hidden z-20">
                                                              <button 
                                                                  onClick={e => {
                                                                      e.stopPropagation();
                                                                      let currentRows = element.rows ? [...element.rows] : [...displayRows];
                                                                      if (currentRows.length <= 1) return;
                                                                      currentRows.splice(rowIdx, 1);
                                                                      onUpdate({ rows: currentRows });
                                                                  }} 
                                                                  className="p-1 hover:bg-destructive hover:text-white"
                                                              >
                                                                  <Trash2 className="h-3 w-3" />
                                                              </button>
                                                              <button 
                                                                  onClick={e => {
                                                                      e.stopPropagation();
                                                                      let currentRows = element.rows ? [...element.rows] : [...displayRows];
                                                                      currentRows.splice(rowIdx + 1, 0, { id: `row_${Date.now()}`, cells: {} });
                                                                      onUpdate({ rows: currentRows });
                                                                  }} 
                                                                  className="p-1 hover:bg-accent text-primary"
                                                              >
                                                                  <Plus className="h-3 w-3" />
                                                              </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    row.cells?.[col.key] || ''
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            );
        }
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
    const [phSearch, setPhSearch] = React.useState('');

    const filtered = PLACEHOLDER_CATEGORIES.map(cat => ({
        ...cat,
        placeholders: cat.placeholders.filter(ph =>
            ph.type === 'text' && (
                ph.label.toLowerCase().includes(phSearch.toLowerCase()) ||
                ph.value.toLowerCase().includes(phSearch.toLowerCase())
            )
        )
    })).filter(cat => cat.placeholders.length > 0);

    return (
        <div className="space-y-0 pb-40">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold capitalize tracking-tight">{element.type}</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
            </div>

            <Separator className="mb-4" />

            {/* Position & Size */}
            <p className="prop-section-title">Position & Size</p>
            <div className="prop-grid-2">
                {[['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']].map(([lbl, key]) => (
                    <div key={key}>
                        <label>{lbl}</label>
                        <Input type="number" className="h-8 text-sm"
                            value={Math.round(element[key])}
                            onChange={e => onUpdate({ [key]: parseInt(e.target.value) || 0 })} />
                    </div>
                ))}
            </div>

            {/* ── TEXT ── */}
            {element.type === ELEMENT_TYPES.TEXT && (
                <div className="space-y-4">
                    {/* Content */}
                    <div className="space-y-1.5">
                        <Label>Content</Label>
                        <textarea
                            value={element.content}
                            onChange={e => onUpdate({ content: e.target.value })}
                            placeholder='Type text or use {{placeholder_name}}...'
                            className="w-full min-h-[68px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            rows={3}
                        />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Mix text + dynamic fields: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{'{{studentName}}'}</code>
                        </p>
                    </div>

                    {/* Insert Placeholder */}
                    <div className="space-y-2">
                        <Label>Insert Placeholder</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            <Input
                                className="pl-7 h-8 text-xs"
                                value={phSearch}
                                onChange={e => setPhSearch(e.target.value)}
                                placeholder="Search..."
                            />
                        </div>
                        <div style={{ maxHeight: 176, overflowY: 'auto', paddingRight: 2 }}>
                            {filtered.map(cat => (
                                <div key={cat.id}>
                                    <p className="ph-cat-label">{cat.label}</p>
                                    <div className="ph-chip-wrap">
                                        {cat.placeholders.map(ph => (
                                            <button
                                                key={ph.value}
                                                className="border! text-sm py-2 px-2 rounded-lg bg-muted"
                                                onClick={() => onUpdate({ content: (element.content || '') + `{{${ph.value}}}` })}
                                                title={`Insert {{${ph.value}}}`}
                                            >
                                                {`{{${ph.value}}}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Font Family */}
                    <div className="space-y-1.5">
                        <Label>Font Family</Label>
                        <Select value={element.fontFamily} onValueChange={v => onUpdate({ fontFamily: v })}>
                            <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-56">
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
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Font Size <span>{element.fontSize}px</span></div>
                        <Slider value={[element.fontSize]} min={8} max={100} step={1} onValueChange={([v]) => onUpdate({ fontSize: v })} />
                    </div>

                    {/* Bold / Italic / Underline */}
                    <div className="space-y-1.5">
                        <Label>Style</Label>
                        <div className="flex gap-1.5">
                            <button className={`prop-style-btn ${element.fontWeight === 'bold' ? 'is-active' : ''}`}
                                onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}>
                                <Bold className="h-3.5 w-3.5" />
                            </button>
                            <button className={`prop-style-btn ${element.fontStyle === 'italic' ? 'is-active' : ''}`}
                                onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                                <Italic className="h-3.5 w-3.5" />
                            </button>
                            <button className={`prop-style-btn ${element.textDecoration === 'underline' ? 'is-active' : ''}`}
                                onClick={() => onUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}>
                                <Underline className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1.5">
                        <Label>Alignment</Label>
                        <div className="flex gap-1.5">
                            {(['left', 'center', 'right']).map(a => (
                                <button key={a}
                                    className={`prop-style-btn flex-1 ${element.textAlign === a ? 'is-active' : ''}`}
                                    onClick={() => onUpdate({ textAlign: a })}>
                                    {a === 'left' ? <AlignLeft className="h-3.5 w-3.5" /> : a === 'center' ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-1.5">
                        <Label>Color</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.color} onChange={e => onUpdate({ color: e.target.value })} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input value={element.color} onChange={e => onUpdate({ color: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>

                    {/* Line Height */}
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Line Height <span>{element.lineHeight || 1.4}</span></div>
                        <Slider value={[(element.lineHeight || 1.4) * 10]} min={10} max={30} step={1} onValueChange={([v]) => onUpdate({ lineHeight: v / 10 })} />
                    </div>

                    {/* Letter Spacing */}
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Letter Spacing <span>{element.letterSpacing || 0}px</span></div>
                        <Slider value={[element.letterSpacing || 0]} min={-2} max={10} step={0.5} onValueChange={([v]) => onUpdate({ letterSpacing: v })} />
                    </div>
                </div>
            )}

            {/* ── IMAGE ── */}
            {element.type === ELEMENT_TYPES.IMAGE && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
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
                        <Input value={element.url || ''} onChange={e => onUpdate({ url: e.target.value })} placeholder="Or enter image URL" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Opacity <span>{Math.round((element.opacity ?? 1) * 100)}%</span></div>
                        <Slider value={[(element.opacity ?? 1) * 100]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ opacity: v / 100 })} />
                    </div>
                </div>
            )}

            {/* ── QRCODE ── */}
            {element.type === ELEMENT_TYPES.QRCODE && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>QR Content</Label>
                        <Input value={element.content} onChange={e => onUpdate({ content: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Color</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.color} onChange={e => onUpdate({ color: e.target.value })} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input value={element.color} onChange={e => onUpdate({ color: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Background</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.backgroundColor} onChange={e => onUpdate({ backgroundColor: e.target.value })} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input value={element.backgroundColor} onChange={e => onUpdate({ backgroundColor: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>
                </div>
            )}

            {/* ── SHAPE ── */}
            {element.type === ELEMENT_TYPES.SHAPE && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Shape Type</Label>
                        <Select value={element.shapeType} onValueChange={v => onUpdate({ shapeType: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rectangle">Rectangle</SelectItem>
                                <SelectItem value="circle">Circle</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Fill Color</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.backgroundColor} onChange={e => onUpdate({ backgroundColor: e.target.value })} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input value={element.backgroundColor} onChange={e => onUpdate({ backgroundColor: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Border Color</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.borderColor} onChange={e => onUpdate({ borderColor: e.target.value })} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input value={element.borderColor} onChange={e => onUpdate({ borderColor: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Border Width <span>{element.borderWidth}px</span></div>
                        <Slider value={[element.borderWidth]} min={0} max={20} step={1} onValueChange={([v]) => onUpdate({ borderWidth: v })} />
                    </div>
                    {element.shapeType !== 'circle' && (
                        <div className="space-y-1.5">
                            <div className="prop-slider-label">Border Radius <span>{element.borderRadius}px</span></div>
                            <Slider value={[element.borderRadius]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ borderRadius: v })} />
                        </div>
                    )}
                </div>
            )}

            {/* ── TABLE ── (same as before, just add spacing) */}
            {element.type === ELEMENT_TYPES.TABLE && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Table Columns</Label>
                            <Button size="sm" onClick={() => {
                                const newColumns = [...(element.columns || []), { key: `col_${Date.now()}`, label: 'New Column', placeholder: '{{placeholder}}', width: 100 }];
                                onUpdate({ columns: newColumns });
                            }}>Add Column</Button>
                        </div>
                        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                            {element.columns && element.columns.map((col, idx) => (
                                <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Column {idx + 1}</span>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                            onUpdate({ columns: element.columns.filter((_, i) => i !== idx) });
                                        }}><Trash2 className="h-3 w-3" /></Button>
                                    </div>
                                    {['label', 'key', 'placeholder'].map(field => (
                                        <div key={field}>
                                            <Label className="text-[11px] text-muted-foreground capitalize">{field}</Label>
                                            <Input className="h-7 text-xs mt-0.5" value={col[field]} onChange={e => {
                                                const nc = [...element.columns]; nc[idx] = { ...nc[idx], [field]: e.target.value }; onUpdate({ columns: nc });
                                            }} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Header Background</Label>
                        <div className="prop-color-row">
                            <Input type="color" value={element.headerBackgroundColor} onChange={e => onUpdate({ headerBackgroundColor: e.target.value })} className="w-10 h-8 p-1" />
                            <Input value={element.headerBackgroundColor} onChange={e => onUpdate({ headerBackgroundColor: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="prop-slider-label">Font Size <span>{element.fontSize || 12}px</span></div>
                        <Slider value={[element.fontSize || 12]} min={8} max={24} step={1} onValueChange={([v]) => onUpdate({ fontSize: v })} />
                    </div>
                </div>
            )}
        </div>
    );
}


function LayersPanel({ elements, selectedIds, onSelect, onReorder, onToggleLock, onToggleVisible }) {
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    const getIcon = (type) => {
        switch (type) {
            case ELEMENT_TYPES.TEXT: return <Type className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.IMAGE: return <ImageIcon className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.QRCODE: return <QrCode className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.SHAPE: return <Square className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.TABLE: return <TableIcon className="h-3.5 w-3.5" />;
            case ELEMENT_TYPES.GROUP: return <Layers className="h-3.5 w-3.5" />;
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
                            selectedIds.includes(el.id) && "bg-primary/10 ring-1 ring-primary/30",
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
