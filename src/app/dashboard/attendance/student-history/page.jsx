// 'use client';

// import { useState } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import {
//   Calendar, TrendingUp, Download, ChevronLeft, ChevronRight,
//   CheckCircle, XCircle, Clock, AlertCircle, FileText, BarChart3,
//   Search,
//   Users
// } from 'lucide-react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { useAuth } from '@/context/AuthContext';
// import LoaderPage from '@/components/loader-page';

// export default function StudentAttendanceHistory() {
//   const { fullUser } = useAuth();
//   const schoolId = fullUser?.schoolId;
//   if (!schoolId) return <LoaderPage />

//   const [studentId, setStudentId] = useState('');
//   const [month, setMonth] = useState(new Date().getMonth() + 1);
//   const [year, setYear] = useState(new Date().getFullYear());

//   // Fetch students for search
//   const { data: students } = useQuery({
//     queryKey: ['students', schoolId],
//     queryFn: async () => {
//       const res = await fetch(`/api/schools/${schoolId}/students`);
//       if (!res.ok) throw new Error('Failed');
//       return res.json();
//     },
//     enabled: !!schoolId,
//   });

//   // Fetch student history
//   const { data, isLoading, refetch } = useQuery({
//     queryKey: ['student-history', schoolId, studentId, month, year],
//     queryFn: async () => {
//       const params = new URLSearchParams({
//         studentId,
//         month: month.toString(),
//         year: year.toString()
//       });
//       const res = await fetch(`/api/schools/${schoolId}/attendance/admin/student-history?${params}`);
//       if (!res.ok) throw new Error('Failed');
//       return res.json();
//     },
//     enabled: !!studentId
//   });

//   const { student, period, stats, calendar, records, comparison } = data || {};

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'PRESENT': return 'bg-green-500';
//       case 'ABSENT': return 'bg-red-500';
//       case 'LATE': return 'bg-yellow-500';
//       case 'ON_LEAVE': return 'bg-blue-500';
//       case 'HALF_DAY': return 'bg-orange-500';
//       default: return 'bg-gray-200';
//     }
//   };

//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'PRESENT': return <CheckCircle className="w-4 h-4" />;
//       case 'ABSENT': return <XCircle className="w-4 h-4" />;
//       case 'LATE': return <Clock className="w-4 h-4" />;
//       case 'ON_LEAVE': return <AlertCircle className="w-4 h-4" />;
//       default: return null;
//     }
//   };

//   const handlePrevMonth = () => {
//     if (month === 1) {
//       setMonth(12);
//       setYear(year - 1);
//     } else {
//       setMonth(month - 1);
//     }
//   };

//   const handleNextMonth = () => {
//     if (month === 12) {
//       setMonth(1);
//       setYear(year + 1);
//     } else {
//       setMonth(month + 1);
//     }
//   };

//   const handleExport = async (format) => {
//     try {
//       const res = await fetch(`/api/schools/${schoolId}/attendance/admin/student-history`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           studentId,
//           format,
//           startDate: new Date(year, month - 1, 1).toISOString(),
//           endDate: new Date(year, month, 0).toISOString()
//         })
//       });

//       const data = await res.json();
//       console.log('Export data:', data);
//     } catch (error) {
//       console.error('Export error:', error);
//     }
//   };

//   const [searchTerm, setSearchTerm] = useState('');
//   const filteredStudents = students?.students?.filter((s) => {
//     const name = s.name?.toLowerCase() || "";
//     const admNo = s.admissionNo?.toString().toLowerCase() || "";
//     const className = s.class?.className?.toString().toLowerCase() || "";

//     return (
//       name.includes(searchTerm.toLowerCase()) ||
//       admNo.includes(searchTerm.toLowerCase()) ||
//       className.includes(searchTerm.toLowerCase())
//     );
//   });

//   const cn = (...classes) => classes.filter(Boolean).join(' ');

//   if (!studentId) {
//     return (
//       <div className="p-4 sm:p-6 lg:p-8 space-y-6">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
//             <Calendar className="w-8 h-8 text-blue-600" />
//             Student Attendance History
//           </h1>
//           <p className="text-sm text-muted-foreground mt-1">
//             View detailed attendance records for any student
//           </p>
//         </div>

//         <Card>
//           <CardHeader>
//             <CardTitle>Search Student</CardTitle>
//             <CardDescription>Find by name, admission number, or class</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                 <Input
//                   placeholder="Type student name, admission no, or class..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>

