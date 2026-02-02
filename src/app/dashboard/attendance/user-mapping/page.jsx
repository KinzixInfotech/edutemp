'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users, UserPlus, CreditCard, Fingerprint, Loader2, Search, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function UserMapping() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('all');
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isRfidOpen, setIsRfidOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rfidInput, setRfidInput] = useState('');

    // Fetch devices
    const { data: devicesData } = useQuery({
        queryKey: ['biometric-devices', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/devices`);
            if (!res.ok) throw new Error('Failed to fetch devices');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch mappings
    const { data: mappingsData, isLoading: mappingsLoading } = useQuery({
        queryKey: ['biometric-mappings', schoolId, selectedDevice],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedDevice !== 'all') params.append('deviceId', selectedDevice);
            const res = await fetch(`/api/schools/${schoolId}/biometric/mapping?${params}`);
            if (!res.ok) throw new Error('Failed to fetch mappings');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch unmapped users
    const { data: unmappedData, isLoading: unmappedLoading, refetch: refetchUnmapped } = useQuery({
        queryKey: ['unmapped-users', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/rfid/bulk?userType=all&limit=100`);
            if (!res.ok) throw new Error('Failed to fetch unmapped users');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Create mapping mutation
    const mapMutation = useMutation({
        mutationFn: async ({ userId, deviceId }) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/mapping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, deviceId, syncToDevice: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create mapping');
            return data;
        },
        onSuccess: (response) => {
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
            refetchUnmapped();
            setIsMapOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Assign RFID mutation
    const rfidMutation = useMutation({
        mutationFn: async ({ userId, cardUid }) => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/rfid/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, cardUid, syncToDevice: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to assign RFID');
            return data;
        },
        onSuccess: (response) => {
            toast.success('RFID card assigned', { description: response.userName });
            queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
            setIsRfidOpen(false);
            setRfidInput('');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Remove mapping mutation
    const removeMutation = useMutation({
        mutationFn: async ({ userId, deviceId }) => {
            const res = await fetch(
                `/api/schools/${schoolId}/biometric/mapping/${userId}?deviceId=${deviceId}&removeFromDevice=true`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Failed to remove mapping');
            return res.json();
        },
        onSuccess: (response) => {
            toast.success(response.message);
            queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
            refetchUnmapped();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Bulk Sync Users Mutation
    const syncUsersMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/biometric/sync/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId: selectedDevice !== 'all' ? selectedDevice : undefined }),
            });
            if (!res.ok) throw new Error('Sync failed');
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Sync completed');
            queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const devices = devicesData?.devices || [];
    const mappings = mappingsData?.mappings || [];
    const unmappedUsers = unmappedData?.users || [];

    const filteredMappings = search
        ? mappings.filter((m) =>
            m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.user?.email?.toLowerCase().includes(search.toLowerCase())
        )
        : mappings;

    const filteredUnmapped = search
        ? unmappedUsers.filter((u) =>
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
        )
        : unmappedUsers;

    if (!schoolId) return <LoaderPage />;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        User Mapping
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Map users to biometric devices and assign RFID cards
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by device" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Devices</SelectItem>
                            {devices.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    className="pl-10"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{mappings.length}</p>
                                <p className="text-sm text-muted-foreground">Mapped Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                <UserPlus className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{unmappedUsers.length}</p>
                                <p className="text-sm text-muted-foreground">Unmapped</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                                <Fingerprint className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {mappings.filter((m) => m.fingerprintCount > 0).length}
                                </p>
                                <p className="text-sm text-muted-foreground">With Fingerprints</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <CreditCard className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {mappings.filter((m) => m.hasCard).length}
                                </p>
                                <p className="text-sm text-muted-foreground">With RFID Cards</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="mapped">
                <TabsList>
                    <TabsTrigger value="mapped">Mapped Users ({mappings.length})</TabsTrigger>
                    <TabsTrigger value="unmapped">Unmapped Users ({unmappedUsers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="mapped" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Currently Mapped Users</CardTitle>
                                    <CardDescription>
                                        Users enrolled on biometric devices
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => syncUsersMutation.mutate()}
                                    disabled={syncUsersMutation.isPending || mappings.length === 0}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncUsersMutation.isPending ? 'animate-spin' : ''}`} />
                                    Sync Status
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {mappingsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : filteredMappings.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground">No mapped users found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Device</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Enrolled</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredMappings.map((mapping) => (
                                                <TableRow key={mapping.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{mapping.user?.name}</p>
                                                            {mapping.user?.class && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {mapping.user.class} - {mapping.user.section}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{mapping.user?.role}</Badge>
                                                    </TableCell>
                                                    <TableCell>{mapping.device?.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {mapping.fingerprintCount > 0 ? (
                                                                <Badge className="bg-green-500">
                                                                    <Fingerprint className="w-3 h-3 mr-1" />
                                                                    {mapping.fingerprintCount}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    <Fingerprint className="w-3 h-3 mr-1" />
                                                                    0
                                                                </Badge>
                                                            )}
                                                            {mapping.hasCard ? (
                                                                <Badge className="bg-green-500">
                                                                    <CreditCard className="w-3 h-3 mr-1" />
                                                                    Yes
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    <CreditCard className="w-3 h-3 mr-1" />
                                                                    No
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {new Date(mapping.enrolledAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedUser(mapping);
                                                                    setIsRfidOpen(true);
                                                                }}
                                                            >
                                                                <CreditCard className="w-4 h-4 mr-1" />
                                                                RFID
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500"
                                                                onClick={() => removeMutation.mutate({
                                                                    userId: mapping.userId,
                                                                    deviceId: mapping.deviceId,
                                                                })}
                                                            >
                                                                <XCircle className="w-4 h-4" />
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
                </TabsContent>

                <TabsContent value="unmapped" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Users Without Biometric Mapping</CardTitle>
                                    <CardDescription>
                                        Users who haven't been enrolled on any device
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => refetchUnmapped()}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {unmappedLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : filteredUnmapped.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                    <p className="font-medium">All users are mapped!</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>ID</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUnmapped.slice(0, 50).map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{user.name}</p>
                                                            {user.class && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {user.class} - {user.section}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{user.role}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {user.employeeId || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsMapOpen(true);
                                                            }}
                                                        >
                                                            <UserPlus className="w-4 h-4 mr-1" />
                                                            Map
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Map User Dialog */}
            <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Map User to Device</DialogTitle>
                        <DialogDescription>
                            Enroll {selectedUser?.name} on a biometric device
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Select Device</Label>
                            <Select
                                value={selectedDevice}
                                onValueChange={setSelectedDevice}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a device" />
                                </SelectTrigger>
                                <SelectContent>
                                    {devices.filter((d) => d.isEnabled).map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-100">Next Steps:</p>
                            <ol className="list-decimal list-inside mt-2 text-blue-700 dark:text-blue-300 space-y-1">
                                <li>Click "Map User" to register them on the device</li>
                                <li>Go to the physical device</li>
                                <li>Enroll fingerprints using the device menu</li>
                                <li>The system will detect enrollment automatically</li>
                            </ol>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMapOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => mapMutation.mutate({
                                userId: selectedUser?.id,
                                deviceId: selectedDevice,
                            })}
                            disabled={mapMutation.isPending || !selectedDevice || selectedDevice === 'all'}
                        >
                            {mapMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            Map User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RFID Assignment Dialog */}
            <Dialog open={isRfidOpen} onOpenChange={setIsRfidOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign RFID Card</DialogTitle>
                        <DialogDescription>
                            Assign an RFID card to {selectedUser?.user?.name || selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Card UID</Label>
                            <Input
                                placeholder="Scan card or enter UID"
                                value={rfidInput}
                                onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Use a USB RFID reader to scan the card, or enter the UID manually
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRfidOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => rfidMutation.mutate({
                                userId: selectedUser?.userId || selectedUser?.id,
                                cardUid: rfidInput,
                            })}
                            disabled={rfidMutation.isPending || !rfidInput}
                        >
                            {rfidMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CreditCard className="w-4 h-4 mr-2" />
                            )}
                            Assign Card
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
