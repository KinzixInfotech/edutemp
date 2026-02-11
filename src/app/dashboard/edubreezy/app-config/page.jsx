'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2,
    Save,
    Smartphone,
    Shield,
    AlertTriangle,
    Settings,
    ScrollText,
    Plus,
    Trash2,
    Wrench,
    Globe,
    Hash,
    Package,
    CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AppConfigPage() {
    const queryClient = useQueryClient();
    const [newChangelogEntry, setNewChangelogEntry] = useState({ version: '', date: '', changes: '' });

    // Fetch config
    const { data: config, isLoading } = useQuery({
        queryKey: ['app-config'],
        queryFn: async () => {
            const res = await fetch('/api/app-config');
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    // Local form state synced from server
    const [form, setForm] = React.useState(null);
    React.useEffect(() => {
        if (config && !form) {
            setForm({
                currentVersion: config.currentVersion || '1.0.0',
                minimumVersion: config.minimumVersion || '1.0.0',
                latestVersion: config.latestVersion || '1.0.0',
                androidVersionCode: config.androidVersionCode || 1,
                iosBuildNumber: config.iosBuildNumber || 1,
                updateMode: config.updateMode || 'FLEXIBLE',
                forceUpdate: config.forceUpdate || false,
                maintenanceMode: config.maintenanceMode || false,
                maintenanceMessage: config.maintenanceMessage || '',
                changelog: config.changelog || [],
                androidStoreUrl: config.androidStoreUrl || '',
                iosStoreUrl: config.iosStoreUrl || '',
                appName: config.appName || 'EduBreezy',
                bundleId: config.bundleId || 'com.kinzix.edubreezy',
                easProjectId: config.easProjectId || '',
            });
        }
    }, [config, form]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/app-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, role: 'SUPER_ADMIN' }),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            toast.success('App config saved successfully!');
            queryClient.invalidateQueries(['app-config']);
        },
        onError: () => {
            toast.error('Failed to save config');
        },
    });

    const handleSave = () => {
        if (!form) return;
        saveMutation.mutate(form);
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const addChangelogEntry = () => {
        if (!newChangelogEntry.version || !newChangelogEntry.changes) {
            toast.error('Version and changes are required');
            return;
        }
        const entry = {
            version: newChangelogEntry.version,
            date: newChangelogEntry.date || new Date().toISOString().split('T')[0],
            changes: newChangelogEntry.changes.split('\n').filter(Boolean),
        };
        updateField('changelog', [entry, ...(form.changelog || [])]);
        setNewChangelogEntry({ version: '', date: '', changes: '' });
        toast.success('Changelog entry added');
    };

    const removeChangelogEntry = (index) => {
        const updated = [...(form.changelog || [])];
        updated.splice(index, 1);
        updateField('changelog', updated);
    };

    if (isLoading || !form) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">App Configuration</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage app versions, force updates, maintenance mode & changelog
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                </Button>
            </div>

            <Separator />

            {/* App Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Current Version</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">v{form.currentVersion}</div>
                        <p className="text-xs text-muted-foreground mt-1">Live on stores</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Min Required</CardTitle>
                        <Shield className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">v{form.minimumVersion}</div>
                        <p className="text-xs text-muted-foreground mt-1">Below = force update</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Update Mode</CardTitle>
                        <Smartphone className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={form.updateMode === 'IMMEDIATE' ? 'destructive' : form.updateMode === 'FLEXIBLE' ? 'default' : 'secondary'}>
                            {form.updateMode}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                            {form.forceUpdate ? '🔴 Force update ON' : '🟢 Normal mode'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <Wrench className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={form.maintenanceMode ? 'destructive' : 'outline'}>
                            {form.maintenanceMode ? '🔴 ACTIVE' : '🟢 OFF'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                            {form.maintenanceMode ? 'App is down for users' : 'App running normally'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Build Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Android versionCode</CardTitle>
                        <Hash className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{form.androidVersionCode}</div>
                        <p className="text-xs text-muted-foreground mt-1">EAS auto-incremented</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">iOS buildNumber</CardTitle>
                        <Hash className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{form.iosBuildNumber}</div>
                        <p className="text-xs text-muted-foreground mt-1">EAS auto-incremented</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Bundle ID</CardTitle>
                        <Globe className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-mono font-bold text-purple-600">{form.bundleId}</div>
                        <p className="text-xs text-muted-foreground mt-1">EAS: {form.easProjectId?.slice(0, 8) || 'N/A'}...</p>
                    </CardContent>
                </Card>
            </div>

            {/* Version Control */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Version Control
                    </CardTitle>
                    <CardDescription>
                        Control which versions are considered up-to-date and which need forced updates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Current Version</Label>
                            <Input
                                value={form.currentVersion}
                                onChange={(e) => updateField('currentVersion', e.target.value)}
                                placeholder="1.0.1"
                            />
                            <p className="text-xs text-muted-foreground">Version currently live on stores</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Latest Version</Label>
                            <Input
                                value={form.latestVersion}
                                onChange={(e) => updateField('latestVersion', e.target.value)}
                                placeholder="1.0.1"
                            />
                            <p className="text-xs text-muted-foreground">Latest available version</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Minimum Version</Label>
                            <Input
                                value={form.minimumVersion}
                                onChange={(e) => updateField('minimumVersion', e.target.value)}
                                placeholder="1.0.0"
                            />
                            <p className="text-xs text-muted-foreground">Below this = forced update</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Android versionCode</Label>
                            <Input
                                type="number"
                                value={form.androidVersionCode}
                                onChange={(e) => updateField('androidVersionCode', parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">Incremented by EAS on each build</p>
                        </div>
                        <div className="space-y-2">
                            <Label>iOS buildNumber</Label>
                            <Input
                                type="number"
                                value={form.iosBuildNumber}
                                onChange={(e) => updateField('iosBuildNumber', parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">Incremented by EAS on each build</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Update Mode</Label>
                            <Select value={form.updateMode} onValueChange={(v) => updateField('updateMode', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FLEXIBLE">🟢 Flexible (can skip)</SelectItem>
                                    <SelectItem value="IMMEDIATE">🔴 Immediate (blocking)</SelectItem>
                                    <SelectItem value="NONE">⚪ None (no prompts)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Force Update</Label>
                            <div className="flex items-center gap-3 pt-2">
                                <Switch
                                    checked={form.forceUpdate}
                                    onCheckedChange={(v) => updateField('forceUpdate', v)}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {form.forceUpdate ? 'All users must update immediately' : 'Users can skip updates'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Maintenance Mode
                    </CardTitle>
                    <CardDescription>
                        Block app access during deployments or critical fixes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={form.maintenanceMode}
                            onCheckedChange={(v) => updateField('maintenanceMode', v)}
                        />
                        <div>
                            <p className="font-medium text-sm">
                                {form.maintenanceMode ? '🔴 Maintenance Mode is ACTIVE' : '🟢 App is running normally'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {form.maintenanceMode
                                    ? 'All app users will see a maintenance screen'
                                    : 'Toggle to take the app offline for all users'}
                            </p>
                        </div>
                    </div>
                    {form.maintenanceMode && (
                        <div className="space-y-2">
                            <Label>Maintenance Message</Label>
                            <Textarea
                                value={form.maintenanceMessage}
                                onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                                placeholder="We're performing scheduled maintenance. Please check back shortly."
                                rows={3}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Store URLs & App Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Store URLs & App Metadata
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Android Play Store URL</Label>
                            <Input
                                value={form.androidStoreUrl}
                                onChange={(e) => updateField('androidStoreUrl', e.target.value)}
                                placeholder="https://play.google.com/store/apps/details?id=com.kinzix.edubreezy"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>iOS App Store URL</Label>
                            <Input
                                value={form.iosStoreUrl}
                                onChange={(e) => updateField('iosStoreUrl', e.target.value)}
                                placeholder="https://apps.apple.com/app/edubreezy/idXXXXXXXXX"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>App Name</Label>
                            <Input
                                value={form.appName}
                                onChange={(e) => updateField('appName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bundle ID</Label>
                            <Input
                                value={form.bundleId}
                                onChange={(e) => updateField('bundleId', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>EAS Project ID</Label>
                            <Input
                                value={form.easProjectId}
                                onChange={(e) => updateField('easProjectId', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Changelog Manager */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        Changelog
                    </CardTitle>
                    <CardDescription>
                        Manage version history — shown to users when an update is available
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add new entry */}
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                        <p className="text-sm font-medium">Add New Entry</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Version</Label>
                                <Input
                                    value={newChangelogEntry.version}
                                    onChange={(e) => setNewChangelogEntry((p) => ({ ...p, version: e.target.value }))}
                                    placeholder="1.1.0"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Date</Label>
                                <Input
                                    type="date"
                                    value={newChangelogEntry.date}
                                    onChange={(e) => setNewChangelogEntry((p) => ({ ...p, date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Changes (one per line)</Label>
                            <Textarea
                                value={newChangelogEntry.changes}
                                onChange={(e) => setNewChangelogEntry((p) => ({ ...p, changes: e.target.value }))}
                                placeholder="Added geolocation school finder&#10;Fixed login bug on tablets&#10;Improved notification reliability"
                                rows={3}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={addChangelogEntry}>
                            <Plus className="h-3 w-3 mr-1" /> Add Entry
                        </Button>
                    </div>

                    {/* Existing entries */}
                    {form.changelog?.length > 0 ? (
                        <div className="space-y-3">
                            {form.changelog.map((entry, idx) => (
                                <div key={idx} className="flex items-start justify-between border rounded-lg p-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">v{entry.version}</Badge>
                                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                                        </div>
                                        <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                            {(entry.changes || []).map((change, cidx) => (
                                                <li key={cidx}>{change}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => removeChangelogEntry(idx)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-6">
                            No changelog entries yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sticky Save */}
            <div className="flex justify-end pb-6">
                <Button size="lg" onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Save All Changes
                </Button>
            </div>
        </div>
    );
}