//               {searchTerm && filteredStudents && filteredStudents.length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
//                   {filteredStudents.slice(0, 12).map((s) => (
//                     <Card
//                       key={s.userId}
//                       className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all"
//                       onClick={() => setStudentId(s.userId)}
//                     >
//                       <CardContent className="pt-6">
//                         <div className="flex items-center gap-3">
//                           <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
//                             {s.user.profilePicture ? (<img src={s.user.profilePicture} className='rounded-full object-cover w-auto h-auto' />) : (
//                               s.name.charAt(0)
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <h4 className="font-semibold">{s.name}</h4>
//                             <p className="text-sm text-muted-foreground">
//                               {s.admissionNo}
//                             </p>
//                             <Badge variant="outline" className="mt-1">
//                               {s.class?.className}
//                             </Badge>
//                           </div>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//                 </div>
//               ) : searchTerm ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
//                   <p>No students found matching "{searchTerm}"</p>
//                 </div>
//               ) : (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
//                   <p>Start typing to search for students</p>
//                 </div>
//               )}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   const today = new Date();

//   return (
//     <div className="p-4 sm:p-6 lg:p-8 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-bold">
//             {student?.name}
//           </h1>
//           <p className="text-sm text-muted-foreground mt-1">
//             {student?.admissionNo} • {student?.className} {student?.sectionName && `- ${student.sectionName}`}
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <Button variant="outline" onClick={() => setStudentId('')}>
//             Change Student
//           </Button>
//           <Button variant="outline" onClick={() => handleExport('pdf')}>
//             <Download className="w-4 h-4 mr-2" />
//             Export PDF
//           </Button>
//         </div>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <Card className="border-l-4 border-green-500">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-muted-foreground">Present</p>
//                 <p className="text-2xl font-bold text-green-600">{stats?.totalPresent || 0}</p>
//               </div>
//               <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-l-4 border-red-500">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-muted-foreground">Absent</p>
//                 <p className="text-2xl font-bold text-red-600">{stats?.totalAbsent || 0}</p>
//               </div>
//               <XCircle className="w-10 h-10 text-red-500 opacity-20" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-l-4 border-yellow-500">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-muted-foreground">Late</p>
//                 <p className="text-2xl font-bold text-yellow-600">{stats?.totalLate || 0}</p>
//               </div>
//               <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-l-4 border-blue-500">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-muted-foreground">Percentage</p>
//                 <p className="text-2xl font-bold text-blue-600">{stats?.attendancePercentage?.toFixed(1) || 0}%</p>
//               </div>
//               <TrendingUp className="w-10 h-10 text-blue-500 opacity-20" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Month Navigation */}
//       <Card>
//         <CardContent className="pt-6">
//           <div className="flex items-center justify-between">
//             <Button variant="outline" onClick={handlePrevMonth}>
//               <ChevronLeft className="w-4 h-4 mr-2" />
//               Previous
//             </Button>
//             <h3 className="text-lg font-semibold">
//               {period?.monthName} {period?.year}
//             </h3>
//             <Button
//               variant="outline"
//               onClick={handleNextMonth}
//               disabled={month === new Date().getMonth() + 1 && year === new Date().getFullYear()}
//             >
//               Next
//               <ChevronRight className="w-4 h-4 ml-2" />
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Main Content Tabs */}
//       <Tabs defaultValue="calendar" className="space-y-4">
//         <TabsList>
//           <TabsTrigger value="calendar">Calendar View</TabsTrigger>
//           <TabsTrigger value="list">Detailed List</TabsTrigger>
//           <TabsTrigger value="comparison">Comparison</TabsTrigger>
//         </TabsList>

//         {/* Calendar View - Updated UI */}
//         <TabsContent value="calendar">
//           <Card className="shadow-xl border-2 hover:border-primary/20 transition-all">
//             <CardHeader>
//               <CardTitle>Monthly Calendar</CardTitle>
//               <CardDescription>Color-coded attendance calendar</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {/* Calendar Grid */}
//               <div className="flex flex-col">
//                 {/* Weekday Headers */}
//                 <div className="grid grid-cols-7 gap-2 mb-2">
//                   {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
//                     <div
//                       key={day}
//                       className={cn(
//                         "text-center text-xs md:text-sm font-semibold text-muted-foreground py-2 rounded-lg",
//                         (idx === 0 || idx === 6) && "bg-muted/50"
//                       )}
//                     >
//                       {day}
//                     </div>
//                   ))}
//                 </div>

