'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    MapPin, Clock, Smartphone, Award, TrendingUp, RefreshCw,
    Download, Search, Users, History, ChevronLeft, ChevronRight,
    CheckCircle, XCircle, AlertCircle, Calendar, Phone, Mail, User
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function TeacherTracking() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [teacherId, setTeacherId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [recentTeachers, setRecentTeachers] = useState([]);

    // Load recent teachers from localStorage
    useEffect(() => {
        if (schoolId) {
            const stored = localStorage.getItem(`recent-teachers-${schoolId}`);
            if (stored) {
                setRecentTeachers(JSON.parse(stored));
            }
        }
    }, [schoolId]);

    // Save to recent teachers
    const addToRecentTeachers = (teacher) => {
        const recent = [teacher, ...recentTeachers.filter(t => t.userId !== teacher.userId)].slice(0, 6);
        setRecentTeachers(recent);
        localStorage.setItem(`recent-teachers-${schoolId}`, JSON.stringify(recent));
    };

    // Fetch all teachers for tracking (today's data)
    const { data: trackingData, isLoading: trackingLoading, refetch } = useQuery({
        queryKey: ['teacher-tracking', schoolId, date],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/teacher-tracking?date=${date}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchInterval: 30000,
        enabled: !!schoolId && !teacherId
    });

    // Fetch teacher history when a teacher is selected
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['teacher-history', schoolId, teacherId, month, year],
        queryFn: async () => {
            const params = new URLSearchParams({
                teacherId,
                month: month.toString(),
                year: year.toString()
            });
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/teacher-history?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!teacherId && !!schoolId
    });

    const { summary, teachers, locations } = trackingData || {};
    const { teacher, period, stats, leaves, calendar, records } = historyData || {};

    const filteredTeachers = teachers?.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleSelectTeacher = (t) => {
        setTeacherId(t.userId);
        addToRecentTeachers(t);
    };

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const openInMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-500';
            case 'ABSENT': return 'bg-red-500';
            case 'LATE': return 'bg-yellow-500';
            case 'ON_LEAVE': return 'bg-blue-500';
            case 'HALF_DAY': return 'bg-orange-500';
            default: return 'bg-gray-200';
        }
    };

    const cn = (...classes) => classes.filter(Boolean).join(' ');

    if (!schoolId) return <LoaderPage />;

    // Teacher Search/Selection View
    if (!teacherId) {
        if (trackingLoading) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <MapPin className="w-7 h-7 text-primary" />
                            Teacher Tracking
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Search and view detailed attendance history for any teacher
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-auto"
                        />
                        <Button variant="outline" onClick={() => refetch()}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Teachers</p>
                                    <p className="text-2xl font-bold text-primary">{summary?.total || 0}</p>
                                </div>
                                <Users className="w-10 h-10 text-primary/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Checked In</p>
                                    <p className="text-2xl font-bold text-green-600">{summary?.checkedIn || 0}</p>
                                </div>
                                <CheckCircle className="w-10 h-10 text-green-500/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Late Check-ins</p>
                                    <p className="text-2xl font-bold text-yellow-600">{summary?.late || 0}</p>
                                </div>
                                <Clock className="w-10 h-10 text-yellow-500/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Hours</p>
                                    <p className="text-2xl font-bold text-purple-600">{summary?.avgWorkingHours || 0}h</p>
                                </div>
                                <TrendingUp className="w-10 h-10 text-purple-500/20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Search Teacher
                        </CardTitle>
                        <CardDescription>Find by name, email, or employee ID to view detailed history</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    placeholder="Type teacher name, email, or employee ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 h-12 text-lg"
                                />
                            </div>

                            {/* Search Results */}
                            {searchQuery && filteredTeachers.length > 0 ? (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Found {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                        {filteredTeachers.slice(0, 12).map((t) => (
                                            <Card
                                                key={t.userId}
                                                className="cursor-pointer hover:border-primary transition-all"
                                                onClick={() => handleSelectTeacher(t)}
                                            >
                                                <CardContent className="pt-4 pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
                                                            {t.profilePicture ? (
                                                                <img
                                                                    src={t.profilePicture}
                                                                    className='rounded-full object-cover w-12 h-12'
                                                                    alt={t.name}
                                                                />
                                                            ) : (
                                                                t.name?.charAt(0) || 'T'
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold truncate">{t.name}</h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {t.employeeId} • {t.designation}
                                                            </p>
                                                            <Badge variant={
                                                                t.status === 'PRESENT' ? 'default' :
                                                                    t.status === 'LATE' ? 'warning' : 'destructive'
                                                            } className="mt-1">
                                                                {t.status || 'Not Marked'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : searchQuery ? (
                                <div className="text-center py-12">
                                    <Users className="w-16 h-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-lg font-medium">No teachers found</p>
                                    <p className="text-sm text-muted-foreground">
                                        No teachers match "{searchQuery}"
                                    </p>
                                </div>
                            ) : null}

                            {/* Recent Teachers */}
                            {!searchQuery && recentTeachers.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <History className="w-4 h-4 text-muted-foreground" />
                                        <h3 className="font-semibold text-sm">Recently Viewed</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {recentTeachers.map((t) => (
                                            <Card
                                                key={t.userId}
                                                className="cursor-pointer hover:border-primary transition-all"
                                                onClick={() => handleSelectTeacher(t)}
                                            >
                                                <CardContent className="pt-4 pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-xl font-bold text-purple-600 flex-shrink-0">
                                                            {t.profilePicture ? (
                                                                <img
                                                                    src={t.profilePicture}
                                                                    className='rounded-full object-cover w-12 h-12'
                                                                    alt={t.name}
                                                                />
                                                            ) : (
                                                                t.name?.charAt(0) || 'T'
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold truncate">{t.name}</h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {t.employeeId}
                                                            </p>
                                                            <Badge variant="secondary" className="mt-1">
                                                                {t.designation}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {!searchQuery && recentTeachers.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="w-16 h-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-lg font-medium">Start Searching</p>
                                    <p className="text-sm text-muted-foreground">
                                        Type a teacher name, email, or employee ID to begin
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Teacher History View
    if (historyLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading attendance data...</p>
            </div>
        );
    }

    const today = new Date();

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Teacher Attendance History</h1>
                <Button variant="outline" size="sm" onClick={() => setTeacherId('')}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Change Teacher
                </Button>
            </div>

            {/* Teacher Profile Card */}
            <Card className="border">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Profile Picture */}
                        <div className="w-20 h-20 rounded-full bg-primary/10 border-2 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 overflow-hidden">
                            {teacher?.profilePicture ? (
                                <img
                                    src={teacher.profilePicture}
                                    alt={teacher.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                teacher?.name?.charAt(0) || 'T'
                            )}
                        </div>

                        {/* Teacher Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold mb-2">{teacher?.name}</h2>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline">
                                    {teacher?.designation}
                                </Badge>
                                {teacher?.department && (
                                    <Badge variant="secondary">
                                        {teacher.department}
                                    </Badge>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>{teacher?.employeeId}</span>
                                </div>
                                {teacher?.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{teacher.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Streak & Attendance */}
                        <div className="flex gap-3 sm:gap-4 flex-shrink-0">
                            {/* Streak */}
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <p className="text-xl font-bold text-orange-600">{stats?.streak || 0}</p>
                                    <p className="text-[10px] text-orange-600/70">Day Streak</p>
                                </div>
                            </div>

                            {/* Attendance % */}
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border">
                                <TrendingUp className="w-6 h-6 text-primary" />
                                <div>
                                    <p className="text-xl font-bold text-primary">{stats?.attendancePercentage?.toFixed(0) || 0}%</p>
                                    <p className="text-[10px] text-muted-foreground">Attendance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Leave Balance */}
            {leaves && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Casual Leave</p>
                        <p className="text-lg font-semibold">{leaves.casual.balance}<span className="text-sm text-muted-foreground">/{leaves.casual.total}</span></p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Sick Leave</p>
                        <p className="text-lg font-semibold">{leaves.sick.balance}<span className="text-sm text-muted-foreground">/{leaves.sick.total}</span></p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Earned Leave</p>
                        <p className="text-lg font-semibold">{leaves.earned.balance}<span className="text-sm text-muted-foreground">/{leaves.earned.total}</span></p>
                    </div>
                    <div className="p-3 rounded-lg border bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Maternity Leave</p>
                        <p className="text-lg font-semibold">{leaves.maternity.balance}<span className="text-sm text-muted-foreground">/{leaves.maternity.total}</span></p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Present</p>
                                <p className="text-2xl font-bold text-green-600">{stats?.totalPresent || 0}</p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Absent</p>
                                <p className="text-2xl font-bold text-red-600">{stats?.totalAbsent || 0}</p>
                            </div>
                            <XCircle className="w-10 h-10 text-red-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Late</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats?.totalLate || 0}</p>
                            </div>
                            <Clock className="w-10 h-10 text-yellow-500/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">On Leave</p>
                                <p className="text-2xl font-bold text-blue-600">{stats?.totalLeaves || 0}</p>
                            </div>
                            <AlertCircle className="w-10 h-10 text-blue-500/20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Month Navigation */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={handlePrevMonth}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>
                        <h3 className="text-lg font-semibold">
                            {period?.monthName} {period?.year}
                        </h3>
                        <Button
                            variant="outline"
                            onClick={handleNextMonth}
                            disabled={month === new Date().getMonth() + 1 && year === new Date().getFullYear()}
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                    <TabsTrigger value="list">Detailed List</TabsTrigger>
                </TabsList>

                {/* Calendar View */}
                <TabsContent value="calendar">
                    <Card className="border">
                        <CardHeader className="pb-4">
                            <CardTitle>Monthly Calendar</CardTitle>
                            <CardDescription>Color-coded attendance calendar</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Calendar Grid */}
                            <div className="flex flex-col">
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <div
                                            key={day}
                                            className="text-center text-xs font-medium text-muted-foreground py-2"
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                    {calendar?.map((day, idx) => {
                                        const isToday = day.day === today.getDate() &&
                                            month === today.getMonth() + 1 &&
                                            year === today.getFullYear();

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-lg border transition-colors",
                                                    !day.isWorkingDay && "opacity-40 bg-muted/20",
                                                    isToday && "bg-primary/10 border-primary",
                                                    !isToday && day.isWorkingDay && "border-border bg-card hover:bg-muted/50"
                                                )}
                                                title={day.marked ? `${day.status}` : 'Not marked'}
                                            >
                                                <div className="flex flex-col h-full">
                                                    <span className={cn(
                                                        "text-xs font-medium mb-1",
                                                        isToday && "text-primary font-bold"
                                                    )}>
                                                        {day.day}
                                                    </span>
                                                    {day.marked && (
                                                        <div
                                                            className={cn(
                                                                "text-[9px] sm:text-xs px-1.5 py-0.5 rounded text-white font-medium flex items-center justify-center",
                                                                getStatusColor(day.status)
                                                            )}
                                                        >
                                                            <span className="hidden sm:inline">{day.status}</span>
                                                            <span className="sm:hidden">{day.status?.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                    {day.isLateCheckIn && (
                                                        <p className="text-[8px] text-yellow-600 mt-0.5">+{day.lateByMinutes}m</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-3 sm:gap-4 justify-center text-xs sm:text-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-green-500"></div>
                                    <span>Present</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-red-500"></div>
                                    <span>Absent</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-yellow-500"></div>
                                    <span>Late</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                                    <span>On Leave</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* List View */}
                <TabsContent value="list">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Records</CardTitle>
                            <CardDescription>Complete attendance history with check-in details</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {records?.map((record, idx) => (
                                    <Card key={idx} className="border">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-medium">
                                                            {new Date(record.date).toLocaleDateString('en-IN', {
                                                                weekday: 'short',
                                                                day: 'numeric',
                                                                month: 'short'
                                                            })}
                                                        </p>
                                                        <Badge variant={
                                                            record.status === 'PRESENT' ? 'default' :
                                                                record.status === 'LATE' ? 'warning' :
                                                                    record.status === 'ABSENT' ? 'destructive' : 'secondary'
                                                        }>
                                                            {record.status}
                                                        </Badge>
                                                        {record.isLateCheckIn && (
                                                            <Badge variant="outline" className="text-yellow-600">
                                                                Late by {record.lateByMinutes}m
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Check-in</p>
                                                            <p className="font-medium">
                                                                {record.checkInTime
                                                                    ? new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                                    : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Check-out</p>
                                                            <p className="font-medium">
                                                                {record.checkOutTime
                                                                    ? new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                                    : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Hours</p>
                                                            <p className="font-medium">
                                                                {record.workingHours ? `${record.workingHours.toFixed(2)}h` : '—'}
                                                            </p>
                                                        </div>
                                                        {record.deviceInfo && (
                                                            <div>
                                                                <p className="text-muted-foreground">Device</p>
                                                                <p className="font-medium flex items-center gap-1">
                                                                    <Smartphone className="w-3 h-3" />
                                                                    {record.deviceInfo.platform || 'Unknown'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {record.checkInLocation && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openInMaps(record.checkInLocation.latitude, record.checkInLocation.longitude)}
                                                    >
                                                        <MapPin className="w-4 h-4 mr-1" />
                                                        View Location
                                                    </Button>
                                                )}
                                            </div>

                                            {record.remarks && (
                                                <p className="mt-2 text-sm text-muted-foreground italic">
                                                    Note: {record.remarks}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}

                                {(!records || records.length === 0) && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No attendance records for this month</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}