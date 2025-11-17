'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Clock, AlertCircle, CheckCircle, TrendingUp, MapPin,
  Download, RefreshCw, Eye, Calendar, Award, Smartphone, XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AdminAttendanceDashboard() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;

  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [classFilter, setClassFilter] = useState('all');

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
    monthlyTrend,
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
            <Users className="w-8 h-8 text-blue-600" />
            Attendance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">
                  {dayInfo?.dayType === 'HOLIDAY' ? `Holiday: ${dayInfo?.holidayName}` : dayInfo?.dayType}
                </p>
                <p className="text-sm text-yellow-800">No attendance required today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">
                {todayOverview ? Math.round((todayOverview.present / todayOverview.total) * 100) : 0}%
              </span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Users</h3>
            <p className="text-2xl font-bold mt-1">{todayOverview?.total || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium opacity-90">Present Today</h3>
            <p className="text-2xl font-bold mt-1">{todayOverview?.present || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                {todayOverview?.notMarked || 0} Not Marked
              </span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Absent Today</h3>
            <p className="text-2xl font-bold mt-1">{todayOverview?.absent || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                {alerts?.pendingApprovals || 0} Pending
              </span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Late Check-ins</h3>
            <p className="text-2xl font-bold mt-1">{todayOverview?.late || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Role-wise Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roleWiseStats?.map((role) => (
          <Card key={role.roleId} className="border-l-4 border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{role.roleName}</p>
                  <p className="text-2xl font-bold text-blue-600">{role.present}/{role.totalUsers}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="text-red-600 font-medium">{role.absent} absent</span>
                {' • '}
                <span className="text-yellow-600 font-medium">{role.late} late</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teachers">Teacher Activity</TabsTrigger>
          <TabsTrigger value="classes">Class-wise</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts?.lowAttendanceCount || 0})</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Teacher Activity Tab */}
        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Activity & Tracking</CardTitle>
              <CardDescription>Real-time teacher check-in/out with location and device info</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Teacher</th>
                      <th className="text-left p-3">Check-In</th>
                      <th className="text-left p-3">Check-Out</th>
                      <th className="text-left p-3">Hours</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Device</th>
                      <th className="text-left p-3">Streak</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherActivity?.map((teacher) => (
                      <tr key={teacher.userId} className="border-b hover:bg-accent">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              {teacher.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{teacher.name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={teacher.isLateCheckIn ? 'text-yellow-600' : ''}>
                            {formatTime(teacher.checkInTime)}
                          </span>
                        </td>
                        <td className="p-3">{formatTime(teacher.checkOutTime)}</td>
                        <td className="p-3">
                          <span className="font-mono">{teacher.workingHours.toFixed(2)}h</span>
                        </td>
                        <td className="p-3">
                          {teacher.location?.checkIn && (
                            <Button variant="ghost" size="sm" title={`${teacher.location.checkIn.latitude}, ${teacher.location.checkIn.longitude}`}>
                              <MapPin className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                        </td>
                        <td className="p-3">
                          {teacher.deviceInfo && (
                            <div className="flex items-center gap-1" title={`${teacher.deviceInfo.platform} ${teacher.deviceInfo.osVersion}`}>
                              <Smartphone className="w-4 h-4 text-gray-500" />
                              <span className="text-xs">{teacher.deviceInfo.deviceId}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {teacher.streak} days
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              teacher.status === 'PRESENT' ? 'default' :
                                teacher.status === 'LATE' ? 'warning' : 'destructive'
                            }
                          >
                            {teacher.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Class-wise Tab */}
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>Class-wise Attendance</CardTitle>
              <CardDescription>Attendance breakdown by class</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {classWiseStats?.map((cls) => (
                  <div key={cls.classId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{cls.className}</h3>
                      <Badge variant="outline">{cls.totalStudents} Students</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Present</p>
                        <p className="text-xl font-bold text-green-600">{cls.present}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Absent</p>
                        <p className="text-xl font-bold text-red-600">{cls.absent}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Late</p>
                        <p className="text-xl font-bold text-yellow-600">{cls.late}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${cls.attendancePercentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {cls.attendancePercentage}% attendance
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Low Attendance Alerts</CardTitle>
              <CardDescription>Students below 75% attendance threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowAttendanceUsers?.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.user.name}</span>
                        <Badge variant="destructive">
                          {user.attendancePercentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user.user.student?.admissionNo} • {user.user.student?.class?.className}
                      </p>
                    </div>
                    <Link href={`/dashboard/attendance/student-history?studentId=${user.userId}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {activity.user.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.marker?.name} marked as {activity.status} at {formatTime(activity.markedAt)}
                      </p>
                    </div>
                    <Badge variant={activity.status === 'PRESENT' ? 'default' : 'destructive'}>
                      {activity.status}
                    </Badge>
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