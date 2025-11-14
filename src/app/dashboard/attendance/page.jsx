'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Download,
    RefreshCw,
    Filter,
    Search,
    Eye,
    Edit,
    FileText,
    UserCheck,
    UserX,
    Trophy,
    Target,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { AttendanceTrendChart } from '@/components/chart_dynamic';

// ===== DATE UTILITY FUNCTIONS (OUTSIDE COMPONENT) =====

const getISTDateString = (dateInput = new Date()) => {
    let date;

    if (typeof dateInput === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        }
        date = new Date(dateInput);
    } else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return null;

    const offset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + offset);
    return istDate.toISOString().split('T')[0];
};

const formatDateForAPI = (dateInput) => getISTDateString(dateInput);

const formatIST = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};


// ✅ CRITICAL: Match attendance data (handles +1 day offset for IST)
const getAttendanceForDate = (date, monthlyTrend) => {
    if (!monthlyTrend) return null;

    // Calendar date: "2025-11-12"
    const dateStr = getISTDateString(date);

    // Find matching attendance
    return monthlyTrend.find(d => {
        const serverDate = d.date; // API: "2025-11-11T00:00:00.000Z"
        if (!serverDate) return false;

        // Handle ISO timestamp format
        if (typeof serverDate === 'string' && serverDate.includes('T')) {
            // Extract date part: "2025-11-11"
            const apiDateOnly = serverDate.split('T')[0];
            // Add 1 day for IST display: "2025-11-11" -> "2025-11-12"
            const apiDate = new Date(apiDateOnly + 'T00:00:00.000Z');
            const nextDay = new Date(apiDate.getTime() + 24 * 60 * 60 * 1000);
            const displayDate = nextDay.toISOString().split('T')[0];

            return displayDate === dateStr;
        }

        // Fallback: direct comparison
        return serverDate === dateStr;
    }) || null;
};

// ===== MAIN COMPONENT =====

