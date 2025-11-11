'use client'
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar, Users, TrendingUp, AlertCircle, Download,
    RefreshCw, CheckCircle, Clock, XCircle, Filter, Search,
    UserCheck, UserX, Clock4, FileText, Eye, ChevronLeft, ChevronRight, Sparkles, User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function AdminAttendanceDashboard() {
    const {fullUser} = useAuth()
    const schoolId = fullUser?.schoolId;
    if(!schoolId) return <LoaderPage/>
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [filters, setFilters] = useState({
        roleId: 'all',
        classId: 'all',
        status: 'all',
        search: ''
    });
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [page, setPage] = useState(1);

    // Fetch dashboard data
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['attendance-dashboard', selectedDate, filters, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                date: selectedDate,
                page: page.toString(),
                limit: '20',
                ...(filters.roleId !== 'all' && { roleId: filters.roleId }),
                ...(filters.classId !== 'all' && { classId: filters.classId }),
                ...(filters.status !== 'all' && { status: filters.status }),
            });
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard?${params}`);
            return res.json();
        },
        staleTime: 30000,
    });

    const {
        todayOverview = {},
        roleWiseStats = [],
        classWiseStats = [],
        monthlyTrend = [],
        alerts = {},
        lowAttendanceUsers = [],
        recentActivity = [],
        attendanceRecords = [],
        pagination = {}
    } = data || {};

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        for (let i = firstDay.getDay(); i > 0; i--) {
            days.push({ date: null, isOtherMonth: true });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateStr = date.toISOString().split('T')[0];
            const dayData = monthlyTrend.find(d => d.date?.split('T')[0] === dateStr);
            days.push({
                date: i,
                fullDate: dateStr,
                isToday: dateStr === new Date().toISOString().split('T')[0],
                isSelected: dateStr === selectedDate,
                data: dayData
            });
        }

        return days;
    }, [currentMonth, monthlyTrend, selectedDate]);

    const filteredRecords = useMemo(() => {
        return attendanceRecords.filter(record => {
            if (filters.search) {
                const search = filters.search.toLowerCase();
                return record.user?.name?.toLowerCase().includes(search) ||
                    record.user?.email?.toLowerCase().includes(search);
            }
            return true;
        });
    }, [attendanceRecords, filters.search]);

    const monthYear = useMemo(() =>
        currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        [currentMonth]
    );

    return (
        <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-background via-background to-muted/20">
            <div className="max-w-[1800px] mx-auto space-y-6">

                {/* Enhanced Header */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary" />
                                Attendance Dashboard
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Real-time attendance tracking and analytics</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 border-2 rounded-lg hover:border-primary hover:bg-primary/5 flex items-center gap-2 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg hover:from-primary/90 hover:to-primary/70 flex items-center gap-2 shadow-lg transition-all">
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Export Report</span>
                            </button>
                        </div>
                    </div>

                    {/* Enhanced Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                        <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl shadow-lg border-2 hover:border-primary/20 p-4 md:p-6 transition-all hover:shadow-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                                </div>
                                <span className="text-2xl md:text-3xl font-bold text-blue-600">
                                    {todayOverview.total || 0}
                                </span>
                            </div>
                            <h3 className="text-sm font-semibold mb-1">Total Users</h3>
                            <p className="text-xs text-muted-foreground">Not Marked: {todayOverview.notMarked || 0}</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg text-white p-4 md:p-6 hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                                <span className="text-2xl md:text-3xl font-bold">{todayOverview.present || 0}</span>
                            </div>
                            <h3 className="text-sm font-semibold mb-1">Present</h3>
                            <p className="text-xs opacity-90">
                                {todayOverview.total > 0
                                    ? `${Math.round((todayOverview.present / todayOverview.total) * 100)}%`
                                    : '0%'}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg text-white p-4 md:p-6 hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <XCircle className="w-6 h-6 md:w-8 md:h-8" />
                                <span className="text-2xl md:text-3xl font-bold">{todayOverview.absent || 0}</span>
                            </div>
                            <h3 className="text-sm font-semibold mb-1">Absent</h3>
                            <p className="text-xs opacity-90">
                                {todayOverview.total > 0
                                    ? `${Math.round((todayOverview.absent / todayOverview.total) * 100)}%`
                                    : '0%'}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg text-white p-4 md:p-6 hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <Clock className="w-6 h-6 md:w-8 md:h-8" />
                                <span className="text-2xl md:text-3xl font-bold">{todayOverview.late || 0}</span>
                            </div>
                            <h3 className="text-sm font-semibold mb-1">Late</h3>
                            <p className="text-xs opacity-90">Half Day: {todayOverview.halfDay || 0}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg text-white p-4 md:p-6 hover:shadow-xl transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <AlertCircle className="w-6 h-6 md:w-8 md:h-8" />
                                <span className="text-2xl md:text-3xl font-bold">{alerts.pendingApprovals || 0}</span>
                            </div>
                            <h3 className="text-sm font-semibold mb-1">Pending</h3>
                            <p className="text-xs opacity-90">Leaves: {alerts.pendingLeaves || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Enhanced Calendar View */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-card to-muted/20 rounded-xl shadow-xl border-2 hover:border-primary/20 p-4 md:p-6 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-primary" />
                                </div>
                                <span>Monthly Overview</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                                    className="p-2 hover:bg-muted rounded-lg border-2 hover:border-primary transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <span className="text-sm font-semibold px-3 min-w-[140px] text-center">
                                    {monthYear}
                                </span>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                                    className="p-2 hover:bg-muted rounded-lg border-2 hover:border-primary transition-all"
                                >
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                <div key={day} className={`text-center text-xs md:text-sm font-semibold py-2 rounded-lg ${(idx === 0 || idx === 6) ? 'bg-muted/50 text-muted-foreground' : 'text-muted-foreground'}`}>
                                    {day}
                                </div>
                            ))}

                            {calendarDays.map((day, idx) => {
                                const isWeekend = day.fullDate && (new Date(day.fullDate).getDay() === 0 || new Date(day.fullDate).getDay() === 6);
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => day.fullDate && setSelectedDate(day.fullDate)}
                                        disabled={day.isOtherMonth}
                                        className={`
                                            aspect-square p-2 rounded-xl text-sm transition-all duration-200
                                            ${day.isOtherMonth ? 'invisible' : ''}
                                            ${day.isToday ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary font-bold shadow-md' : 'hover:bg-muted border-2 border-transparent'}
                                            ${day.isSelected ? 'ring-2 ring-primary shadow-xl border-primary' : ''}
                                            ${isWeekend && !day.isToday && !day.isSelected ? 'bg-muted/30' : ''}
                                            hover:scale-[1.02] active:scale-[0.98]
                                        `}
                                    >
                                        {day.date && (
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <span className="font-semibold mb-1">{day.date}</span>
                                                {day.data && (
                                                    <div className="flex gap-0.5">
                                                        {day.data.present > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />}
                                                        {day.data.absent > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />}
                                                        {day.data.late > 0 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-sm" />}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center flex-wrap gap-4 mt-6 text-xs">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                                <span className="font-medium">Present</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                                <span className="font-medium">Absent</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-sm" />
                                <span className="font-medium">Late</span>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Role-wise Stats */}
                    <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl shadow-xl border-2 hover:border-primary/20 p-4 md:p-6 transition-all">
                        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <span>By Role</span>
                        </h2>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                            {roleWiseStats.map((role, idx) => (
                                <div 
                                    key={role.roleId} 
                                    className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl border-2 hover:border-primary/30 hover:shadow-lg transition-all"
                                    style={{
                                        animationDelay: `${idx * 50}ms`,
                                        animation: 'slideIn 0.3s ease-out forwards'
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-semibold">{role.roleName}</span>
                                        <span className="text-sm text-muted-foreground font-medium">{role.totalUsers} users</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <div className="font-bold text-green-700 dark:text-green-400">{role.present}</div>
                                            <div className="text-green-600 dark:text-green-500">Present</div>
                                        </div>
                                        <div className="text-center p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <div className="font-bold text-red-700 dark:text-red-400">{role.absent}</div>
                                            <div className="text-red-600 dark:text-red-500">Absent</div>
                                        </div>
                                        <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                            <div className="font-bold text-yellow-700 dark:text-yellow-400">{role.late}</div>
                                            <div className="text-yellow-600 dark:text-yellow-500">Late</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Enhanced Class-wise Stats */}
                <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl shadow-xl border-2 hover:border-primary/20 p-4 md:p-6 transition-all">
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <span>Class-wise Attendance</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {classWiseStats.map((cls, idx) => (
                            <div 
                                key={cls.classId} 
                                className="p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl border-2 hover:border-primary/30 hover:shadow-lg transition-all"
                                style={{
                                    animationDelay: `${idx * 50}ms`,
                                    animation: 'slideIn 0.3s ease-out forwards'
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-base md:text-lg">{cls.className}</h3>
                                    <span className="text-xl md:text-2xl font-bold text-primary">
                                        {Math.round(cls.attendancePercentage)}%
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs md:text-sm mb-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span className="font-semibold">{cls.totalStudents}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 dark:text-green-400">
                                        <span>Present:</span>
                                        <span className="font-semibold">{cls.present}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600 dark:text-red-400">
                                        <span>Absent:</span>
                                        <span className="font-semibold">{cls.absent}</span>
                                    </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-primary to-primary/80 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                                        style={{ width: `${cls.attendancePercentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Enhanced Low Attendance Alerts */}
                {lowAttendanceUsers.length > 0 && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 md:p-6 shadow-xl">
                        <h2 className="text-lg md:text-xl font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <span>Low Attendance Alerts ({lowAttendanceUsers.length})</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lowAttendanceUsers.slice(0, 6).map((user, idx) => (
                                <div 
                                    key={user.userId} 
                                    className="bg-card p-4 rounded-xl border-2 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg transition-all"
                                    style={{
                                        animationDelay: `${idx * 50}ms`,
                                        animation: 'slideIn 0.3s ease-out forwards'
                                    }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="font-semibold">{user.user.name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {user.user.student?.admissionNo || user.user.role.name}
                                            </p>
                                        </div>
                                        <span className="text-xl font-bold text-red-600 dark:text-red-400">
                                            {Math.round(user.attendancePercentage)}%
                                        </span>
                                    </div>
                                    <button className="w-full py-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg text-sm hover:from-primary/90 hover:to-primary/70 font-medium transition-all shadow-md">
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Enhanced Recent Activity */}
                <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl shadow-xl border-2 hover:border-primary/20 p-4 md:p-6 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Clock4 className="w-5 h-5 text-primary" />
                            </div>
                            <span>Recent Activity</span>
                        </h2>
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10 pr-4 py-2 border-2 rounded-lg text-sm bg-background focus:border-primary outline-none transition-all w-full sm:w-auto"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border-2">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b-2">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold">User</th>
                                    <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold">Role/Class</th>
                                    <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold">Time</th>
                                    <th className="px-4 py-3 text-left text-xs md:text-sm font-semibold">Marked By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={record.user?.profilePicture || '/default-avatar.png'}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full border-2 border-muted"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{record.user?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{record.user?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {record.user?.student
                                                ? `${record.user.student.class.className} ${record.user.student.section?.name || ''}`
                                                : record.user?.role?.name
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`
                                                inline-flex px-3 py-1.5 rounded-full text-xs font-semibold border-2
                                                ${record.status === 'PRESENT' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}
                                                ${record.status === 'ABSENT' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' : ''}
                                                ${record.status === 'LATE' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' : ''}
                                                ${record.status === 'HALF_DAY' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' : ''}
                                            `}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {record.marker?.name || 'Self'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Enhanced Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t-2">
                            <p className="text-sm text-muted-foreground">
                                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary/5 transition-all font-medium"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages}
                                    className="px-4 py-2 border-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary/5 transition-all font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 3px;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--muted-foreground) / 0.5);
                }
            `}</style>
        </div>
    );
}