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
import { CalendarClock } from "lucide-react";
import { ChartPieLabel } from '@/components/chart-pie';
import { ChartBarHorizontal, } from '@/components/bar-chart';
import { ChartLineLabel } from '@/components/line-chart';
import BigCalendar from '@/components/big-calendar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useGlobalLoading } from '@/lib/utils';

// const LatestNotice = () => {
//   // Dummy data
//   const latestNotice = {
//     title: "Holiday Announcement",
//     description: "School will remain closed on 15th September due to festival celebrations.",
//     priority: "URGENT", // Can be NORMAL, IMPORTANT, URGENT
//     date: "September 5, 2025",
//   };

//   // Color based on priority
//   const priorityColor = {
//     NORMAL: "bg-blue-100 text-blue-800",
//     IMPORTANT: "bg-yellow-100 text-yellow-800",
//     URGENT: "bg-red-100 text-red-800",
//   };

//   return (
//     <div className="w-full  bg-muted dark:bg-[#18181b]  rounded-xl p-4 ">
//       <div className={`px-2 py-1 w-fit rounded-full text-xs font-medium ${priorityColor[latestNotice.priority]}`}>
//         {latestNotice.priority}
//       </div>
//       <div className="flex px-1 py-2 items-start gap-4">

//         <div>
//           <h3 className="text-lg font-semibold text-foreground border-b w-fit">{latestNotice.title}</h3>
//           <p className="text-sm text-muted-foreground mt-1">{latestNotice.description}</p>
//           <p className="text-xs text-muted-foreground mt-2 mb-2">{latestNotice.date}</p>
//           <Link href="/dashboard/schools/noticeboard">
//             <span className='border-b py-1 text-sm  cursor-pointer '>
//               View Notice
//             </span>
//           </Link>
//           <
// Link href="/dashboard/schools/noticeboard" className='ml-1.5'>
//             <span className='border-b py-1 text-sm  cursor-pointer '>
//               Dismiss
//             </span>
//           </Link>
//         </div>

//       </div>

//     </div>
//   );
// };
// import { useEffect, useState } from 'react';
// import Link from 'next/link';

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
  // Fetch latest notice from API
  // useEffect(() => {
  //   const fetchLatestNotice = async () => {
  //     const params = new URLSearchParams({
  //       userId: fullUser.id,
  //       schoolId: fullUser.schoolId,

  //       limit: "1",
  //       offset: "0",
  //     });

  //     try {
  //       const res = await fetch(`/api/schools/notice/get?${params}`);
  //       const data = await res.json();
  //       if (data.notices && data.notices.length > 0) {
  //         setLatestNotice(data.notices[0]);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching latest notice:", error);
  //     }
  //   };

  //   fetchLatestNotice();
  //   console.log(fullUser, 'from notice');

  // }, [fullUser?.schoolId]);

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
  // Prefetch if needed (optional, you can remove this block if not required)
  // useEffect(() => {
  //   if (!fullUser) return;

  //   if (fullUser.role.name === 'SUPER_ADMIN') {
  //     queryClient.prefetchQuery(['schoolTrend'], fetchSchoolTrend);
  //     queryClient.prefetchQuery(['activeAccounts'], fetchActiveAccounts);
  //   } else if (fullUser.role.name === 'ADMIN') {
  //     queryClient.prefetchQuery(['adminTeacherStats', fullUser.schoolId], () => fetchAdminStatsTeacher(fullUser.schoolId));
  //     queryClient.prefetchQuery(['adminNonTeacherStats', fullUser.schoolId], () => fetchAdminStatsNonTeacher(fullUser.schoolId));
  //   }
  // }, [fullUser, queryClient]);
  useEffect(() => {
    if (!fullUser) return;

    if (fullUser.role.name === 'SUPER_ADMIN') {
      queryClient.prefetchQuery(['schoolTrend'], fetchSchoolTrend);
      queryClient.prefetchQuery(['activeAccounts'], fetchActiveAccounts);
    } else if (fullUser.role.name === 'ADMIN') {
      queryClient.prefetchQuery(['adminTeacherStats', fullUser.schoolId], () => fetchAdminStatsTeacher(fullUser.schoolId));
      queryClient.prefetchQuery(['adminNonTeacherStats', fullUser.schoolId], () => fetchAdminStatsNonTeacher(fullUser.schoolId));
    }
  }, [fullUser, queryClient]);


  const events = [
    { title: "Product Strategy Meeting", time: "12:00 PM – 02:00 PM", description: "Align roadmap and define Q4 deliverables." },
    { title: "UX Audit Review", time: "03:00 PM – 04:30 PM", description: "Review accessibility and UI consistency." },
    { title: "Sprint Planning", time: "05:00 PM – 06:00 PM", description: "Define next sprint tasks and goals." },
  ];

  const cards = [,
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
            <div className='px-4'>
              <LatestNotice fullUser={fullUser} queryClient={queryClient} />
            </div>
            <SectionCards data={cards} isloading={isLoading} />
            <div className="flex flex-col gap-3.5 px-4">
              {/* <ChartAreaInteractive chartData={chartDataSuper} /> */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">

                <ChartPieLabel chartData={chartData} title="Students" date="January - June 2024" isLoading={isLoading} />
                {/* <ChartBarMultiple chartData={barchartData} title="Attendance" date="Today" />
                 */}
                <ChartBarHorizontal isLoading={isLoading} />
              </div>
              {/* <ChartLineLabel chartData={linechartData} title="Finance" date="Today" /> */}
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
          // { label: "Total Revenue", value: "2000", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
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
              {/* Announcement Panel */}
              {/* <div className="lg:col-span-1 w-full border-none px-2.5 py-2.5 rounded-sm dark:bg-card">    <div className="w-full py-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold dark:text-white text-gray-800">Announcement</h2>
                  <button className="text-xs dark:text-white text-gray-500 hover:text-gray-800">View</button>
                </div>
                <EventList events={events} />
              </div>
              </div> */}
            </div>
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
