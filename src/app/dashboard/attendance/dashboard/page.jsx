'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Clock, AlertCircle, CheckCircle, TrendingUp, MapPin,
  Download, RefreshCw, Eye, Calendar, Award, Smartphone, XCircle,
  ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AdminAttendanceDashboard() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [classFilter, setClassFilter] = useState('all');

  // Pagination states for each tab
  const [alertsPage, setAlertsPage] = useState(1);
  const [classPage, setClassPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const pageSize = 10;

  // Fetch dashboard data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance-dashboard', schoolId, dateFilter, classFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: dateFilter,
        ...(classFilter !== 'all' && { classId: classFilter })
      });
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30000,
  });

  const {
    dayInfo,
    todayOverview,
    roleWiseStats,
    classWiseStats,
    teacherActivity,
    alerts,
    lowAttendanceUsers,
    recentActivity
  } = data || {};

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination helper
  const paginate = (items, page) => {
    if (!items) return { data: [], totalPages: 0 };
    const totalPages = Math.ceil(items.length / pageSize);
    const data = items.slice((page - 1) * pageSize, page * pageSize);
    return { data, totalPages, total: items.length };
  };

  // Paginated data
  const alertsPaginated = paginate(lowAttendanceUsers, alertsPage);
  const classPaginated = paginate(classWiseStats, classPage);
  const teacherPaginated = paginate(teacherActivity, teacherPage);
  const recentPaginated = paginate(recentActivity, recentPage);

  // Pagination Component
  const Pagination = ({ current, total, totalItems, onChange }) => {
    if (total <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {((current - 1) * pageSize) + 1} to {Math.min(current * pageSize, totalItems)} of {totalItems}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.max(1, current - 1))}
            disabled={current === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: Math.min(5, total) }, (_, i) => {
            let pageNum;
            if (total <= 5) {
              pageNum = i + 1;
            } else if (current <= 3) {
              pageNum = i + 1;
            } else if (current >= total - 2) {
              pageNum = total - 4 + i;
            } else {
              pageNum = current - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={current === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(pageNum)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(Math.min(total, current + 1))}
            disabled={current === total}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Table loading skeleton
  const TableSkeleton = ({ cols = 5 }) => (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate total students
  const totalStudents = roleWiseStats?.find(r => r.roleName === 'STUDENT')?.totalUsers || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Attendance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time attendance tracking and analytics
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classWiseStats?.map((cls) => (
                    <SelectItem key={cls.classId} value={cls.classId.toString()}>
                      {cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Link href="/dashboard/attendance/class-marking" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Mark Attendance
                </Button>
              </Link>
              <Link href="/dashboard/attendance/teacher-tracking" className="flex-1">
                <Button variant="outline" className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Track Teachers
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holiday/Non-Working Day Alert */}
      {!dayInfo?.isWorkingDay && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                  {dayInfo?.dayType === 'HOLIDAY' ? `Holiday: ${dayInfo?.holidayName}` : dayInfo?.dayType}
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">No attendance required today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Noticeboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayOverview?.present || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayOverview?.total ? Math.round((todayOverview.present / todayOverview.total) * 100) : 0}% attendance rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{todayOverview?.absent || 0}</div>
            <p className="text-xs text-muted-foreground">{todayOverview?.notMarked || 0} not marked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Check-ins</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{todayOverview?.late || 0}</div>
            <p className="text-xs text-muted-foreground">{alerts?.pendingApprovals || 0} pending approvals</p>
          </CardContent>
        </Card>
      </div>

      {/* Role-wise Breakdown - Cleaner Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roleWiseStats?.map((role) => (
          <Card key={role.roleId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{role.roleName}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{role.present}/{role.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">{role.absent} absent</span>
                {' • '}
                <span className="text-yellow-600">{role.late} late</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teachers">Teacher Activity</TabsTrigger>
          <TabsTrigger value="classes">Class-wise</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alerts ({alerts?.lowAttendanceCount || 0})
            {alerts?.hasInsufficientData && (
              <span className="ml-1 text-amber-500" title="Insufficient data">⚠</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Teacher Activity Tab */}
        <TabsContent value="teachers">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teacher Activity ({teacherActivity?.length || 0})</CardTitle>
                  <CardDescription>Real-time teacher check-in/out with location and device info</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Teacher</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Streak</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherPaginated.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No teacher activity found
                        </TableCell>
                      </TableRow>
                    ) : (
                      teacherPaginated.data?.map((teacher, idx) => (
                        <TableRow key={teacher.userId} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                {teacher.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{teacher.name}</p>
                                <p className="text-xs text-muted-foreground">{teacher.employeeId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={teacher.isLateCheckIn ? 'text-yellow-600' : ''}>
                              {formatTime(teacher.checkInTime)}
                            </span>
                          </TableCell>
                          <TableCell>{formatTime(teacher.checkOutTime)}</TableCell>
                          <TableCell>
                            <span className="font-mono">{teacher.workingHours?.toFixed(2) || 0}h</span>
                          </TableCell>
                          <TableCell>
                            {teacher.location?.checkIn && (
                              <Button variant="ghost" size="sm" title={`${teacher.location.checkIn.latitude}, ${teacher.location.checkIn.longitude}`}>
                                <MapPin className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            {teacher.deviceInfo && (
                              <div className="flex items-center gap-1" title={`${teacher.deviceInfo.platform} ${teacher.deviceInfo.osVersion}`}>
                                <Smartphone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs">{teacher.deviceInfo.deviceId?.slice(0, 8)}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <Award className="w-3 h-3" />
                              {teacher.streak} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                teacher.status === 'PRESENT' ? 'default' :
                                  teacher.status === 'LATE' ? 'secondary' : 'destructive'
                              }
                              className={teacher.status === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                            >
                              {teacher.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                current={teacherPage}
                total={teacherPaginated.totalPages}
                totalItems={teacherPaginated.total}
                onChange={setTeacherPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class-wise Tab */}
        <TabsContent value="classes">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Class-wise Attendance ({classWiseStats?.length || 0})</CardTitle>
                  <CardDescription>Attendance breakdown by class with progress indicators</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="w-[200px]">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classPaginated.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No class data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      classPaginated.data?.map((cls, idx) => (
                        <TableRow key={cls.classId} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                          <TableCell className="font-medium">{cls.className}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{cls.totalStudents}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600 font-semibold">{cls.present}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600 font-semibold">{cls.absent}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-yellow-600 font-semibold">{cls.late}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all"
                                  style={{ width: `${cls.attendancePercentage || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {cls.attendancePercentage || 0}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                current={classPage}
                total={classPaginated.totalPages}
                totalItems={classPaginated.total}
                onChange={setClassPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Low Attendance Alerts ({lowAttendanceUsers?.length || 0})</CardTitle>
                  <CardDescription>Students below 75% attendance threshold</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Insufficient Data Warning */}
              {alerts?.hasInsufficientData && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-500">Insufficient Data</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        Only {alerts.workingDaysCount} working day{alerts.workingDaysCount !== 1 ? 's' : ''} recorded this month.
                        Attendance alerts require at least {alerts.minWorkingDays} working days for reliable data.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Attendance %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsPaginated.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No low attendance students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      alertsPaginated.data?.map((user, idx) => (
                        <TableRow key={user.userId} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 font-medium">
                                {user.user.name?.charAt(0)}
                              </div>
                              <span className="font-medium">{user.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {user.user.student?.admissionNo || '—'}
                          </TableCell>
                          <TableCell>{user.user.student?.class?.className || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">
                              {user.attendancePercentage?.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/attendance/student-history?studentId=${user.userId}`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View History
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                current={alertsPage}
                total={alertsPaginated.totalPages}
                totalItems={alertsPaginated.total}
                onChange={setAlertsPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity ({recentActivity?.length || 0})</CardTitle>
                  <CardDescription>Latest attendance records</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPaginated.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No recent activity found
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPaginated.data?.map((activity, idx) => (
                        <TableRow key={activity.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                {activity.user.name?.charAt(0)}
                              </div>
                              <span className="font-medium">{activity.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {activity.marker?.name || 'System'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(activity.markedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={activity.status === 'PRESENT' ? 'default' :
                                activity.status === 'LATE' ? 'secondary' : 'destructive'}
                              className={activity.status === 'LATE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                            >
                              {activity.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                current={recentPage}
                total={recentPaginated.totalPages}
                totalItems={recentPaginated.total}
                onChange={setRecentPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}