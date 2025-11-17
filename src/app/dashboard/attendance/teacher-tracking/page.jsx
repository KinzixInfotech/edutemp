'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    MapPin, Clock, Smartphone, Award, TrendingUp, RefreshCw,
    Download, Filter, Eye, Navigation
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

export default function TeacherTracking() {
     const { fullUser } = useAuth();
     const schoolId = fullUser?.schoolId;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['teacher-tracking', schoolId, date],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/teacher-tracking?date=${date}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchInterval: 30000,
    });

    const { summary, teachers, locations } = data || {};

    const filteredTeachers = teachers?.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const openInMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <MapPin className="w-8 h-8 text-blue-600" />
                        Teacher Tracking & Monitoring
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time GPS tracking and attendance monitoring
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                placeholder="Search by name or employee ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-blue-500">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Teachers</p>
                            <p className="text-3xl font-bold text-blue-600">{summary?.total || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-green-500">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Checked In</p>
                            <p className="text-3xl font-bold text-green-600">{summary?.checkedIn || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-yellow-500">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Late Check-ins</p>
                            <p className="text-3xl font-bold text-yellow-600">{summary?.late || 0}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-purple-500">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Avg Hours</p>
                            <p className="text-3xl font-bold text-purple-600">{summary?.avgWorkingHours || 0}h</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="list" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    <TabsTrigger value="map">Map View</TabsTrigger>
                    <TabsTrigger value="leaderboard">Streak Leaderboard</TabsTrigger>
                </TabsList>

                {/* List View */}
                <TabsContent value="list">
                    <Card>
                        <CardHeader>
                            <CardTitle>Teacher Activity</CardTitle>
                            <CardDescription>Detailed check-in/out records with location and device info</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {filteredTeachers.map((teacher) => (
                                    <Card key={teacher.userId} className="hover:shadow-md transition-shadow">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-4">
                                                {/* Profile */}
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                                                    {teacher.name.charAt(0)}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold">{teacher.name}</h4>
                                                        <Badge variant={
                                                            teacher.status === 'PRESENT' ? 'default' :
                                                                teacher.status === 'LATE' ? 'warning' : 'destructive'
                                                        }>
                                                            {teacher.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {teacher.employeeId} • {teacher.designation}
                                                    </p>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        {/* Check-in */}
                                                        <div>
                                                            <p className="text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Check-in
                                                            </p>
                                                            <p className="font-medium">
                                                                {teacher.checkInTime ? new Date(teacher.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            </p>
                                                            {teacher.isLateCheckIn && (
                                                                <p className="text-xs text-yellow-600">Late by {teacher.lateByMinutes}m</p>
                                                            )}
                                                        </div>

                                                        {/* Check-out */}
                                                        <div>
                                                            <p className="text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Check-out
                                                            </p>
                                                            <p className="font-medium">
                                                                {teacher.checkOutTime ? new Date(teacher.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            </p>
                                                        </div>

                                                        {/* Working Hours */}
                                                        <div>
                                                            <p className="text-muted-foreground flex items-center gap-1">
                                                                <TrendingUp className="w-3 h-3" /> Hours
                                                            </p>
                                                            <p className="font-medium">{teacher.workingHours.toFixed(2)}h</p>
                                                        </div>

                                                        {/* Streak */}
                                                        <div>
                                                            <p className="text-muted-foreground flex items-center gap-1">
                                                                <Award className="w-3 h-3" /> Streak
                                                            </p>
                                                            <p className="font-medium text-purple-600">{teacher.consecutiveDays} days</p>
                                                        </div>
                                                    </div>

                                                    {/* Location & Device */}
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {teacher.checkInLocation && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openInMaps(teacher.checkInLocation.latitude, teacher.checkInLocation.longitude)}
                                                            >
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                View Location
                                                            </Button>
                                                        )}
                                                        {teacher.deviceInfo && (
                                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                                <Smartphone className="w-3 h-3" />
                                                                {teacher.deviceInfo.platform} • {teacher.deviceInfo.deviceId}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Remarks */}
                                                    {teacher.remarks && (
                                                        <p className="mt-2 text-sm text-muted-foreground italic">
                                                            Note: {teacher.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Map View */}
                <TabsContent value="map">
                    <Card>
                        <CardHeader>
                            <CardTitle>Check-in Locations Map</CardTitle>
                            <CardDescription>GPS coordinates of all teacher check-ins</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="bg-gray-100 rounded-lg p-4 text-center h-96 flex items-center justify-center">
                                    <div className="text-muted-foreground">
                                        <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="mb-2">Interactive Map View</p>
                                        <p className="text-sm">Integrate Google Maps API here</p>
                                        <p className="text-xs mt-2">Locations: {locations?.length || 0} teachers</p>
                                    </div>
                                </div>

                                {/* Location List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {locations?.map((loc) => (
                                        <Card key={loc.userId} className="cursor-pointer hover:shadow-md" onClick={() => openInMaps(loc.latitude, loc.longitude)}>
                                            <CardContent className="pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{loc.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(loc.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline">
                                                            {loc.status}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leaderboard */}
                <TabsContent value="leaderboard">
                    <Card>
                        <CardHeader>
                            <CardTitle>Streak Leaderboard</CardTitle>
                            <CardDescription>Top teachers with consecutive attendance days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[...filteredTeachers]
                                    .sort((a, b) => b.consecutiveDays - a.consecutiveDays)
                                    .slice(0, 10)
                                    .map((teacher, idx) => (
                                        <div key={teacher.userId} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${idx === 0 ? 'bg-yellow-500 text-white' :
                                                    idx === 1 ? 'bg-gray-400 text-white' :
                                                        idx === 2 ? 'bg-orange-600 text-white' :
                                                            'bg-blue-100 text-blue-600'}
                      `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{teacher.name}</p>
                                                <p className="text-sm text-muted-foreground">{teacher.employeeId}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="default" className="flex items-center gap-1">
                                                    <Award className="w-4 h-4" />
                                                    {teacher.consecutiveDays} days
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}