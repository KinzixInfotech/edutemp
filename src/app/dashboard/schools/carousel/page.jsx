'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Loader2,
    Plus,
    Trash2,
    GripVertical,
    Layout,
    Calendar as CalendarIcon,
    User as UserIcon,
    Clock,
    ImageIcon,
    Smartphone,
    ChevronLeft,
    ChevronRight,
    Home,
    User,
    CalendarCheck,
    Megaphone,
    BookOpen,
    Save,
    Eye,
    EyeOff,
    FolderOpen,
    Tag
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import FileUploadButton from '@/components/fileupload';

// Audience options
const AUDIENCE_OPTIONS = [
    { value: 'ALL', label: 'Everyone' },
    { value: 'STUDENTS', label: 'Students' },
    { value: 'TEACHERS', label: 'Teachers' },
    { value: 'PARENTS', label: 'Parents' },
    { value: 'STAFF', label: 'Staff' },
];

// Category options
const CATEGORY_OPTIONS = [
    { value: 'none', label: 'No Category' },
    { value: 'Events', label: 'Events' },
    { value: 'Announcements', label: 'Announcements' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Achievements', label: 'Achievements' },
    { value: 'Holidays', label: 'Holidays' },
];

// Phone Mockup Preview Component
function PhoneMockup({ images }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const intervalRef = useRef(null);

    // Filter to only show active images in preview
    const activeImages = images.filter(img => img.isActive);

    // Auto-slide every 4 seconds
    useEffect(() => {
        if (activeImages.length > 1) {
            intervalRef.current = setInterval(() => {
                setActiveIndex((prev) => (prev + 1) % activeImages.length);
            }, 4000);
        }
        return () => clearInterval(intervalRef.current);
    }, [activeImages.length]);

    // Reset index when images change
    useEffect(() => {
        setActiveIndex(0);
    }, [activeImages.length]);

    const goTo = (index) => {
        setActiveIndex(index);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % activeImages.length);
        }, 4000);
    };

    return (
        <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Live Preview</h3>
                <Badge variant="secondary" className="text-[10px]">
                    {activeImages.length} active
                </Badge>
            </div>

            {/* Phone Frame */}
            <div className="relative mx-auto w-[280px]">
                {/* Phone outer frame */}
                <div className="relative bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                    {/* Dynamic Island / Notch */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />

                    {/* Phone screen */}
                    <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/19.5] relative">
                        {/* Status bar */}
                        <div className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 flex items-end justify-between px-6 pb-1">
                            <span className="text-white text-[10px] font-medium">9:41</span>
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-2 border border-white rounded-sm">
                                    <div className="w-3 h-1.5 bg-white rounded-sm" />
                                </div>
                            </div>
                        </div>

                        {/* App Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                                    SX
                                </div>
                                <div>
                                    <p className="text-white/80 text-[10px]">Good Morning,</p>
                                    <p className="text-white text-sm font-semibold">Admin User</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards (simplified) */}
                        <div className="flex gap-2 px-3 py-3">
                            <div className="flex-1 bg-cyan-500 rounded-xl p-2 text-center">
                                <p className="text-white text-lg font-bold">95%</p>
                                <p className="text-white/80 text-[8px]">Attendance</p>
                            </div>
                            <div className="flex-1 bg-amber-500 rounded-xl p-2 text-center">
                                <p className="text-white text-lg font-bold">A+</p>
                                <p className="text-white/80 text-[8px]">Grade</p>
                            </div>
                            <div className="flex-1 bg-red-500 rounded-xl p-2 text-center">
                                <p className="text-white text-lg font-bold">3</p>
                                <p className="text-white/80 text-[8px]">Pending</p>
                            </div>
                        </div>

                        {/* Carousel Area */}
                        <div className="px-3 py-2">
                            <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[16/9]">
                                {activeImages.length > 0 ? (
                                    <>
                                        {/* Image */}
                                        <div className="relative w-full h-full">
                                            <img
                                                src={activeImages[activeIndex]?.imageUrl}
                                                alt="Carousel"
                                                className="w-full h-full object-cover transition-opacity duration-500"
                                            />
                                            {/* Caption overlay */}
                                            {activeImages[activeIndex]?.caption && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                    <p className="text-white text-[10px] font-medium truncate">
                                                        {activeImages[activeIndex].caption}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dots */}
                                        {activeImages.length > 1 && (
                                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                                {activeImages.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => goTo(idx)}
                                                        className={cn(
                                                            "h-1.5 rounded-full transition-all",
                                                            activeIndex === idx
                                                                ? "w-4 bg-white"
                                                                : "w-1.5 bg-white/50"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <ImageIcon className="w-8 h-8 mb-1 opacity-30" />
                                        <p className="text-[10px]">No active images</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions placeholder */}
                        <div className="px-3 py-2">
                            <p className="text-[10px] font-semibold text-gray-700 mb-2">Quick Actions</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[BookOpen, CalendarCheck, CalendarIcon, Megaphone].map((Icon, i) => (
                                    <div key={i} className="bg-gray-50 rounded-lg p-2 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-blue-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Nav - FIXED at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-around px-4 rounded-t-2xl">
                            {[
                                { icon: Home, label: 'Home', active: true },
                                { icon: User, label: 'Profile', active: false },
                                { icon: CalendarCheck, label: 'Attendance', active: false },
                                { icon: Megaphone, label: 'Notice', active: false },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-0.5">
                                    <item.icon className={cn(
                                        "w-4 h-4",
                                        item.active ? "text-white" : "text-white/60"
                                    )} />
                                    <span className={cn(
                                        "text-[7px]",
                                        item.active ? "text-white" : "text-white/60"
                                    )}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation controls */}
            {activeImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goTo((activeIndex - 1 + activeImages.length) % activeImages.length)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {activeIndex + 1} / {activeImages.length}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goTo((activeIndex + 1) % activeImages.length)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <p className="text-xs text-center text-muted-foreground mt-3">
                Auto-advances every 4 seconds
            </p>
        </div>
    );
}

export default function SchoolCarouselPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [hasOrderChanges, setHasOrderChanges] = useState(false);
    const [localImages, setLocalImages] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [newImage, setNewImage] = useState({
        imageUrl: '',
        caption: '',
        audience: 'ALL',
        expiryDate: undefined,
        category: 'none',
    });

    // Fetch carousel images (include inactive for admin)
    const { data: images = [], isLoading, refetch } = useQuery({
        queryKey: ['school-carousel', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/carousel?schoolId=${schoolId}&includeInactive=true`);
            if (!res.ok) throw new Error('Failed to fetch images');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Sync local images with fetched data
    useEffect(() => {
        if (images.length > 0 && !hasOrderChanges) {
            setLocalImages(images);
        }
    }, [images, hasOrderChanges]);

    // Get unique categories from images
    const categories = [...new Set(images.filter(img => img.category).map(img => img.category))];

    // Filter images by category
    const filteredImages = categoryFilter === 'all'
        ? localImages
        : localImages.filter(img => img.category === categoryFilter);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/schools/carousel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, schoolId, uploadedById: fullUser?.id }),
            });
            if (!res.ok) throw new Error('Failed to add image');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Image added successfully');
            queryClient.invalidateQueries(['school-carousel']);
            setIsAddOpen(false);
            setNewImage({ imageUrl: '', caption: '', audience: 'ALL', expiryDate: undefined, category: 'none' });
        },
        onError: () => toast.error('Failed to add image'),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/carousel/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete image');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Image deleted');
            queryClient.invalidateQueries(['school-carousel']);
        },
    });

    // Toggle active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            const res = await fetch('/api/schools/carousel', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive, schoolId }),
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-carousel']);
        },
    });

    // Save order mutation (manual save)
    const saveOrderMutation = useMutation({
        mutationFn: async (orderedImages) => {
            const res = await fetch('/api/schools/carousel', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId,
                    images: orderedImages.map((img, index) => ({ id: img.id, displayOrder: index }))
                }),
            });
            if (!res.ok) throw new Error('Failed to save order');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Order saved');
            setHasOrderChanges(false);
            queryClient.invalidateQueries(['school-carousel']);
        },
        onError: () => toast.error('Failed to save order'),
    });

    // Drag end handler (just update local state, don't save)
    const onDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(localImages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setLocalImages(items);
        setHasOrderChanges(true);
    };

    // Cancel order changes
    const cancelOrderChanges = () => {
        setLocalImages(images);
        setHasOrderChanges(false);
    };

    if (!schoolId) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Layout className="w-6 h-6 text-primary" />
                        App Gallery Carousel
                    </h1>
                    <p className="text-muted-foreground">
                        Manage banner images for the mobile app. Drag to reorder.
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Save Order Button */}
                    {hasOrderChanges && (
                        <div className="flex gap-2 animate-in fade-in">
                            <Button variant="outline" onClick={cancelOrderChanges}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => saveOrderMutation.mutate(localImages)}
                                disabled={saveOrderMutation.isPending}
                            >
                                {saveOrderMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Order
                            </Button>
                        </div>
                    )}

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Image
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add Carousel Image</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Upload Image</Label>
                                    <FileUploadButton
                                        field="carousel"
                                        aspectRatio="video"
                                        value={newImage.imageUrl}
                                        onChange={(url) => setNewImage(prev => ({ ...prev, imageUrl: url || '' }))}
                                    />
                                    <div className="bg-muted/50 rounded-lg p-3 mt-2">
                                        <p className="text-xs font-medium text-foreground mb-2">📐 Image Guidelines</p>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                            <div>
                                                <span className="font-medium text-foreground">Resolution:</span>
                                                <p>1920 × 1080px (16:9)</p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground">Max Size:</span>
                                                <p>5 MB per image</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            💡 For best results, use landscape images with 16:9 aspect ratio. JPG/PNG supported.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Caption (Optional)</Label>
                                        <Input
                                            placeholder="Brief description..."
                                            value={newImage.caption}
                                            onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={newImage.category}
                                            onValueChange={(val) => setNewImage({ ...newImage, category: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORY_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Target Audience</Label>
                                        <Select
                                            value={newImage.audience}
                                            onValueChange={(val) => setNewImage({ ...newImage, audience: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AUDIENCE_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Expiry Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !newImage.expiryDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {newImage.expiryDate ? format(newImage.expiryDate, "PP") : "No expiry"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={newImage.expiryDate}
                                                    onSelect={(date) => setNewImage({ ...newImage, expiryDate: date })}
                                                    disabled={(date) => date < new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => createMutation.mutate({
                                            imageUrl: newImage.imageUrl,
                                            caption: newImage.caption,
                                            audience: [newImage.audience],
                                            expiryDate: newImage.expiryDate,
                                            category: newImage.category === 'none' ? null : (newImage.category || null)
                                        })}
                                        disabled={!newImage.imageUrl || createMutation.isPending}
                                    >
                                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Image
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Main Content - Side by Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Table Card - Takes 2 columns */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Gallery Images</CardTitle>
                                <CardDescription>
                                    {images.length} total • {images.filter(i => i.isActive).length} active
                                </CardDescription>
                            </div>
                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <FolderOpen className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                        ) : filteredImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                    <ImageIcon className="w-10 h-10 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">No images yet</h3>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                    Upload banner images to display on the mobile app home screen.
                                </p>
                                <Button onClick={() => setIsAddOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Your First Image
                                </Button>
                            </div>
                        ) : (
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead className="w-[100px]">Preview</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <Droppable droppableId="carousel-list">
                                        {(provided) => (
                                            <TableBody
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                            >
                                                {filteredImages.map((image, index) => (
                                                    <Draggable key={image.id} draggableId={image.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <TableRow
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={cn(
                                                                    snapshot.isDragging && "bg-muted shadow-lg",
                                                                    !image.isActive && "opacity-60"
                                                                )}
                                                            >
                                                                <TableCell>
                                                                    <div {...provided.dragHandleProps} className="cursor-grab hover:text-primary">
                                                                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="h-12 w-20 rounded-md overflow-hidden bg-muted border">
                                                                        <img
                                                                            src={image.imageUrl}
                                                                            alt="Preview"
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-medium text-sm">
                                                                            {image.caption || <span className="text-muted-foreground italic">No caption</span>}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                                {image.audience.includes('ALL') ? 'Everyone' : image.audience.join(', ')}
                                                                            </Badge>
                                                                            {image.category && (
                                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                                                                    <Tag className="w-2.5 h-2.5 mr-1" />
                                                                                    {image.category}
                                                                                </Badge>
                                                                            )}
                                                                            {image.expiryDate && (
                                                                                <span className="text-xs text-orange-600 flex items-center gap-1">
                                                                                    <Clock className="w-3 h-3" />
                                                                                    {format(new Date(image.expiryDate), 'MMM d')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {image.uploadedBy && (
                                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                <UserIcon className="w-3 h-3" />
                                                                                {image.uploadedBy.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Switch
                                                                            checked={image.isActive}
                                                                            onCheckedChange={(checked) => {
                                                                                toggleActiveMutation.mutate({ id: image.id, isActive: checked });
                                                                            }}
                                                                        />
                                                                        <span className={cn(
                                                                            "text-xs",
                                                                            image.isActive ? "text-green-600" : "text-muted-foreground"
                                                                        )}>
                                                                            {image.isActive ? (
                                                                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Active</span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            if (confirm('Delete this image?')) {
                                                                                deleteMutation.mutate(image.id);
                                                                            }
                                                                        }}
                                                                        className="hover:text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </TableBody>
                                        )}
                                    </Droppable>
                                </Table>
                            </DragDropContext>
                        )}
                    </CardContent>
                </Card>

                {/* Phone Mockup Preview - Takes 1 column */}
                <div className="lg:col-span-1">
                    <PhoneMockup images={localImages} />
                </div>
            </div>
        </div>
    );
}
