'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Image as ImageIcon,
    Folder,
    Plus,
    Settings,
    Upload,
    Trash2,
    Eye,
    Calendar,
    HardDrive,
    AlertTriangle,
    CheckCircle,
    Clock,
    ArrowRight,
    Loader2,
    Images,
    FolderOpen,
    LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { value: 'ANNUAL_DAY', label: 'Annual Day', color: 'bg-purple-500' },
    { value: 'SPORTS_DAY', label: 'Sports Day', color: 'bg-green-500' },
    { value: 'CULTURAL', label: 'Cultural', color: 'bg-pink-500' },
    { value: 'GRADUATION', label: 'Graduation', color: 'bg-blue-500' },
    { value: 'FIELD_TRIP', label: 'Field Trip', color: 'bg-orange-500' },
    { value: 'CLASSROOM', label: 'Classroom', color: 'bg-cyan-500' },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure', color: 'bg-gray-500' },
    { value: 'AWARDS', label: 'Awards', color: 'bg-yellow-500' },
    { value: 'GENERAL', label: 'General', color: 'bg-indigo-500' },
];

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function GalleryPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const router = useRouter();
    const queryClient = useQueryClient();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [newAlbum, setNewAlbum] = useState({
        title: '',
        description: '',
        category: 'GENERAL',
        eventDate: '',
    });

    // Fetch gallery data
    const { data: galleryData, isLoading, refetch: refetchGallery } = useQuery({
        queryKey: ['admin-gallery', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/gallery`);
            if (!res.ok) throw new Error('Failed to fetch gallery');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch settings
    const { data: settingsData } = useQuery({
        queryKey: ['gallery-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/gallery/settings`);
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Create album mutation
    const createAlbumMutation = useMutation({
        mutationFn: async (albumData) => {
            const res = await fetch(`/api/schools/${schoolId}/gallery/albums`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...albumData,
                    createdById: fullUser?.id,
                }),
            });
            if (!res.ok) throw new Error('Failed to create album');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-gallery', schoolId]);
            setCreateDialogOpen(false);
            setNewAlbum({ title: '', description: '', category: 'GENERAL', eventDate: '' });
            toast.success('Album created successfully');
            // Navigate to the new album
            if (data.album?.id) {
                router.push(`/dashboard/schools/gallery/albums/${data.album.id}`);
            }
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (settings) => {
            const res = await fetch(`/api/schools/${schoolId}/gallery/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error('Failed to update settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['gallery-settings', schoolId]);
            toast.success('Settings updated');
        },
    });

    const albums = galleryData?.albums || [];
    const quota = galleryData?.quota || { used: 0, total: 500 * 1024 * 1024, percentUsed: 0 };
    const settings = settingsData?.settings || {};

    // Filter albums by category
    const filteredAlbums = categoryFilter === 'all'
        ? albums
        : albums.filter(album => album.category === categoryFilter);

    // Get total images count
    const totalImages = albums.reduce((sum, album) => sum + (album.imageCount || 0), 0);

    const handleCreateAlbum = () => {
        if (!newAlbum.title.trim()) {
            toast.error('Album title is required');
            return;
        }
        createAlbumMutation.mutate(newAlbum);
    };

    if (!schoolId) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Images className="w-6 h-6 text-primary" />
                        School Gallery
                    </h1>
                    <p className="text-muted-foreground">
                        Manage photo albums and gallery for your school
                    </p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Album
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Album</DialogTitle>
                            <DialogDescription>
                                Create a new album to organize your school photos
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Album Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Annual Day 2024"
                                    value={newAlbum.title}
                                    onChange={(e) =>
                                        setNewAlbum({ ...newAlbum, title: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Brief description of the event"
                                    value={newAlbum.description}
                                    onChange={(e) =>
                                        setNewAlbum({ ...newAlbum, description: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={newAlbum.category}
                                        onValueChange={(value) =>
                                            setNewAlbum({ ...newAlbum, category: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn('w-2 h-2 rounded-full', cat.color)} />
                                                        {cat.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="eventDate">Event Date</Label>
                                    <Input
                                        id="eventDate"
                                        type="date"
                                        value={newAlbum.eventDate}
                                        onChange={(e) =>
                                            setNewAlbum({ ...newAlbum, eventDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateAlbum}
                                disabled={createAlbumMutation.isPending}
                            >
                                {createAlbumMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Create & Add Photos
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Albums</p>
                                <p className="text-2xl font-bold">{albums.length}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FolderOpen className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Photos</p>
                                <p className="text-2xl font-bold">{totalImages}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Storage Used</p>
                                <p className="text-2xl font-bold">{formatBytes(quota.used)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <HardDrive className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Synced to Media Library
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Today's Uploads</p>
                                <p className="text-2xl font-bold">{galleryData?.todayUploads || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Upload className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>



            {/* Albums Section */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5" />
                                Albums
                            </CardTitle>
                            <CardDescription>
                                {albums.length} album{albums.length !== 1 ? 's' : ''} • Click to open and manage photos
                            </CardDescription>
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-2 h-2 rounded-full', cat.color)} />
                                            {cat.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-video bg-muted rounded-lg mb-3" />
                                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : filteredAlbums.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredAlbums.map((album) => {
                                const categoryInfo = CATEGORIES.find(c => c.value === album.category);
                                return (
                                    <Card
                                        key={album.id}
                                        className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all hover:border-primary/50"
                                        onClick={() => router.push(`/dashboard/schools/gallery/albums/${album.id}`)}
                                    >
                                        <div className="aspect-video bg-muted relative overflow-hidden">
                                            {album.coverImage ? (
                                                <img
                                                    src={album.coverImage}
                                                    alt={album.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                                    <Folder className="w-16 h-16 text-muted-foreground/40" />
                                                </div>
                                            )}
                                            {/* Category badge overlay */}
                                            <div className="absolute top-2 left-2">
                                                <Badge className={cn('text-white text-xs', categoryInfo?.color || 'bg-gray-500')}>
                                                    {categoryInfo?.label || album.category}
                                                </Badge>
                                            </div>
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button variant="secondary" size="sm">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Open Album
                                                </Button>
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                {album.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    {album.imageCount} photos
                                                </span>
                                                {album.eventDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(album.eventDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <FolderOpen className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                                {categoryFilter !== 'all' ? 'No albums in this category' : 'No albums yet'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                {categoryFilter !== 'all'
                                    ? 'Try selecting a different category or create a new album.'
                                    : 'Create your first album to start organizing your school photos.'}
                            </p>
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Album
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Gallery Settings
                    </CardTitle>
                    <CardDescription>
                        Configure gallery behavior and permissions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                            <div>
                                <Label className="font-medium">Require Approval</Label>
                                <p className="text-sm text-muted-foreground">
                                    Images require admin approval before going public
                                </p>
                            </div>
                            <Switch
                                checked={settings.requireApproval}
                                onCheckedChange={(checked) =>
                                    updateSettingsMutation.mutate({ requireApproval: checked })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                            <div>
                                <Label className="font-medium">Allow Public View</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow unauthenticated users to view gallery
                                </p>
                            </div>
                            <Switch
                                checked={settings.allowPublicView}
                                onCheckedChange={(checked) =>
                                    updateSettingsMutation.mutate({ allowPublicView: checked })
                                }
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
