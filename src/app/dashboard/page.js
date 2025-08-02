'use client';

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
import { useMemo, useState } from 'react';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { SectionCards } from '@/components/section-cards';
import LoaderPage from '@/components/loader-page';
import { CalendarClock } from "lucide-react";
import { ChartPieLabel } from '@/components/chart-pie';
import { ChartBarMultiple } from '@/components/bar-chart';
import { ChartLineLabel } from '@/components/line-chart';

export default function Dashboard() {
  const { fullUser, loading } = useAuth();
  const [date, setDate] = useState(new Date());

  const events = [
    { title: "Product Strategy Meeting", time: "12:00 PM – 02:00 PM", description: "Align roadmap and define Q4 deliverables." },
    { title: "UX Audit Review", time: "03:00 PM – 04:30 PM", description: "Review accessibility and UI consistency." },
    { title: "Sprint Planning", time: "05:00 PM – 06:00 PM", description: "Define next sprint tasks and goals." },
  ];

  const cards = [
    { label: "Total Students", value: "1,234", trend: "+12.5%", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
    { label: "Total Teacher", value: "2000", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
    { label: "Total Staffs", value: "200", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
    { label: "Total Alumini", value: "200", direction: "up", info: "Trending up this month", description: "Visitors for the last 6 months", date: "Aug 2, 2025" },
  ];

  const chartData = [
    { browser: "Boys", visitors: 275, fill: "var(--ring)" },
    { browser: "Girls", visitors: 200, fill: "#8ec5ff" },
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
            <SectionCards data={cards} />
            <div className="flex flex-col gap-3.5 px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                <ChartPieLabel chartData={chartData} title="Students" date="January - June 2024" />
                <ChartBarMultiple chartData={barchartData} title="Attendance" date="Today" />
              </div>
              <ChartLineLabel chartData={linechartData} title="Finance" date="Today" />
            </div>
          </>
        );
      case "TEACHER":
        return (
          <div className="px-4 sm:px-6">
            <ChartAreaInteractive />
          </div>
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
      <div className="w-full lg:w-[75%] flex flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 
           md:gap-6 md:py-6
          md:pr-0
          ">
            {renderRoleContent()}
          </div>
        </div>
      </div>

      <div className='flex flex-col md:px-5  md:py-6 gap-4 max-w-5xl
      sm:px-6
      px-[15px]
w-[-webkit-fill-available]
lg:w-[24.375em]
      '>
        {/* Calendar + Events */}
        <div className="border px-2.5 dark:bg-card py-2.5
        h-full
        rounded-lg">
          <div className="w-full max-w-[22rem] mx-auto h-full min-h-[20rem]">
            <Calendar
              className="rounded-md bg-white dark:bg-[#222225] border shadow-sm w-full"
              mode="single"
              selected={date}
              onSelect={setDate}
              captionLayout="dropdown"
            />
          </div>

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
                  <div className="flex flex-col flex-1 gap-1.5">
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
        <div className="border px-2.5 dark:bg-card py-2.5 rounded-lg">
          <div className="w-full py-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold dark:text-white text-gray-800">Announcement</h2>
              <button className="text-xs dark:text-white text-gray-500 hover:text-gray-800">View</button>
            </div>
            <EventList events={events} />
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
