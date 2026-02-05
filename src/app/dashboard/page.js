'use client';
export const dynamic = 'force-dynamic';
;

import { useAuth } from '@/context/AuthContext';
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useMemo, useState } from 'react';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { SectionCards } from '@/components/section-cards';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LoaderPage from '@/components/loader-page';
import { CalendarClock, Plus, LayoutDashboard, Clock } from "lucide-react";
import { ChartPieLabel } from '@/components/chart-pie';
import { ChartBarHorizontal, } from '@/components/bar-chart';
import { ChartLineLabel } from '@/components/line-chart';
import BigCalendar from '@/components/big-calendar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useGlobalLoading } from '@/lib/utils';
import PartnerDashboard from './partnerprogram/dashboard/page';
import { WIDGETS, DEFAULT_WIDGETS } from '@/components/dashboard/widgets/registry';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import DailyStatsCards from '@/components/dashboard/DailyStatsCards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import OnboardingModal from '@/components/dashboard/OnboardingModal'; // Legacy - kept for reference
import AiInsightsCard from '@/components/dashboard/AiInsightsCard';
import RecentPaymentsWidget from '@/components/dashboard/widgets/RecentPaymentsWidget';

// School Timing Warning Component
const SchoolTimingWarning = ({ schoolId }) => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['schoolConfig', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5,
  });

  // Check if config has never been modified (createdAt equals updatedAt)
  // This means the config was auto-created with defaults and never saved by user
  const configData = config?.config;
  const isNeverModified = configData?.createdAt && configData?.updatedAt &&
    new Date(configData.createdAt).getTime() === new Date(configData.updatedAt).getTime();

  // Only show warning if config exists but was never explicitly saved
  if (isLoading || !isNeverModified) return null;

  return (
    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-start gap-3">
      <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
        <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-purple-900 dark:text-purple-100">Setup Required: School Timing</h3>
        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
          Configure your school's working days and hours for accurate attendance tracking and reporting.
        </p>
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm" className="mt-3 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200">
            Configure Timing
          </Button>
        </Link>
      </div>
    </div>
  );
};