//                 {/* Calendar Days */}
//                 <div className="grid grid-cols-7 gap-2">
//                   {calendar?.map((day, idx) => {
//                     const isToday = day.day === today.getDate() && 
//                                    month === today.getMonth() + 1 && 
//                                    year === today.getFullYear();
//                     const isWeekend = idx % 7 === 0 || idx % 7 === 6;

//                     return (
//                       <div
//                         key={idx}
//                         className={cn(
//                           "min-h-[90px] md:min-h-[110px] p-2 rounded-xl border-2 transition-all duration-200",
//                           day.isWorkingDay && "hover:border-primary hover:shadow-lg hover:scale-[1.02]",
//                           !day.isWorkingDay && "opacity-30",
//                           isToday && "bg-gradient-to-br from-primary/15 to-primary/5 border-primary shadow-md",
//                           !isToday && day.isWorkingDay && "border-border bg-card",
//                           isWeekend && day.isWorkingDay && "bg-muted/30"
//                         )}
//                         title={day.marked ? `${day.status} - ${day.markedBy}` : 'Not marked'}
//                       >
//                         <div className="flex flex-col h-full">
//                           <div className="flex items-center justify-between mb-1">
//                             <span className={cn(
//                               "text-xs md:text-sm font-bold",
//                               isToday && "text-primary",
//                               !day.isWorkingDay && "text-muted-foreground"
//                             )}>
//                               {day.day}
//                             </span>
//                             {day.marked && (
//                               <Badge
//                                 variant="secondary"
//                                 className="h-5 min-w-5 px-1.5 text-xs"
//                               >
//                                 ✓
//                               </Badge>
//                             )}
//                           </div>
//                           <div className="space-y-1 overflow-y-auto flex-1">
//                             {day.marked && (
//                               <div
//                                 className={cn(
//                                   "text-[10px] md:text-xs px-2 py-1 rounded-md text-white font-medium shadow-sm flex items-center justify-center gap-1",
//                                   getStatusColor(day.status)
//                                 )}
//                               >
//                                 {getStatusIcon(day.status)}
//                                 <span className="truncate">{day.status}</span>
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               {/* Legend */}
//               <div className="mt-6 flex flex-wrap gap-4 justify-center">
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 rounded bg-green-500"></div>
//                   <span className="text-sm">Present</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 rounded bg-red-500"></div>
//                   <span className="text-sm">Absent</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 rounded bg-yellow-500"></div>
//                   <span className="text-sm">Late</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 rounded bg-blue-500"></div>
//                   <span className="text-sm">On Leave</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-4 h-4 rounded border-2 border-gray-200"></div>
//                   <span className="text-sm">Not Marked</span>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* List View */}
//         <TabsContent value="list">
//           <Card>
//             <CardHeader>
//               <CardTitle>Detailed Records</CardTitle>
//               <CardDescription>Complete attendance history with timestamps</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="border-b">
//                       <th className="text-left p-3">Date</th>
//                       <th className="text-left p-3">Status</th>
//                       <th className="text-left p-3">Check-in</th>
//                       <th className="text-left p-3">Check-out</th>
//                       <th className="text-left p-3">Hours</th>
//                       <th className="text-left p-3">Marked By</th>
//                       <th className="text-left p-3">Remarks</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {records?.map((record) => (
//                       <tr key={record.date} className="border-b hover:bg-accent">
//                         <td className="p-3">
//                           {new Date(record.date).toLocaleDateString('en-IN')}
//                         </td>
//                         <td className="p-3">
//                           <Badge
//                             variant={
//                               record.status === 'PRESENT' ? 'default' :
//                                 record.status === 'ABSENT' ? 'destructive' :
//                                   record.status === 'LATE' ? 'warning' : 'secondary'
//                             }
//                           >
//                             {record.status}
//                           </Badge>
//                         </td>
//                         <td className="p-3">
//                           {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
//                         </td>
//                         <td className="p-3">
//                           {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
//                         </td>
//                         <td className="p-3">
//                           {record.workingHours ? `${record.workingHours.toFixed(2)}h` : '—'}
//                         </td>
//                         <td className="p-3">{record.markedBy || '—'}</td>
//                         <td className="p-3">{record.remarks || '—'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Comparison View */}
//         <TabsContent value="comparison">
//           <Card>
//             <CardHeader>
//               <CardTitle>Monthly Comparison</CardTitle>
//               <CardDescription>Attendance trend over past months</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {comparison?.map((month) => (
//                   <div key={`${month.year}-${month.month}`} className="border rounded-lg p-4">
//                     <div className="flex items-center justify-between mb-2">
//                       <h4 className="font-semibold">
//                         {new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
//                       </h4>
//                       <Badge variant={month.percentage >= 75 ? 'default' : 'destructive'}>
//                         {month.percentage.toFixed(1)}%
//                       </Badge>
//                     </div>
//                     <div className="grid grid-cols-2 gap-4 text-sm">
//                       <div>
//                         <p className="text-muted-foreground">Present</p>
//                         <p className="font-semibold text-green-600">{month.present}</p>
//                       </div>
//                       <div>
//                         <p className="text-muted-foreground">Absent</p>
//                         <p className="font-semibold text-red-600">{month.absent}</p>
//                       </div>
//                     </div>
//                     <div className="mt-2">
//                       <div className="w-full bg-gray-200 rounded-full h-2">
//                         <div
//                           className={`h-2 rounded-full ${month.percentage >= 75 ? 'bg-green-600' : 'bg-red-600'}`}
//                           style={{ width: `${month.percentage}%` }}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, TrendingUp, Download, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertCircle, FileText, BarChart3,
  Search,
  Users,
  History
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';
import { calculateStreak } from '@/app/api/schools/[schoolId]/attendance/admin/reports/route';

