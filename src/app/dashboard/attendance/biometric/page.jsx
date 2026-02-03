'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Fingerprint, Wifi, WifiOff, Plus, Settings, Trash2, RefreshCw, Loader2,
    CheckCircle, AlertCircle, Server, CreditCard, Pencil, Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function BiometricSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editDevice, setEditDevice] = useState(null);
    const [deleteDevice, setDeleteDevice] = useState(null);
    const [testingDevice, setTestingDevice] = useState(null);
    const [calibratingDevice, setCalibratingDevice] = useState(null);
    const [settingsDevice, setSettingsDevice] = useState(null);
    const [settingsData, setSettingsData] = useState({
        timeFormat: '24hour',
        dateFormat: 'YYYY-MM-DD',
    });
    const [loadingSettings, setLoadingSettings] = useState(false);

    // Form state for new device
    const [formData, setFormData] = useState({
        name: '',
        deviceType: 'COMBO',
        ipAddress: '',
        port: 80,
        username: '',
        password: '',
        connectionType: 'HTTP',
        pollingInterval: 60,
    });

    // Edit form state
    const [editFormData, setEditFormData] = useState({
        name: '',
        deviceType: 'COMBO',
        ipAddress: '',
        port: 80,
        username: '',
        password: '',
        connectionType: 'HTTP',
        pollingInterval: 60,
    });

    // Fetch devices
    const { data, isLoading, isError } = useQuery({
        queryKey: ['biometric-devices', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices`);
            if (!res.ok) throw new Error('Failed to fetch devices');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Add device mutation
    const addMutation = useMutation({
        mutationFn: async (deviceData) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...deviceData, testBeforeSave: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.connectionError || 'Failed to add device');
            return data;
        },
        onSuccess: (response) => {
            toast.success(response.message || 'Device added successfully');
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
            setIsAddOpen(false);
            resetForm();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Edit device mutation
    const editMutation = useMutation({
        mutationFn: async ({ deviceId, deviceData }) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update device');
            return data;
        },
        onSuccess: (response) => {
            toast.success(response.message || 'Device updated successfully');
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
            setIsEditOpen(false);
            setEditDevice(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Test connection mutation
    const testMutation = useMutation({
        mutationFn: async (deviceId) => {
            setTestingDevice(deviceId);
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}/test`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Connection test failed');
            return data;
        },
        onSuccess: (response) => {
            if (response.success) {
                toast.success('Connection successful', {
                    description: response.deviceInfo?.model || 'Device is online',
                });
            } else {
                toast.error('Connection failed', { description: response.error });
            }
            setTestingDevice(null);
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
        },
        onError: (error) => {
            toast.error(error.message);
            setTestingDevice(null);
        },
    });

    // Toggle device mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ deviceId, isEnabled }) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled }),
            });
            if (!res.ok) throw new Error('Failed to toggle device');
            return res.json();
        },
        onSuccess: (response) => {
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Delete device mutation
    const deleteMutation = useMutation({
        mutationFn: async (deviceId) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete device');
            return res.json();
        },
        onSuccess: (response) => {
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
            setDeleteDevice(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Calibrate device (sync time) mutation
    const calibrateMutation = useMutation({
        mutationFn: async (deviceId) => {
            setCalibratingDevice(deviceId);
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}/calibrate`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Calibration failed');
            return data;
        },
        onSuccess: (response) => {
            const diffBefore = response.before?.timeDiff;
            const diffAfter = response.after?.timeDiff;
            toast.success('Device time synchronized', {
                description: diffBefore !== null
                    ? `Time diff: ${Math.abs(diffBefore)}s → ${Math.abs(diffAfter || 0)}s`
                    : 'Device time synced with server',
            });
            setCalibratingDevice(null);
        },
        onError: (error) => {
            toast.error('Calibration failed', { description: error.message });
            setCalibratingDevice(null);
        },
    });

    // Apply settings mutation
    const applySettingsMutation = useMutation({
        mutationFn: async ({ deviceId, settings }) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${deviceId}/calibrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to apply settings');
            return data;
        },
        onSuccess: (response) => {
            toast.success('Settings applied', {
                description: 'Time synced and format settings updated',
            });
            setSettingsDevice(null);
        },
        onError: (error) => {
            toast.error('Failed to apply settings', { description: error.message });
        },
    });

    // Open settings modal
    const openSettingsModal = async (device) => {
        setSettingsDevice(device);
        setLoadingSettings(true);
        try {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices/${device.id}/calibrate`);
            const data = await res.json();
            if (data.success) {
                setSettingsData({
                    timeFormat: data.timeFormat || '24hour',
                    dateFormat: data.dateFormat || 'YYYY-MM-DD',
                });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        setLoadingSettings(false);
    };

    // Sync all mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sinceDays: 1 }),
            });
            if (!res.ok) throw new Error('Sync failed');
            return res.json();
        },
        onSuccess: (response) => {
            toast.success(response.message, {
                description: `New events: ${response.summary?.newEventsTotal || 0}`,
            });
            queryClient.invalidateQueries({ queryKey: ['biometric-devices', schoolId] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            deviceType: 'COMBO',
            ipAddress: '',
            port: 80,
            username: '',
            password: '',
            connectionType: 'HTTP',
            pollingInterval: 60,
        });
    };

    const openEditModal = (device) => {
        setEditDevice(device);
        setEditFormData({
            name: device.name,
            deviceType: device.deviceType,
            ipAddress: device.ipAddress,
            port: device.port,
            username: '', // Don't pre-fill for security
            password: '', // Don't pre-fill for security
            connectionType: device.connectionType,
            pollingInterval: device.pollingInterval,
        });
        setIsEditOpen(true);
    };

    const getStatusBadge = (device) => {
        if (!device.isEnabled) {
            return <Badge variant="secondary">Disabled</Badge>;
        }
        if (device.lastSyncStatus === 'SUCCESS') {
            return <Badge className="bg-green-500">Online</Badge>;
        }
        if (device.lastSyncStatus === 'FAILED') {
            return <Badge variant="destructive">Offline</Badge>;
        }
        return <Badge variant="outline">Not synced</Badge>;
    };

    const getDeviceTypeIcon = (type) => {
        switch (type) {
            case 'FINGERPRINT':
                return <Fingerprint className="w-4 h-4" />;
            case 'RFID':
                return <CreditCard className="w-4 h-4" />;
            default:
                return <Server className="w-4 h-4" />;
        }
    };

    if (!schoolId) return <LoaderPage />;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="font-semibold text-lg">Failed to load devices</h3>
                        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const devices = data?.devices || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Fingerprint className="w-8 h-8 text-blue-600" />
                        Biometric Devices
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage fingerprint and RFID devices for attendance tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending || devices.length === 0}
                    >
                        {syncMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Sync Now
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Device
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add Biometric Device</DialogTitle>
                                <DialogDescription>
                                    Enter the device details. Connection will be tested before saving.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label>Device Name</Label>
                                        <Input
                                            placeholder="e.g., Main Gate Entry"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Device Type</Label>
                                        <Select
                                            value={formData.deviceType}
                                            onValueChange={(value) => setFormData({ ...formData, deviceType: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="COMBO">Fingerprint + RFID</SelectItem>
                                                <SelectItem value="FINGERPRINT">Fingerprint Only</SelectItem>
                                                <SelectItem value="RFID">RFID Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Connection Type</Label>
                                        <Select
                                            value={formData.connectionType}
                                            onValueChange={(value) => setFormData({ ...formData, connectionType: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HTTP">HTTP</SelectItem>
                                                <SelectItem value="HTTPS">HTTPS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>IP Address</Label>
                                        <Input
                                            placeholder="192.168.1.100"
                                            value={formData.ipAddress}
                                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Port</Label>
                                        <Input
                                            type="number"
                                            value={formData.port}
                                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Username</Label>
                                        <Input
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Polling Interval (seconds)</Label>
                                        <Input
                                            type="number"
                                            min={30}
                                            max={3600}
                                            value={formData.pollingInterval}
                                            onChange={(e) => setFormData({ ...formData, pollingInterval: parseInt(e.target.value) })}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            How often to fetch attendance events from this device
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => addMutation.mutate(formData)}
                                    disabled={addMutation.isPending || !formData.name || !formData.ipAddress}
                                >
                                    {addMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        'Add Device'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Server className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{devices.length}</p>
                                <p className="text-sm text-muted-foreground">Total Devices</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                <Wifi className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {devices.filter((d) => d.isEnabled && d.lastSyncStatus === 'SUCCESS').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Online</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Fingerprint className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {devices.reduce((sum, d) => sum + (d.mappedUsers || 0), 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">Mapped Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Devices Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Connected Devices</CardTitle>
                    <CardDescription>
                        Manage biometric devices and their connection status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {devices.length === 0 ? (
                        <div className="text-center py-12">
                            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">No devices configured</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add your first biometric device to start tracking attendance
                            </p>
                            <Button onClick={() => setIsAddOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Device
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Device</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Mapped</TableHead>
                                        <TableHead>Last Sync</TableHead>
                                        <TableHead>Enabled</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {devices.map((device) => (
                                        <TableRow key={device.id}>
                                            <TableCell className="font-medium">{device.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getDeviceTypeIcon(device.deviceType)}
                                                    <span className="text-sm capitalize">
                                                        {device.deviceType.toLowerCase()}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                                    {device.ipAddress}:{device.port}
                                                </code>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(device)}</TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {device.mappedUsers} users, {device.mappedCards} cards
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {device.lastSyncedAt ? (
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(device.lastSyncedAt).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Never</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={device.isEnabled}
                                                    onCheckedChange={(checked) =>
                                                        toggleMutation.mutate({
                                                            deviceId: device.id,
                                                            isEnabled: checked,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditModal(device)}
                                                        title="Edit device"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => testMutation.mutate(device.id)}
                                                        disabled={testingDevice === device.id}
                                                        title="Test connection"
                                                    >
                                                        {testingDevice === device.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Wifi className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => calibrateMutation.mutate(device.id)}
                                                        disabled={calibratingDevice === device.id}
                                                        title="Sync device time"
                                                    >
                                                        {calibratingDevice === device.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Clock className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openSettingsModal(device)}
                                                        title="Time/Date Settings"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => setDeleteDevice(device)}
                                                        title="Delete device"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Device Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Device</DialogTitle>
                        <DialogDescription>
                            Update device settings. Leave username/password blank to keep existing credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Device Name</Label>
                                <Input
                                    placeholder="e.g., Main Gate Entry"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Device Type</Label>
                                <Select
                                    value={editFormData.deviceType}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, deviceType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COMBO">Fingerprint + RFID</SelectItem>
                                        <SelectItem value="FINGERPRINT">Fingerprint Only</SelectItem>
                                        <SelectItem value="RFID">RFID Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Connection Type</Label>
                                <Select
                                    value={editFormData.connectionType}
                                    onValueChange={(value) => setEditFormData({ ...editFormData, connectionType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HTTP">HTTP</SelectItem>
                                        <SelectItem value="HTTPS">HTTPS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>IP Address</Label>
                                <Input
                                    placeholder="192.168.1.100"
                                    value={editFormData.ipAddress}
                                    onChange={(e) => setEditFormData({ ...editFormData, ipAddress: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Port</Label>
                                <Input
                                    type="number"
                                    value={editFormData.port}
                                    onChange={(e) => setEditFormData({ ...editFormData, port: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label>Username <span className="text-xs text-muted-foreground">(blank = keep existing)</span></Label>
                                <Input
                                    placeholder="Leave blank to keep"
                                    value={editFormData.username}
                                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Password <span className="text-xs text-muted-foreground">(blank = keep existing)</span></Label>
                                <Input
                                    type="password"
                                    placeholder="Leave blank to keep"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Polling Interval (seconds)</Label>
                                <Input
                                    type="number"
                                    min={30}
                                    max={3600}
                                    value={editFormData.pollingInterval}
                                    onChange={(e) => setEditFormData({ ...editFormData, pollingInterval: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                // Only send non-empty credentials
                                const updateData = { ...editFormData };
                                if (!updateData.username) delete updateData.username;
                                if (!updateData.password) delete updateData.password;
                                editMutation.mutate({ deviceId: editDevice?.id, deviceData: updateData });
                            }}
                            disabled={editMutation.isPending || !editFormData.name || !editFormData.ipAddress}
                        >
                            {editMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Device Time/Date Settings Modal */}
            <Dialog open={!!settingsDevice} onOpenChange={() => setSettingsDevice(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Time & Date Settings
                        </DialogTitle>
                        <DialogDescription>
                            Configure time and date display format for "{settingsDevice?.name}"
                        </DialogDescription>
                    </DialogHeader>
                    {loadingSettings ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Time Format</Label>
                                <Select
                                    value={settingsData.timeFormat}
                                    onValueChange={(value) => setSettingsData({ ...settingsData, timeFormat: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24hour">24-Hour (14:30)</SelectItem>
                                        <SelectItem value="12hour">12-Hour (2:30 PM)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Date Format</Label>
                                <Select
                                    value={settingsData.dateFormat}
                                    onValueChange={(value) => setSettingsData({ ...settingsData, dateFormat: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-02-03)</SelectItem>
                                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (03-02-2026)</SelectItem>
                                        <SelectItem value="MM-DD-YYYY">MM-DD-YYYY (02-03-2026)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                <p className="font-medium">Note:</p>
                                <p className="text-muted-foreground">
                                    Applying settings will also sync the device time with the server.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsDevice(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => applySettingsMutation.mutate({
                                deviceId: settingsDevice?.id,
                                settings: settingsData,
                            })}
                            disabled={applySettingsMutation.isPending || loadingSettings}
                        >
                            {applySettingsMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Applying...
                                </>
                            ) : (
                                'Apply Settings'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteDevice} onOpenChange={() => setDeleteDevice(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Device?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove "{deleteDevice?.name}" and disconnect all mapped users.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(deleteDevice?.id)}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