// ... (LatestNotice component remains unchanged) ...
const LatestNotice = ({ fullUser, queryClient }) => {
  if (!fullUser) return
  const [dismissedNoticeId, setDismissedNoticeId] = useState(null);

  // Load dismissed notice ID from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedNoticeId');
    if (dismissed) {
      setDismissedNoticeId(dismissed);
    }
  }, []);
  const fetchLatestNotice = async ({ queryKey }) => {
    const [_key, { userId, schoolId }] = queryKey;
    const params = new URLSearchParams({
      userId,
      schoolId,
      limit: "1",
      offset: "0"
    });

    const res = await fetch(`/api/schools/notice/get?${params}`);
    if (!res.ok) throw new Error('Failed to fetch notice');
    const data = await res.json();
    return data.notices[0] || null;
  };
  // Prefetch the notice on page load
  useEffect(() => {
    if (fullUser) {
      queryClient.prefetchQuery({
        queryKey: ['latestNotice', { userId: fullUser.id, schoolId: fullUser.schoolId }],
        queryFn: fetchLatestNotice
      });
    }
  }, [fullUser?.schoolId, queryClient]);

  // Use the query to access data
  const { data: latestNotice, isLoading, error } = useQuery({
    queryKey: ['latestNotice', { userId: fullUser.id, schoolId: fullUser.schoolId }],
    queryFn: fetchLatestNotice,
    enabled: !!fullUser, // ensure fullUser exists before fetching
    staleTime: 1000 * 60 * 5 // cache for 5 minutes
  });

  const handleDismiss = () => {
    if (latestNotice) {
      localStorage.setItem('dismissedNoticeId', latestNotice.id);
      setDismissedNoticeId(latestNotice.id);
    }
  };

  // If there's no notice or the latest notice was dismissed, show nothing
  if (!latestNotice || latestNotice.id === dismissedNoticeId) {
    return null;
  }

  const priorityColor = {
    NORMAL: "bg-blue-100 text-blue-800",
    IMPORTANT: "bg-yellow-100 text-yellow-800",
    URGENT: "bg-red-100 text-red-800",
  };

  return (
    <div className="w-full bg-muted dark:bg-[#18181b] rounded-xl p-4">
      <div className={`px-2 py-1 w-fit rounded-full text-xs font-medium ${priorityColor[latestNotice.priority] || 'bg-gray-100 text-gray-800'}`}>
        {latestNotice.priority}
      </div>
      <div className="flex px-1 py-2 items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground border-b w-fit">{latestNotice.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{latestNotice.description}</p>
          <p className="text-xs text-muted-foreground mt-2 mb-2">{new Date(latestNotice.publishedAt).toLocaleDateString()}</p>
          <Link href="/dashboard/schools/noticeboard">
            <span className='border-b py-1 text-sm cursor-pointer'>
              View Notice
            </span>
          </Link>
          <button onClick={handleDismiss} className='ml-2 border-b py-1 text-sm cursor-pointer bg-transparent'>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

// Define your fetch functions outside useQuery for reuse
const fetchSchoolTrend = async () => {
  const res = await fetch('/api/school-trend');
  if (!res.ok) throw new Error('Failed to fetch school trend');
  const data = await res.json();
  return data;
};

const fetchActiveAccounts = async () => {
  const res = await fetch('/api/account-status');
  if (!res.ok) throw new Error('Failed to fetch active accounts');
  const data = await res.json();
  return data.active ?? 0;
};

const fetchAdminStatsTeacher = async (schoolId) => {
  const res = await fetch(`/api/schools/teaching-staff/${schoolId}/count`);
  if (!res.ok) throw new Error("Failed to fetch teaching staff count");
  const count = await res.json();

  const genderRes = await fetch(`/api/schools/gender-count/${schoolId}`);
  if (!genderRes.ok) throw new Error("Failed to fetch gender count");
  const genderData = await genderRes.json();

  return {
    adminTeacherCount: count.count,
    maleCount: genderData.male ?? 0,
    femaleCount: genderData.female ?? 0,
    totalStudentCount: genderData.total ?? 0,
  };
};

// Use the global loading hook

const fetchAdminStatsNonTeacher = async (schoolId) => {
  const res = await fetch(`/api/schools/non-teaching-staff/${schoolId}/count`);
  if (!res.ok) throw new Error("Failed to fetch non-teaching staff count");
  const data = await res.json();
  return { adminNonTeacherCount: data.count };
};


export default function Dashboard() {

  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const { fullUser, loading } = useAuth();

  // Widget State - Removed as per fixed layout requirement
  // const [activeWidgets, setActiveWidgets] = useState(DEFAULT_WIDGETS);
  // const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false);


  // Super Admin Queries
  const schoolTrendQuery = useQuery({
    queryKey: ['schoolTrend'],
    queryFn: fetchSchoolTrend,
    enabled: fullUser?.role?.name === 'SUPER_ADMIN',
    staleTime: 1000 * 60 * 5,
  });

  const activeAccountsQuery = useQuery({
    queryKey: ['activeAccounts'],
    queryFn: fetchActiveAccounts,
    enabled: fullUser?.role?.name === 'SUPER_ADMIN',
    staleTime: 1000 * 60 * 5,
  });

  const adminTeacherStatsQuery = useQuery({
    queryKey: ['adminTeacherStats', fullUser?.schoolId],
    queryFn: () => fetchAdminStatsTeacher(fullUser.schoolId),
    enabled: fullUser?.role?.name === 'ADMIN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 5,
  });

  const adminNonTeacherStatsQuery = useQuery({
    queryKey: ['adminNonTeacherStats', fullUser?.schoolId],
    queryFn: () => fetchAdminStatsNonTeacher(fullUser.schoolId),
    enabled: fullUser?.role?.name === 'ADMIN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 5,
  });

  // Librarian Queries
  const libraryStatsQuery = useQuery({
    queryKey: ["libraryStats", fullUser?.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/library/stats?schoolId=${fullUser.schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: fullUser?.role?.name === 'LIBRARIAN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 5,
  });

  const bookRequestsQuery = useQuery({
    queryKey: ["bookRequests", fullUser?.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/library/requests?schoolId=${fullUser.schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: fullUser?.role?.name === 'LIBRARIAN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 2,
  });

  const dueBooksQuery = useQuery({
    queryKey: ["dueBooks", fullUser?.schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/library/due-today?schoolId=${fullUser.schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch due books");
      return res.json();
    },
    enabled: fullUser?.role?.name === 'LIBRARIAN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 2,
  });


  // ========== ACADEMIC YEARS QUERY (needed first for consolidated API) ==========
  const academicYearsQuery = useQuery({
    queryKey: ['academic-years', fullUser?.schoolId],
    queryFn: async () => {
      if (!fullUser?.schoolId) return [];
      const response = await fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : (data.academicYears || []);
    },
    enabled: fullUser?.role?.name === 'ADMIN' && !!fullUser?.schoolId,
    staleTime: 1000 * 60 * 5,
  });

  const activeAcademicYear = academicYearsQuery.data?.find(y => y.isActive);

  // ========== CONSOLIDATED DASHBOARD API (for ADMIN) ==========
  // Single API call that replaces multiple individual queries
  const consolidatedQuery = useQuery({
    queryKey: ['dashboard-consolidated', fullUser?.schoolId, activeAcademicYear?.id],
    queryFn: async () => {
      if (!fullUser?.schoolId) return null;
      const params = new URLSearchParams({ schoolId: fullUser.schoolId });
      if (activeAcademicYear?.id) params.append('academicYearId', activeAcademicYear.id);
      const res = await fetch(`/api/dashboard/consolidated?${params}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    enabled: fullUser?.role?.name === 'ADMIN' && !!fullUser?.schoolId && !!activeAcademicYear?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 60000, // Refresh every minute
  });

  // Use setup status from consolidated API (default to true to avoid false warnings while loading)
  const hasClasses = consolidatedQuery.data?.setupStatus?.hasClasses ?? true;
  const hasFeeStructures = consolidatedQuery.data?.setupStatus?.hasFeeStructures ?? true;

  // Data extraction
  const schoolTrendData = schoolTrendQuery.data || {};
  const chartDataSuper = schoolTrendData.data?.map(item => ({
    date: item.date,
    schools: item.schools,
  })) || [];
  const schoolCount = schoolTrendData.data?.[schoolTrendData.data.length - 1]?.schools || 0;
  const trend = schoolTrendData.trend ?? 0;
  const direction = schoolTrendData.direction ?? "neutral";

  const activeCount = activeAccountsQuery.data || 0;

  const adminTeacherStats = adminTeacherStatsQuery.data || {};
  const adminTeacherCount = adminTeacherStats.adminTeacherCount || 0;
  const maleCount = adminTeacherStats.maleCount || 0;
  const femaleCount = adminTeacherStats.femaleCount || 0;
  const totalStudentCount = adminTeacherStats.totalStudentCount || 0;

  const adminNonTeacherStats = adminNonTeacherStatsQuery.data || {};
  const adminNonTeacherCount = adminNonTeacherStats.adminNonTeacherCount || 0;

  //  Use global loading hook
  const isLoading = useGlobalLoading([
    schoolTrendQuery,
    activeAccountsQuery,
    adminTeacherStatsQuery,
    adminNonTeacherStatsQuery,
  ]);

  useEffect(() => {
    if (!fullUser) return;

    if (fullUser.role.name === 'SUPER_ADMIN') {
      queryClient.prefetchQuery({ queryKey: ['schoolTrend'], queryFn: fetchSchoolTrend });
      queryClient.prefetchQuery({ queryKey: ['activeAccounts'], queryFn: fetchActiveAccounts });
    } else if (fullUser.role.name === 'ADMIN') {
      queryClient.prefetchQuery({ queryKey: ['adminTeacherStats', fullUser.schoolId], queryFn: () => fetchAdminStatsTeacher(fullUser.schoolId) });
      queryClient.prefetchQuery({ queryKey: ['adminNonTeacherStats', fullUser.schoolId], queryFn: () => fetchAdminStatsNonTeacher(fullUser.schoolId) });
    }
  }, [fullUser, queryClient]);


  const events = [
    { title: "Product Strategy Meeting", time: "12:00 PM – 02:00 PM", description: "Align roadmap and define Q4 deliverables." },
    { title: "UX Audit Review", time: "03:00 PM – 04:30 PM", description: "Review accessibility and UI consistency." },
    { title: "Sprint Planning", time: "05:00 PM – 06:00 PM", description: "Define next sprint tasks and goals." },
  ];

  const cards = [
    { label: "Total Teaching Staff", value: adminTeacherCount, direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
    { label: "Total Staffs", value: adminNonTeacherCount, direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
    { label: "Total Students", value: totalStudentCount, direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
  ];

  const chartData = [
    { browser: "Boys", visitors: maleCount, fill: "var(--ring)" },
    { browser: "Girls", visitors: femaleCount, fill: "#8ec5ff" },
  ];

  const barchartData = [
    { month: "January", Present: 186, Absent: 80 },
    { month: "February", Present: 305, Absent: 200 },
    { month: "March", Present: 237, Absent: 120 },
    { month: "April", Present: 73, Absent: 190 },
    { month: "May", Present: 209, Absent: 130 },
    { month: "June", Present: 214, Absent: 140 },
  ];

  const linechartData = [
    { month: "January", income: 4200, expense: 2500 },
    { month: "February", income: 3000, expense: 1500 },
    { month: "March", income: 3200, expense: 7000 },
    { month: "April", income: 3600, expense: 4600 },
    { month: "May", income: 2800, expense: 4800 },
    { month: "June", income: 3900, expense: 4400 },
  ];

  if (loading) return <LoaderPage />;

  const renderRoleContent = () => {
    switch (fullUser?.role?.name) {
      case "ADMIN":
        return (
          <>
            {/* Page Header */}
            <div className="px-4 mb-2">
              <h1 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                DASHBOARD OVERVIEW
              </h1>
            </div>

            {/* Welcome Banner */}
            <div className='px-4'>
              <WelcomeBanner
                fullUser={fullUser}
                schoolName={fullUser?.school?.name || 'Your School'}
              />

              {/* Setup Warnings */}
              {/* Old OnboardingModal removed - replaced by SchoolOnboardingWizard in client-layout */}

              <div className="flex flex-col gap-3 mt-4">
                {/* Warning: No Classes */}
                {!hasClasses && academicYearsQuery.data?.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
                    <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-full">
                      <LayoutDashboard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">Setup Required: Create Classes</h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        You haven't created any classes yet. You need classes to enroll students and manage the timetable.
                      </p>
                      <Link href="/dashboard/schools/create-classes">
                        <Button variant="outline" size="sm" className="mt-3 border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-200">
                          Create Classes
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Warning: No Fee Structures */}
                {!hasFeeStructures && academicYearsQuery.data?.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                      <IconTrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Setup Required: Fee Structures</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Different classes have different fees. Create fee structures to manage student payments and generate invoices.
                      </p>
                      <Link href="/dashboard/fees/manage-fee-structure">
                        <Button variant="outline" size="sm" className="mt-3 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                          Manage Fees
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Warning: School Timing Not Configured */}
                {academicYearsQuery.data?.length > 0 && (
                  <SchoolTimingWarning schoolId={fullUser?.schoolId} />
                )}
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className='px-4 mt-6'>
              <DailyStatsCards
                schoolId={fullUser?.schoolId}
                academicYearId={activeAcademicYear?.id}
                data={consolidatedQuery.data?.dailyStats}
              />
            </div>

            {/* AI Insights Section */}
            <div className="px-4">
              <AiInsightsCard schoolId={fullUser?.schoolId} />
            </div>

            {/* Widgets Grid - 3 equal columns for main widgets */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {/* Calendar Widget */}
              {WIDGETS['CALENDAR'] && (
                <div className="col-span-1">
                  <WIDGETS.CALENDAR.component
                    fullUser={fullUser}
                    upcomingEvents={consolidatedQuery.data?.upcomingEvents}
                  />
                </div>
              )}

              {/* Attendance Widget */}
              {WIDGETS['ATTENDANCE'] && (
                <div className="col-span-1">
                  <WIDGETS.ATTENDANCE.component
                    fullUser={fullUser}
                    data={consolidatedQuery.data?.attendanceSummary}
                  />
                </div>
              )}

              {/* Fee Stats Widget */}
              {WIDGETS['FEE_STATS'] && (
                <div className="col-span-1">
                  <WIDGETS.FEE_STATS.component
                    fullUser={fullUser}
                    feeStats={consolidatedQuery.data?.feeStats}
                  />
                </div>
              )}
            </div>

            {/* Recent Payments - Full Width */}
            <div className="px-4 mt-4">
              {WIDGETS['RECENT_PAYMENTS'] && (
                <RecentPaymentsWidget
                  fullUser={fullUser}
                  recentPayments={consolidatedQuery.data?.feeStats?.recentPayments}
                />
              )}
            </div>
          </>
        );
      case "TEACHER":
        return (
          <div className="px-4 sm:px-6">
            <SectionCards data={cards} />
            <ChartAreaInteractive />
          </div>
        );
      case "SUPER_ADMIN":

        const superadmindata = [
          { label: "Total School", value: schoolCount, trend: trend + '%', direction: direction, info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
          { label: "Active Accounts", value: activeCount ?? '...', direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
          // {label: "Total Revenue", value: "2000", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
          { label: "Total Employees", value: "0", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
        ];


        return (
          <>
            <SectionCards data={superadmindata} />
            <div className="flex flex-col gap-3.5 px-4 sm:px-6">
              <ChartAreaInteractive chartData={chartDataSuper} />
              <ChartLineLabel chartData={linechartData} title="Finance" date="Today" />
            </div>
          </>
        );
      case "STUDENT":
        return (
          <p className="text-sm px-4 text-muted-foreground">Welcome student! No charts for you today 😅</p>
        );
      case "LIBRARIAN":
        const libraryStats = libraryStatsQuery.data;
        const statsLoading = libraryStatsQuery.isLoading;
        const bookRequests = bookRequestsQuery.data || [];
        const requestsLoading = bookRequestsQuery.isLoading;
        const dueBooks = dueBooksQuery.data || [];
        const dueLoading = dueBooksQuery.isLoading;

        return (
          <div className="px-4 space-y-6">
            <WelcomeBanner fullUser={fullUser} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Books</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {statsLoading ? "..." : libraryStats?.totalBooks || 0}
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">In library catalog</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Books Issued</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {statsLoading ? "..." : libraryStats?.booksIssued || 0}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">Currently checked out</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 border-orange-200 dark:border-orange-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">Pending Returns</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {statsLoading ? "..." : libraryStats?.pendingReturns || 0}
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-300">Due this week</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Fines Collected</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    ₹{statsLoading ? "..." : libraryStats?.finesCollected || 0}
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">This month</p>
                </CardDescription>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardDescription className="px-6 pb-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Link href="/dashboard/schools/library/catalog">
                    <Button className="w-full" variant="outline">Manage Books</Button>
                  </Link>
                  <Link href="/dashboard/schools/library/issue">
                    <Button className="w-full" variant="outline">Issue & Return</Button>
                  </Link>
                  <Link href="/dashboard/schools/library/requests">
                    <Button className="w-full" variant="outline">View Requests</Button>
                  </Link>
                  <Link href="/dashboard/schools/library/fines">
                    <Button className="w-full" variant="outline">Fines & Reports</Button>
                  </Link>
                </div>
              </CardDescription>
            </Card>

            {/* Recent Activity Tables */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Recent Book Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Book Requests</CardTitle>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  {requestsLoading ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
                  ) : bookRequests.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">No recent requests</div>
                  ) : (
                    <div className="space-y-3">
                      {bookRequests.slice(0, 3).map((request) => (
                        <div key={request.id} className="flex items-center justify-between pb-2 border-b last:border-b-0">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{request.book?.title || "Unknown Book"}</p>
                            <p className="text-xs text-muted-foreground">Requested by {request.user?.name || "Unknown"}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${request.status === "APPROVED" ? "bg-green-50 dark:bg-green-950/50" : request.status === "REJECTED" ? "bg-red-50 dark:bg-red-950/50" : "bg-yellow-50 dark:bg-yellow-950/50"}`}
                          >
                            {request.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardDescription>
              </Card>

              {/* Recently Purchased - Static for now */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Purchased</CardTitle>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No purchase records
                  </div>
                </CardDescription>
              </Card>

              {/* Due Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Due Today</CardTitle>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  {dueLoading ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
                  ) : dueBooks.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">No books due today</div>
                  ) : (
                    <div className="space-y-3">
                      {dueBooks.slice(0, 3).map((book) => {
                        const today = new Date().setHours(0, 0, 0, 0);
                        const dueDate = new Date(book.dueDate).setHours(0, 0, 0, 0);
                        const isOverdue = dueDate < today;

                        return (
                          <div key={book.id} className="flex items-center justify-between pb-2 border-b last:border-b-0">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{book.copy?.book?.title || "Unknown Book"}</p>
                              <p className="text-xs text-muted-foreground">{book.user?.name || "Unknown"}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${isOverdue ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300" : "bg-orange-50 dark:bg-orange-950/50"}`}
                            >
                              {isOverdue ? "Overdue" : "Due Today"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardDescription>
              </Card>
            </div>
          </div>
        );
      case "ACCOUNTANT":
        return (
          <div className="px-4 space-y-6">
            <WelcomeBanner fullUser={fullUser} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-200 dark:border-emerald-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Total Collected</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">₹0</div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">This month</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/50 dark:to-red-950/50 border-rose-200 dark:border-rose-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-100">Pending Fees</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">₹0</div>
                  <p className="text-xs text-rose-700 dark:text-rose-300">Outstanding</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-950/50 border-violet-200 dark:border-violet-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-violet-900 dark:text-violet-100">Fee Discounts</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">0</div>
                  <p className="text-xs text-violet-700 dark:text-violet-300">Active discounts</p>
                </CardDescription>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 border-amber-200 dark:border-amber-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Transactions</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </CardHeader>
                <CardDescription className="px-6 pb-4">
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">0</div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Today</p>
                </CardDescription>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardDescription className="px-6 pb-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Link href="/dashboard/fees/overview">
                    <Button className="w-full" variant="outline">Fee Overview</Button>
                  </Link>
                  <Link href="/dashboard/fees/payments">
                    <Button className="w-full" variant="outline">Track Payments</Button>
                  </Link>
                  <Link href="/dashboard/fees/manage-fee-structure">
                    <Button className="w-full" variant="outline">Fee Structure</Button>
                  </Link>
                  <Link href="/dashboard/fees/reports">
                    <Button className="w-full" variant="outline">Reports</Button>
                  </Link>
                </div>
              </CardDescription>
            </Card>
          </div>
        );
      case "PARTNER":
        return <PartnerDashboard />;
      default:
        return (
          <p className="text-sm px-4 text-gray-500">No dashboard available for your role.</p>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-2
    px-3 items-center lg:items-start h-full
    ">
      <div className="w-full lg:w-full flex flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 
           md:gap-6 md:py-6
          md:pr-0
          ">
            {renderRoleContent()}
            {fullUser?.role?.name !== 'ADMIN' && (
              <div className="flex  px-4">
                {/* Calendar + Events */}
                <div className="w-full border-none px-2.5 py-2.5 rounded-sm  dark:bg-card">
                  <div className="w-full py-2">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold dark:text-white text-gray-800">Events</h2>
                      <button className="text-xs dark:text-white text-gray-500 hover:text-gray-800">View</button>
                    </div>
                    <div className="space-y-2">
                      {events.map((event, idx) => (
                        <div
                          key={idx}
                          className="flex shadow-sm items-start gap-2 rounded-md bg-white px-3 py-2 dark:bg-[#222225] border-t-primary border-[0.5] border-t-2 transition-all"
                        >
                          <div className="flex flex-col flex-1 col-span-2 gap-1.5">
                            <h3 className="font-medium text-sm dark:text-white text-gray-800">{event.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-[#b5b5b5]">{event.description}</p>
                            <div className="flex flex-row items-center dark:text-white text-gray-400 text-[11px] pt-1 gap-2">
                              <CalendarClock className="h-4 w-4 mb-1" />
                              {event.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventList({ events }) {
  const bgColors = ["#f1f0ff", "#fefce8", "#edf9fd"];
  function getRandomBg() {
    return bgColors[Math.floor(Math.random() * bgColors.length)];
  }
  const bgMap = useMemo(() => events.map(() => getRandomBg()), [events]);

  return (
    <div className="space-y-2">
      {events.map((event, idx) => (
        <div
          key={idx}
          style={{ backgroundColor: bgMap[idx] }}
          className="flex shadow-sm items-start gap-2 rounded-md px-3 py-2 dark:bg-[#222225] border-t-primary border-[0.5] border-t-2 transition-all"
        >
          <div className="flex flex-col flex-1 gap-1.5">
            <h3 className="font-medium text-sm  text-gray-800
            
            dark:text-black
            ">{event.title}</h3>
            <p className="text-xs text-gray-500
            dark:text-[#383838]
            ">{event.description}</p>
            <div className="flex flex-row items-center  text-gray-400 text-[11px] pt-1 gap-2
             dark:text-black
            ">
              <CalendarClock className="h-4 w-4 mb-1" />
              {event.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