export default function StudentAttendanceHistory() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  if (!schoolId) return <LoaderPage />

  const [studentId, setStudentId] = useState('');
  const [streak, setStreak] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [recentStudents, setRecentStudents] = useState([]);

  // Load recent students from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`recent-students-${schoolId}`);
    if (stored) {
      setRecentStudents(JSON.parse(stored));
    }
  }, [schoolId]);

  // Save to recent students
  const addToRecentStudents = (student) => {
    const recent = [student, ...recentStudents.filter(s => s.userId !== student.userId)].slice(0, 6);
    setRecentStudents(recent);
    localStorage.setItem(`recent-students-${schoolId}`, JSON.stringify(recent));
  };

  // Fetch students for search
  const { data: students } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/students`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId,
  });

  // Fetch student history
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['student-history', schoolId, studentId, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({
        studentId,
        month: month.toString(),
        year: year.toString()
      });
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/student-history?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!studentId
  });

  const { student, period, stats, calendar, records, comparison } = data || {};

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle className="w-4 h-4" />;
      case 'ABSENT': return <XCircle className="w-4 h-4" />;
      case 'LATE': return <Clock className="w-4 h-4" />;
      case 'ON_LEAVE': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
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

  const handleExport = async (format) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/student-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          format,
          startDate: new Date(year, month - 1, 1).toISOString(),
          endDate: new Date(year, month, 0).toISOString()
        })
      });

      const data = await res.json();
      console.log('Export data:', data);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleSelectStudent = (s) => {
    setStudentId(s.userId);
    addToRecentStudents(s);
  };

  const filteredStudents = students?.students?.filter((s) => {
    const name = s.name?.toLowerCase() || "";
    const admNo = s.admissionNo?.toString().toLowerCase() || "";
    const className = s.class?.className?.toString().toLowerCase() || "";

    return (
      name.includes(searchTerm.toLowerCase()) ||
      admNo.includes(searchTerm.toLowerCase()) ||
      className.includes(searchTerm.toLowerCase())
    );
  });

  const cn = (...classes) => classes.filter(Boolean).join(' ');
  if (!studentId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            Student Attendance History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View detailed attendance records for any student
          </p>
        </div>

        {/* Search Card */}
        <Card >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Student
            </CardTitle>
            <CardDescription>Find by name, admission number, or class</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Type student name, admission no, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 text-lg"
                />
              </div>

              {/* Search Results */}
              {searchTerm && filteredStudents && filteredStudents.length > 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filteredStudents.slice(0, 12).map((s) => (
                      <Card
                        key={s.userId}
                        className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all"
                        onClick={() => handleSelectStudent(s)}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0">
                              {s.user?.profilePicture ? (
                                <img
                                  src={s.user.profilePicture}
                                  className='rounded-full object-cover w-12 h-12'
                                  alt={s.name}
                                />
                              ) : (
                                s.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{s.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {s.admissionNo}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                Class {s.class?.className}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : searchTerm ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium">No students found</p>
                  <p className="text-sm text-muted-foreground">
                    No students match "{searchTerm}"
                  </p>
                </div>
              ) : null}

              {/* Recent Students */}
              {!searchTerm && recentStudents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Recently Viewed</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentStudents.map((s) => (
                      <Card
                        key={s.userId}
                        className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all"
                        onClick={() => handleSelectStudent(s)}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0">
                              {s.user?.profilePicture ? (
                                <img
                                  src={s.user.profilePicture}
                                  className='rounded-full object-cover w-12 h-12'
                                  alt={s.name}
                                />
                              ) : (
                                s.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{s.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {s.admissionNo}
                              </p>
                              <Badge variant="secondary" className="mt-1">
                                Class {s.class?.className}
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
              {!searchTerm && recentStudents.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium">Start Searching</p>
                  <p className="text-sm text-muted-foreground">
                    Type a student name, admission number, or class to begin
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-muted-foreground">Loading attendance data...</p>
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {student?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {student?.admissionNo} • {student?.className} {student?.sectionName && `- ${student.sectionName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStudentId('')}>
            Change Student
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats?.totalPresent || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats?.totalAbsent || 0}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.totalLate || 0}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.attendancePercentage?.toFixed(1) || 0}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardContent className="pt-6">
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
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Calendar View - Updated UI */}
        <TabsContent value="calendar">
          <Card className="shadow-xl border-2 hover:border-primary/20 transition-all">
            <CardHeader>
              <CardTitle>Monthly Calendar</CardTitle>
              <CardDescription>Color-coded attendance calendar</CardDescription>
             <Badge>Streak {streak ?? "..."}</Badge>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="flex flex-col">
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

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {calendar?.map((day, idx) => {
                    const isToday = day.day === today.getDate() &&
                      month === today.getMonth() + 1 &&
                      year === today.getFullYear();
                    const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "min-h-[90px] md:min-h-[110px] p-2 rounded-xl border-2 transition-all duration-200",
                          day.isWorkingDay && "hover:border-primary hover:shadow-lg hover:scale-[1.02]",
                          !day.isWorkingDay && "opacity-30",
                          isToday && "bg-gradient-to-br from-primary/15 to-primary/5 border-primary shadow-md",
                          !isToday && day.isWorkingDay && "border-border bg-card",
                          isWeekend && day.isWorkingDay && "bg-muted/30"
                        )}
                        title={day.marked ? `${day.status} - ${day.markedBy}` : 'Not marked'}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-xs md:text-sm font-bold",
                              isToday && "text-primary",
                              !day.isWorkingDay && "text-muted-foreground"
                            )}>
                              {day.day}
                            </span>
                            {day.marked && (
                              <Badge
                                variant="secondary"
                                className="h-5 min-w-5 px-1.5 text-xs"
                              >
                                ✓
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 overflow-y-auto flex-1">
                            {day.marked && (
                              <div
                                className={cn(
                                  "text-[10px] md:text-xs px-2 py-1 rounded-md text-white font-medium shadow-sm flex items-center justify-center gap-1",
                                  getStatusColor(day.status)
                                )}
                              >
                                {getStatusIcon(day.status)}
                                <span className="truncate">{day.status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-sm">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-sm">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span className="text-sm">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span className="text-sm">On Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-gray-200"></div>
                  <span className="text-sm">Not Marked</span>
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
              <CardDescription>Complete attendance history with timestamps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Check-in</th>
                      <th className="text-left p-3">Check-out</th>
                      <th className="text-left p-3">Hours</th>
                      <th className="text-left p-3">Marked By</th>
                      <th className="text-left p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records?.map((record) => (
                      <tr key={record.date} className="border-b hover:bg-accent">
                        <td className="p-3">
                          {new Date(record.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              record.status === 'PRESENT' ? 'default' :
                                record.status === 'ABSENT' ? 'destructive' :
                                  record.status === 'LATE' ? 'warning' : 'secondary'
                            }
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3">
                          {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3">
                          {record.workingHours ? `${record.workingHours.toFixed(2)}h` : '—'}
                        </td>
                        <td className="p-3">{record.markedBy || '—'}</td>
                        <td className="p-3">{record.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison View */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
              <CardDescription>Attendance trend over past months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparison?.map((month) => (
                  <div key={`${month.year}-${month.month}`} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">
                        {new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <Badge variant={month.percentage >= 75 ? 'default' : 'destructive'}>
                        {month.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Present</p>
                        <p className="font-semibold text-green-600">{month.present}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Absent</p>
                        <p className="font-semibold text-red-600">{month.absent}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${month.percentage >= 75 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${month.percentage}%` }}
                        />
                      </div>
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