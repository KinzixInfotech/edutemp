'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, TrendingUp, Download, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertCircle,
  Search, Users, RefreshCw, ChevronDown, Eye, School, BookOpen,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import LoaderPage from '@/components/loader-page';
import { cn } from '@/lib/utils';

const STUDENTS_PER_PAGE = 10;

const displayClassName = (name) => {
  const num = parseInt(name, 10);
  if (isNaN(num)) return name;
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[num - 1] || name;
};

export default function StudentAttendanceHistory() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const { selectedYear } = useAcademicYear();
  const academicYearId = selectedYear?.id;
  if (!schoolId) return <LoaderPage />;

  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  // Grouped table state
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Map()); // sectionId -> { page }
  const [sectionSearch, setSectionSearch] = useState(new Map()); // sectionId -> search term

  // ─── Fetch classes with sections ────────────────────────────────
  const { data: classesData, isLoading: classesLoading, isFetching: classesFetching } = useQuery({
    queryKey: ['classes-for-history', schoolId, academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '-1', getAcademicYear: 'true' });
      if (academicYearId) params.append('academicYearId', academicYearId);
      const res = await fetch(`/api/schools/${schoolId}/classes?${params}`);
      if (!res.ok) throw new Error('Failed to fetch classes');
      const json = await res.json();
      return Array.isArray(json) ? json : (json?.data || []);
    },
    enabled: !!schoolId && !studentId,
    staleTime: 1000 * 60 * 5,
  });

  const classes = classesData || [];

  // Filter classes by search term
  const filteredClasses = useMemo(() => {
    if (!searchTerm) return classes;
    const term = searchTerm.toLowerCase();
    return classes.filter(cls => {
      const name = cls.className?.toLowerCase() || '';
      const display = displayClassName(cls.className)?.toLowerCase() || '';
      return name.includes(term) || display.includes(term);
    });
  }, [classes, searchTerm]);

  // Total counts
  const totalStudents = useMemo(() =>
    classes.reduce((sum, cls) =>
      sum + (cls.sections?.reduce((s, sec) => s + (sec._count?.students || 0), 0) || 0), 0),
    [classes]);
  const totalSections = useMemo(() =>
    classes.reduce((sum, cls) => sum + (cls.sections?.length || 0), 0),
    [classes]);

  // Fetch dashboard stats for summary cards
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['attendance-dashboard', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId && !studentId
  });

  const studentSummary = dashboardData?.roleWiseStats?.find(r => r.roleName === 'STUDENT') || {};

  // ─── Section student fetcher (per-section, on demand) ───────────
  function SectionStudents({ schoolId, classId, sectionId, sectionName, className }) {
    const sectionState = expandedSections.get(sectionId) || { page: 1 };
    const currentPage = sectionState.page;
    const search = sectionSearch.get(sectionId) || '';

    const { data: studentData, isLoading: studentsLoading } = useQuery({
      queryKey: ['section-students', schoolId, classId, sectionId, currentPage, search],
      queryFn: async () => {
        const params = new URLSearchParams({
          classId: String(classId),
          sectionId: String(sectionId),
          page: String(currentPage),
          limit: String(STUDENTS_PER_PAGE),
          sortBy: 'name_asc',
        });
        if (search) params.set('search', search);
        const res = await fetch(`/api/schools/${schoolId}/students?${params}`);
        if (!res.ok) throw new Error('Failed');
        return res.json();
      },
      enabled: !!sectionId,
      staleTime: 1000 * 60 * 2,
    });

    const students = studentData?.students || [];
    const total = studentData?.total || 0;
    const totalPages = Math.ceil(total / STUDENTS_PER_PAGE);

    const setPage = (p) => {
      setExpandedSections(prev => {
        const next = new Map(prev);
        next.set(sectionId, { ...sectionState, page: p });
        return next;
      });
    };

    const handleSearch = (val) => {
      setSectionSearch(prev => {
        const next = new Map(prev);
        next.set(sectionId, val);
        return next;
      });
      // Reset to page 1 when searching
      setExpandedSections(prev => {
        const next = new Map(prev);
        next.set(sectionId, { ...sectionState, page: 1 });
        return next;
      });
    };

    return (
      <>
        {/* Search + info row */}
        <TableRow className="bg-muted/10">
          <TableCell colSpan={5}>
            <div className="flex items-center gap-3 pl-12">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={`Search in ${displayClassName(className)} - ${sectionName}...`}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {total} student{total !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </span>
            </div>
          </TableCell>
        </TableRow>

        {/* Student header row */}
        <TableRow className="bg-muted/20">
          <TableCell className="pl-14 text-xs font-medium text-muted-foreground">Student</TableCell>
          <TableCell className="text-xs font-medium text-muted-foreground">Admission No</TableCell>
          <TableCell className="text-xs font-medium text-muted-foreground">Section</TableCell>
          <TableCell className="text-xs font-medium text-muted-foreground">Status</TableCell>
          <TableCell className="text-right text-xs font-medium text-muted-foreground">Action</TableCell>
        </TableRow>

        {/* Loading state */}
        {studentsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={`skel-${i}`} className="animate-pulse">
              <TableCell className="pl-14"><Skeleton className="h-8 w-40" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-12" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
              {search ? `No students found matching "${search}"` : 'No students in this section'}
            </TableCell>
          </TableRow>
        ) : (
          students.map((s) => (
            <TableRow
              key={s.userId}
              className="hover:bg-muted/30 cursor-pointer transition-colors group"
              onClick={() => handleSelectStudent(s)}
            >
              <TableCell className="pl-14">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs overflow-hidden flex-shrink-0">
                    {s.user?.profilePicture ? (
                      <img
                        src={s.user.profilePicture}
                        className="w-8 h-8 rounded-full object-cover"
                        alt={s.name}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <span className={s.user?.profilePicture ? 'hidden' : 'flex'}>
                      {s.name?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{s.name}</p>
                    {s.email && <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono text-muted-foreground">{s.admissionNo || '—'}</span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">{sectionName}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    s.user?.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
                      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                  )}
                >
                  {s.user?.status || 'ACTIVE'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleSelectStudent(s); }}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <TableRow className="bg-muted/10">
            <TableCell colSpan={5}>
              <div className="flex items-center justify-between pl-12 py-1">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages} · {total} students
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Prev
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 w-7 text-xs p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  // ─── Fetch student history (detail view) ────────────────────────
  const { data, isLoading, refetch: refetchHistory } = useQuery({
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
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleExport = async (format) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/student-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId, format,
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
  };

  // Toggle class expansion
  const toggleClass = (classId) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  // Toggle section expansion (show/hide students)
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Map(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.set(sectionId, { page: 1 });
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // STUDENT LIST VIEW (grouped by class → section)
  // ═══════════════════════════════════════════════════════════════
  if (!studentId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Student Attendance History
            </h1>
            <p className="text-muted-foreground">
              Browse students by class and section to view detailed attendance history
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchDashboard()} disabled={dashboardLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentSummary.totalUsers || totalStudents || 0}</div>
              <p className="text-xs text-muted-foreground">Enrolled scholars</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{studentSummary.present || 0}</div>
              <p className="text-xs text-muted-foreground">Marked present</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{studentSummary.absent || 0}</div>
              <p className="text-xs text-muted-foreground">Marked absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Marked</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(studentSummary.totalUsers || 0) - (studentSummary.present || 0) - (studentSummary.absent || 0) - (studentSummary.onLeave || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Pending attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Classes Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  All Classes ({filteredClasses.length})
                </CardTitle>
                <CardDescription>Click a class to expand sections, then view individual student history</CardDescription>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t rounded-b-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Class / Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Info</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classesLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredClasses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <School className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <h3 className="text-lg font-semibold mb-1">
                            {searchTerm ? 'No classes match your search' : 'No classes found'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm ? 'Try adjusting your search term' : 'Classes need to be created first'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClasses.map(cls => {
                        const isExpanded = expandedClasses.has(cls.id);
                        const clsTotalStudents = cls.sections?.reduce((sum, s) => sum + (s._count?.students || 0), 0) || 0;
                        const sectionCount = cls.sections?.length || 0;

                        return (
                          <Fragment key={cls.id}>
                            {/* Class Group Header */}
                            <TableRow
                              className="bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                              onClick={() => toggleClass(cls.id)}
                            >
                              <TableCell colSpan={5}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    {isExpanded
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    }
                                    <Badge variant="outline" className="font-semibold text-sm">
                                      {displayClassName(cls.className)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {sectionCount} {sectionCount === 1 ? 'section' : 'sections'} · {clsTotalStudents} {clsTotalStudents === 1 ? 'student' : 'students'}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Sections (expanded) */}
                            {isExpanded && (
                              <>
                                {!cls.sections?.length ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-4 text-center">
                                      <span className="text-sm text-muted-foreground">
                                        No sections in this class
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  cls.sections.map(sec => {
                                    const isSectionExpanded = expandedSections.has(sec.id);
                                    const secStudents = sec._count?.students || 0;

                                    return (
                                      <Fragment key={sec.id}>
                                        {/* Section Row */}
                                        <TableRow
                                          className={cn(
                                            "hover:bg-muted/50 cursor-pointer transition-colors",
                                            isSectionExpanded && "bg-primary/5"
                                          )}
                                          onClick={() => toggleSection(sec.id)}
                                        >
                                          <TableCell className="pl-10">
                                            <div className="flex items-center gap-2">
                                              {isSectionExpanded
                                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                              }
                                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                              <span className="font-medium text-sm">Section</span>
                                              <Badge variant="secondary" className="text-xs">{sec.name}</Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell />
                                          <TableCell />
                                          <TableCell>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-xs",
                                                secStudents > 0
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                                                  : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400"
                                              )}
                                            >
                                              <Users className="h-3 w-3 mr-1" />
                                              {secStudents} students
                                            </Badge>
                                          </TableCell>
                                          <TableCell />
                                        </TableRow>

                                        {/* Students (section expanded) */}
                                        {isSectionExpanded && (
                                          <SectionStudents
                                            schoolId={schoolId}
                                            classId={cls.id}
                                            sectionId={sec.id}
                                            sectionName={sec.name}
                                            className={cls.className}
                                          />
                                        )}
                                      </Fragment>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENT DETAIL VIEW (unchanged)
  // ═══════════════════════════════════════════════════════════════
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header with Change Student Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Student Attendance History</h1>
        <Button variant="outline" size="sm" onClick={() => setStudentId('')}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Classes
        </Button>
      </div>

      {/* Student Profile Card */}
      <Card className="border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 overflow-hidden">
              {student?.profilePicture ? (
                <img
                  src={student.profilePicture}
                  alt={student.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                student?.name?.charAt(0) || 'S'
              )}
            </div>

            {/* Student Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-2">{student?.name}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline">
                  Class {student?.className}{student?.sectionName && ` - ${student.sectionName}`}
                </Badge>
                {student?.rollNumber && (
                  <Badge variant="secondary">
                    Roll #{student.rollNumber}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Admission No:</span> {student?.admissionNo || 'N/A'}
              </p>
            </div>

            {/* Streak & Attendance */}
            <div className="flex gap-3 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-xl font-bold text-orange-600">{stats?.streak || 0}</p>
                  <p className="text-[10px] text-orange-600/70">Day Streak</p>
                </div>
              </div>
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

        {/* Calendar View */}
        <TabsContent value="calendar">
          <Card className="border">
            <CardHeader className="pb-4">
              <CardTitle>Monthly Calendar</CardTitle>
              <CardDescription>Color-coded attendance calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
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
                        title={day.marked ? `${day.status} - ${day.markedBy}` : 'Not marked'}
                      >
                        <div className="flex flex-col h-full">
                          <span className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>
                            {day.day}
                          </span>
                          {day.marked && (
                            <div className={cn(
                              "text-[9px] sm:text-xs px-1.5 py-0.5 rounded text-white font-medium flex items-center justify-center gap-0.5",
                              getStatusColor(day.status)
                            )}>
                              {getStatusIcon(day.status)}
                              <span className="hidden sm:inline">{day.status}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border bg-muted/50"></div>
                  <span>Not Marked</span>
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