export default function AdminAttendanceDashboard() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // State Management
    const [currentDate, setCurrentDate] = useState(() => {
        const now = new Date();
        const offset = 5.5 * 60 * 60 * 1000;
        const ist = new Date(now.getTime() + offset);
        return new Date(ist.getFullYear(), ist.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isMarkOpen, setIsMarkOpen] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);

    // Form state for marking attendance
    const [markForm, setMarkForm] = useState({
        userId: '',
        date: formatDateForAPI(new Date()),
        status: 'PRESENT',
        checkInTime: '',
        checkOutTime: '',
        remarks: ''
    });

    // Fetch Dashboard Data
    const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
        queryKey: ['attendance-dashboard', schoolId, getISTDateString(currentDate), selectedRole, selectedClass],
        queryFn: async () => {
            const params = new URLSearchParams({
                date: getISTDateString(currentDate),
                ...(selectedRole !== 'all' && { roleId: selectedRole }),
                ...(selectedClass !== 'all' && { classId: selectedClass })
            });
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard?${params}`);
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 2,
        keepPreviousData: true,
    });

    // Fetch Pending Approvals
    const { data: approvalsData, refetch: refetchApprovals } = useQuery({
        queryKey: ['attendance-approvals', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/approvals?status=PENDING`);
            if (!res.ok) throw new Error('Failed to fetch approvals');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60,
    });

    // Fetch Leave Requests
    const { data: leavesData, refetch: refetchLeaves } = useQuery({
        queryKey: ['leave-requests', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/leaves?status=PENDING`);
            if (!res.ok) throw new Error('Failed to fetch leaves');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60,
    });

    // Fetch Classes
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed to fetch classes');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch Roles
    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await fetch('/api/roles');
            if (!res.ok) throw new Error('Failed to fetch roles');
            return res.json();
        },
    });

    // Mark Attendance Mutation
    const markAttendanceMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendances: [data],
                    markedBy: fullUser.id
                })
            });
            if (!res.ok) throw new Error('Failed to mark attendance');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance-dashboard']);
            setIsMarkOpen(false);
            resetMarkForm();
        }
    });

    // Approve/Reject Mutation
    const approvalMutation = useMutation({
        mutationFn: async ({ attendanceIds, action, remarks }) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/approvals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceIds,
                    action,
                    approvedBy: fullUser.id,
                    remarks
                })
            });
            if (!res.ok) throw new Error('Failed to process approval');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance-approvals']);
            queryClient.invalidateQueries(['attendance-dashboard']);
            setIsApprovalOpen(false);
            setSelectedApproval(null);
        }
    });

    // Helper Functions
    const resetMarkForm = () => {
        setMarkForm({
            userId: '',
            date: formatDateForAPI(new Date()),
            status: 'PRESENT',
            checkInTime: '',
            checkOutTime: '',
            remarks: ''
        });
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleDateClick = (day) => {
        if (day.isCurrentMonth) {
            setCurrentDate(day.fullDate);
            setSelectedDate(day.fullDate);
        }
    };

    // Generate Calendar Days
    const getDaysInMonth = useCallback(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        // Previous month padding
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthLastDay - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthLastDay - i),
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const fullDate = new Date(year, month, i);
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: fullDate,
            });
        }

        // Next month padding
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return days;
    }, [currentDate]);

    const formatDate = (dateInput) => formatIST(dateInput);

    const getStatusColor = (status) => {
        const colors = {
            PRESENT: 'bg-green-500',
            ABSENT: 'bg-red-500',
            LATE: 'bg-yellow-500',
            HALF_DAY: 'bg-orange-500',
            ON_LEAVE: 'bg-blue-500',
            HOLIDAY: 'bg-purple-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusBadge = (status) => {
        const variants = {
            PRESENT: 'bg-green-100 text-green-700',
            ABSENT: 'bg-red-100 text-red-700',
            LATE: 'bg-yellow-100 text-yellow-700',
            HALF_DAY: 'bg-orange-100 text-orange-700',
            ON_LEAVE: 'bg-blue-100 text-blue-700',
            HOLIDAY: 'bg-purple-100 text-purple-700'
        };
        return variants[status] || 'bg-gray-100 text-gray-700';
    };

    const days = useMemo(() => getDaysInMonth(), [getDaysInMonth]);
    const monthYear = useMemo(() =>
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        [currentDate]
    );

    if (dashboardLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading attendance data...</p>
                </div>
            </div>
        );
    }

    const { todayOverview, roleWiseStats, classWiseStats, alerts, recentActivity, lowAttendanceUsers } = dashboardData || {};

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <UserCheck className="w-8 h-8 text-blue-600" />
                        Attendance Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track and manage attendance across your school
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetchDashboard()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setIsMarkOpen(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Mark Attendance
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {roles?.map((role) => (
                                    <SelectItem key={role.id} value={role.id.toString()}>
                                        {role.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {classes?.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="PRESENT">Present</SelectItem>
                                <SelectItem value="ABSENT">Absent</SelectItem>
                                <SelectItem value="LATE">Late</SelectItem>
                                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 opacity-80" />
                            <span className="text-2xl font-bold">{todayOverview?.total || 0}</span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Users</h3>
                        <p className="text-xs opacity-75 mt-1">Active in system</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                            <span className="text-2xl font-bold">{todayOverview?.present || 0}</span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Present Today</h3>
                        <p className="text-xs opacity-75 mt-1">
                            {todayOverview?.total ? ((todayOverview.present / todayOverview.total) * 100).toFixed(1) : 0}% attendance
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <XCircle className="w-8 h-8 opacity-80" />
                            <span className="text-2xl font-bold">{todayOverview?.absent || 0}</span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Absent Today</h3>
                        <p className="text-xs opacity-75 mt-1">Requires attention</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-8 h-8 opacity-80" />
                            <span className="text-2xl font-bold">{todayOverview?.notMarked || 0}</span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Not Marked</h3>
                        <p className="text-xs opacity-75 mt-1">Pending marking</p>
                    </CardContent>
                </Card>
            </div>
            <AttendanceTrendChart monthlyTrend={dashboardData?.monthlyTrend} />
            {/* Status Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { status: 'PRESENT', count: todayOverview?.present, icon: CheckCircle, color: 'green' },
                    { status: 'ABSENT', count: todayOverview?.absent, icon: XCircle, color: 'red' },
                    { status: 'LATE', count: todayOverview?.late, icon: Clock, color: 'yellow' },
                    { status: 'HALF_DAY', count: todayOverview?.halfDay, icon: Clock, color: 'orange' },
                    { status: 'ON_LEAVE', count: todayOverview?.onLeave, icon: FileText, color: 'blue' }
                ].map(({ status, count, icon: Icon, color }) => (
                    <Card key={status} className={`border-l-4 border-${color}-500`}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{status.replace('_', ' ')}</p>
                                    <p className={`text-2xl font-bold text-${color}-600`}>{count || 0}</p>
                                </div>
                                <Icon className={`w-10 h-10 text-${color}-500 opacity-20`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="calendar" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                    <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                    <TabsTrigger value="rolewise">Role-wise Stats</TabsTrigger>
                    <TabsTrigger value="classwise">Class-wise Stats</TabsTrigger>
                    <TabsTrigger value="approvals">
                        Approvals
                        {alerts?.pendingApprovals > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {alerts.pendingApprovals}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="leaves">
                        Leave Requests
                        {alerts?.pendingLeaves > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {alerts.pendingLeaves}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="lowattendance">Low Attendance</TabsTrigger>
                </TabsList>

                {/* Calendar View */}
                <TabsContent value="calendar">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{monthYear}</CardTitle>
                                    <CardDescription>Monthly attendance overview</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleToday}>
                                        <Calendar className="h-3.5 w-3.5 mr-2" />
                                        Today
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <div
                                        key={day}
                                        className={cn(
                                            "text-center text-xs md:text-sm font-semibold text-muted-foreground py-2 rounded-lg",
                                            (idx === 0 || idx === 6) && "bg-muted/50"
                                        )}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {days.map((day, idx) => {
                                    const attendanceData = getAttendanceForDate(day.fullDate, dashboardData?.monthlyTrend);
                                    const isToday = getISTDateString(day.fullDate) === getISTDateString(new Date());
                                    const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleDateClick(day)}
                                            disabled={!day.isCurrentMonth}
                                            className={cn(
                                                "min-h-[90px] md:min-h-[110px] p-2 rounded-xl border-2 transition-all",
                                                "hover:border-primary hover:shadow-lg",
                                                !day.isCurrentMonth && "opacity-30 cursor-not-allowed",
                                                day.isCurrentMonth && "cursor-pointer",
                                                isToday && "bg-gradient-to-br from-primary/15 to-primary/5 border-primary",
                                                selectedDate && day.fullDate.toDateString() === selectedDate.toDateString() && "ring-2 ring-primary",
                                                day.isCurrentMonth && !isToday && "border-border bg-card",
                                                isWeekend && day.isCurrentMonth && "bg-muted/30"
                                            )}
                                        >
                                            <div className="flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={cn(
                                                        "text-xs md:text-sm font-bold",
                                                        isToday && "text-primary"
                                                    )}>
                                                        {day.date}
                                                    </span>
                                                </div>
                                                {attendanceData && (
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-green-600">P: {attendanceData.present}</span>
                                                            <span className="text-red-600">A: {attendanceData.absent}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-yellow-600">L: {attendanceData.late}</span>
                                                            <span className="text-orange-600">H: {attendanceData.halfDay}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Activity */}
                <TabsContent value="recent">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest attendance records</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentActivity?.map((record) => (
                                    <div
                                        key={record.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{record.user.name}</span>
                                                <Badge variant="outline">{record.user.role.name}</Badge>
                                                <Badge className={getStatusBadge(record.status)}>
                                                    {record.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {formatDate(record.date)}
                                                {record.checkInTime && ` • Check-in: ${new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                                                {record.marker && ` • Marked by: ${record.marker.name}`}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedUser(record);
                                                setIsDetailOpen(true);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Role-wise Stats */}
                <TabsContent value="rolewise">
                    <Card>
                        <CardHeader>
                            <CardTitle>Role-wise Statistics</CardTitle>
                            <CardDescription>Attendance breakdown by role</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {roleWiseStats?.map((stat) => (
                                    <div key={stat.roleId} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">{stat.roleName}</h3>
                                            <Badge>{stat.totalUsers} Users</Badge>
                                        </div>
                                        <div className="grid grid-cols-5 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Present</p>
                                                <p className="font-semibold text-green-600">{stat.present}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Absent</p>
                                                <p className="font-semibold text-red-600">{stat.absent}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Late</p>
                                                <p className="font-semibold text-yellow-600">{stat.late}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Half Day</p>
                                                <p className="font-semibold text-orange-600">{stat.halfDay}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">On Leave</p>
                                                <p className="font-semibold text-blue-600">{stat.onLeave}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${(stat.present / stat.totalUsers) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Class-wise Stats */}
                <TabsContent value="classwise">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class-wise Statistics</CardTitle>
                            <CardDescription>Student attendance by class</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {classWiseStats?.map((stat) => (
                                    <div key={stat.classId} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">{stat.className}</h3>
                                            <div className="flex items-center gap-2">
                                                <Badge>{stat.totalStudents} Students</Badge>
                                                <Badge variant="outline">{stat.attendancePercentage}%</Badge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Present</p>
                                                <p className="font-semibold text-green-600">{stat.present}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Absent</p>
                                                <p className="font-semibold text-red-600">{stat.absent}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Late</p>
                                                <p className="font-semibold text-yellow-600">{stat.late}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${stat.attendancePercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Approvals Tab */}
                <TabsContent value="approvals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approvals</CardTitle>
                            <CardDescription>
                                {approvalsData?.pagination?.total || 0} requests awaiting approval
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {approvalsData?.approvals?.map((approval) => (
                                    <div
                                        key={approval.id}
                                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium">{approval.user.name}</span>
                                                <Badge variant="outline">
                                                    {approval.user.role.name}
                                                </Badge>
                                                {approval.user.student && (
                                                    <Badge variant="secondary">
                                                        {approval.user.student.class?.className}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p>
                                                    <span className="font-medium">Date:</span> {formatDate(approval.date)}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Status:</span>{' '}
                                                    <Badge className={getStatusBadge(approval.status)}>
                                                        {approval.status}
                                                    </Badge>
                                                </p>
                                                {approval.remarks && (
                                                    <p>
                                                        <span className="font-medium">Reason:</span> {approval.remarks}
                                                    </p>
                                                )}
                                                {approval.marker && (
                                                    <p>
                                                        <span className="font-medium">Marked by:</span> {approval.marker.name}
                                                    </p>
                                                )}
                                            </div>
                                            {approval.documents && approval.documents.length > 0 && (
                                                <div className="mt-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {approval.documents.length} Document(s) Attached
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 hover:bg-green-50"
                                                onClick={() => {
                                                    approvalMutation.mutate({
                                                        attendanceIds: [approval.id],
                                                        action: 'APPROVE'
                                                    });
                                                }}
                                                disabled={approvalMutation.isPending}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                    setSelectedApproval(approval);
                                                    setIsApprovalOpen(true);
                                                }}
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!approvalsData?.approvals || approvalsData.approvals.length === 0) && (
                                    <div className="text-center py-12">
                                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No pending approvals
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leave Requests Tab */}
                <TabsContent value="leaves">
                    <Card>
                        <CardHeader>
                            <CardTitle>Leave Requests</CardTitle>
                            <CardDescription>
                                {leavesData?.pagination?.total || 0} pending leave requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {leavesData?.leaves?.map((leave) => (
                                    <div
                                        key={leave.id}
                                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium">{leave.user.name}</span>
                                                <Badge variant="outline">{leave.user.role.name}</Badge>
                                                <Badge
                                                    className={
                                                        leave.leaveType === 'SICK'
                                                            ? 'bg-red-100 text-red-700'
                                                            : leave.leaveType === 'CASUAL'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-purple-100 text-purple-700'
                                                    }
                                                >
                                                    {leave.leaveType}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p>
                                                    <span className="font-medium">Duration:</span>{' '}
                                                    {formatDate(leave.startDate)} to {formatDate(leave.endDate)}{' '}
                                                    ({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})
                                                </p>
                                                <p>
                                                    <span className="font-medium">Reason:</span> {leave.reason}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Applied:</span>{' '}
                                                    {formatDate(leave.submittedAt)}
                                                </p>
                                                {leave.emergencyContact && (
                                                    <p>
                                                        <span className="font-medium">Emergency Contact:</span>{' '}
                                                        {leave.emergencyContact} ({leave.emergencyContactPhone})
                                                    </p>
                                                )}
                                            </div>
                                            {leave.documents && leave.documents.length > 0 && (
                                                <div className="mt-2 flex gap-2">
                                                    {leave.documents.map((doc, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={doc.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <FileText className="w-3 h-3" />
                                                            {doc.fileName}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 hover:bg-green-50"
                                                onClick={() => {
                                                    // Handle leave approval
                                                }}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!leavesData?.leaves || leavesData.leaves.length === 0) && (
                                    <div className="text-center py-12">
                                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No pending leave requests
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Low Attendance Tab */}
                <TabsContent value="lowattendance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Low Attendance Alert</CardTitle>
                            <CardDescription>
                                Users with attendance below 75%
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {lowAttendanceUsers?.map((user) => (
                                    <div
                                        key={user.userId}
                                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium">{user.user.name}</span>
                                                <Badge variant="outline">{user.user.role.name}</Badge>
                                                {user.user.student && (
                                                    <>
                                                        <Badge variant="secondary">
                                                            {user.user.student.class?.className}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {user.user.student.admissionNo}
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                                                <div>
                                                    <p className="text-muted-foreground">Attendance</p>
                                                    <p className="font-bold text-red-600">
                                                        {user.attendancePercentage.toFixed(1)}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Present</p>
                                                    <p className="font-semibold text-green-600">
                                                        {user.totalPresent}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Absent</p>
                                                    <p className="font-semibold text-red-600">
                                                        {user.totalAbsent}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Working Days</p>
                                                    <p className="font-semibold">{user.totalWorkingDays}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={cn(
                                                            'h-2 rounded-full',
                                                            user.attendancePercentage < 50
                                                                ? 'bg-red-600'
                                                                : user.attendancePercentage < 75
                                                                    ? 'bg-orange-600'
                                                                    : 'bg-green-600'
                                                        )}
                                                        style={{ width: `${user.attendancePercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsDetailOpen(true);
                                                }}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!lowAttendanceUsers || lowAttendanceUsers.length === 0) && (
                                    <div className="text-center py-12">
                                        <Trophy className="h-12 w-12 mx-auto text-green-500 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            All users have good attendance!
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Mark Attendance Dialog */}
            <Dialog open={isMarkOpen} onOpenChange={setIsMarkOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Mark Attendance</DialogTitle>
                        <DialogDescription>
                            Manually mark attendance for a user
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">User ID</label>
                            <Input
                                placeholder="Enter user ID"
                                value={markForm.userId}
                                onChange={(e) =>
                                    setMarkForm({ ...markForm, userId: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                type="date"
                                value={markForm.date}
                                onChange={(e) =>
                                    setMarkForm({ ...markForm, date: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={markForm.status}
                                onValueChange={(value) =>
                                    setMarkForm({ ...markForm, status: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRESENT">Present</SelectItem>
                                    <SelectItem value="ABSENT">Absent</SelectItem>
                                    <SelectItem value="LATE">Late</SelectItem>
                                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Check-in Time</label>
                                <Input
                                    type="time"
                                    value={markForm.checkInTime}
                                    onChange={(e) =>
                                        setMarkForm({ ...markForm, checkInTime: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Check-out Time</label>
                                <Input
                                    type="time"
                                    value={markForm.checkOutTime}
                                    onChange={(e) =>
                                        setMarkForm({ ...markForm, checkOutTime: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remarks</label>
                            <Textarea
                                placeholder="Optional remarks..."
                                value={markForm.remarks}
                                onChange={(e) =>
                                    setMarkForm({ ...markForm, remarks: e.target.value })
                                }
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsMarkOpen(false);
                                resetMarkForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => markAttendanceMutation.mutate(markForm)}
                            disabled={!markForm.userId || !markForm.date || markAttendanceMutation.isPending}
                        >
                            {markAttendanceMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Marking...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark Attendance
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Approval Rejection Dialog */}
            <Dialog open={isApprovalOpen} onOpenChange={setIsApprovalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Attendance Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejection
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="Enter rejection reason..."
                            rows={4}
                            id="rejection-remarks"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsApprovalOpen(false);
                                setSelectedApproval(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                const remarks = document.getElementById('rejection-remarks').value;
                                approvalMutation.mutate({
                                    attendanceIds: [selectedApproval.id],
                                    action: 'REJECT',
                                    remarks
                                });
                            }}
                            disabled={approvalMutation.isPending}
                        >
                            {approvalMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                'Reject Request'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* User Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Attendance Details</DialogTitle>
                        <DialogDescription>
                            Complete attendance information for {selectedUser?.user?.name || selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-6 py-4">
                            {/* User Info */}
                            <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">
                                        {selectedUser.user?.name || selectedUser.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Badge>{selectedUser.user?.role?.name}</Badge>
                                        {selectedUser.user?.student && (
                                            <>
                                                <Badge variant="secondary">
                                                    {selectedUser.user.student.class?.className}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {selectedUser.user.student.admissionNo}
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Streak Information */}
                            {selectedUser.streak && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-green-100 rounded-lg">
                                                    <Target className="w-6 h-6 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Current Streak
                                                    </p>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {selectedUser.streak.current} days
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-blue-100 rounded-lg">
                                                    <Trophy className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Longest Streak
                                                    </p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {selectedUser.streak.longest} days
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Monthly Stats */}
                            {selectedUser.monthlyStats && (
                                <div>
                                    <h4 className="font-semibold mb-3">Monthly Statistics</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Working Days</p>
                                            <p className="text-xl font-bold">
                                                {selectedUser.monthlyStats.totalWorkingDays}
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Present</p>
                                            <p className="text-xl font-bold text-green-600">
                                                {selectedUser.monthlyStats.totalPresent}
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Absent</p>
                                            <p className="text-xl font-bold text-red-600">
                                                {selectedUser.monthlyStats.totalAbsent}
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Late</p>
                                            <p className="text-xl font-bold text-yellow-600">
                                                {selectedUser.monthlyStats.totalLate}
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Half Day</p>
                                            <p className="text-xl font-bold text-orange-600">
                                                {selectedUser.monthlyStats.totalHalfDay}
                                            </p>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <p className="text-sm text-muted-foreground">Attendance %</p>
                                            <p className="text-xl font-bold text-primary">
                                                {selectedUser.monthlyStats.attendancePercentage?.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                                                style={{
                                                    width: `${selectedUser.monthlyStats.attendancePercentage}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recent Attendance */}
                            {selectedUser.recentAttendance && (
                                <div>
                                    <h4 className="font-semibold mb-3">Recent Attendance</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedUser.recentAttendance.map((record) => (
                                            <div
                                                key={record.id}
                                                className="flex items-center justify-between p-3 border rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">{formatDate(record.date)}</p>
                                                    {record.checkInTime && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Check-in: {new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge className={getStatusBadge(record.status)}>
                                                    {record.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}