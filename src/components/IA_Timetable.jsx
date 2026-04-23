'use client';
export const dynamic = 'force-dynamic';
;

import React, { useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from 'next/link';
const subjectColors = {
  Hindi: "bg-red-200",
  "Language Skill": "bg-blue-200",
  Jazz: "bg-yellow-200",
  Taekwondo: "bg-purple-200",
  Skating: "bg-indigo-200",
  "Skating/Horse Ridding": "bg-indigo-200",
  "NU.Work": "bg-pink-200",
  GK: "bg-green-200",
  "Number Work": "bg-orange-200",
  KYS: "bg-cyan-200",
  Computer: "bg-emerald-200",
  Reading: "bg-lime-200",
  Music: "bg-teal-200",
  Sports: "bg-rose-200",
  Yoga: "bg-violet-200",
  "Creative Writing": "bg-fuchsia-200",
  "Hula Hoop": "bg-amber-200",
  Library: "bg-sky-200",
  Break: "bg-gray-300 font-bold",
};

const periods = [
  { label: "1", time: "8:30-9:10" },
  { label: "2", time: "9:10-9:50" },
  { label: "3", time: "9:50-10:30" },
  { label: "Break", time: "10:30-10:50" },
  { label: "4", time: "10:50-11:30" },
  { label: "5", time: "11:30-12:05" },
  { label: "6", time: "12:05-12:40" },
  { label: "7", time: "12:40-1:15" },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const timetableData = {
  "Class 1A": {
    Monday: [
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
    Tuesday: [
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
    Wednesday: [
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
    Thursday: [
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
    Friday: [
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
    Saturday: [
      { name: "Language Skill", teacher: "Mr. Verma" },
      { name: "Break" },
      { name: "Taekwondo", teacher: "Coach Arun" },
      { name: "Hindi", teacher: "Mrs. Sharma" },
      { name: "Jazz", teacher: "Ms. Tanya" },
      { name: "Skating/Horse Ridding", teacher: "Mr. Singh" },
      { name: "NU.Work", teacher: "Ms. Reena" },
      { name: "GK", teacher: "Mr. Das" },
    ],
  },
};

const Timetable = ({ className }) => {
  const timetable = timetableData[className];

  if (!timetable) return <p>No timetable data for {className}</p>;
  const printRef = useRef(null);

  return (
    <>
      <style>{`
@media print {
    @page {
      size: landscape;
    }

    body * {
      visibility: hidden !important;
    }

    #print-area, #print-area * {
      visibility: visible !important;
    }

    #print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100vw !important;
      height: auto !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100vw;
      height: auto;
    }

    .print-hidden {
      display: none !important;
    }

    table {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .bg-red-200 { background-color: #fecaca !important; }
    .bg-blue-200 { background-color: #bfdbfe !important; }
    .bg-yellow-200 { background-color: #fef08a !important; }
    .bg-purple-200 { background-color: #e9d5ff !important; }
    .bg-indigo-200 { background-color: #c7d2fe !important; }
    .bg-pink-200 { background-color: #fbcfe8 !important; }
    .bg-green-200 { background-color: #bbf7d0 !important; }
    .bg-orange-200 { background-color: #fed7aa !important; }
    .bg-cyan-200 { background-color: #a5f3fc !important; }
    .bg-emerald-200 { background-color: #a7f3d0 !important; }
    .bg-lime-200 { background-color: #d9f99d !important; }
    .bg-teal-200 { background-color: #99f6e4 !important; }
    .bg-rose-200 { background-color: #fecdd3 !important; }
    .bg-violet-200 { background-color: #ddd6fe !important; }
    .bg-fuchsia-200 { background-color: #f5d0fe !important; }
    .bg-amber-200 { background-color: #fde68a !important; }
    .bg-sky-200 { background-color: #bae6fd !important; }
    .bg-gray-300 { background-color: #d1d5db !important; }
  }
      `}</style>
      <div className="print-hidden flex flex-row justify-between mb-4">
        <Select>
          <SelectTrigger className="w-[180px] bg-white  dark:text-white dark:bg-[#18181b]">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Button variant='outline' className='dark:bg-[#18181b]' onClick={() => window.print()}>Save in device</Button>
      </div>
      <div ref={printRef} id="print-area" className="w-full p-4 overflow-x-auto print:overflow-visible bg-muted rounded-lg">

        <Table className="w-full text-center text-sm border border-black">
          <TableHeader>
            <TableRow>
              <TableHead className="border border-black dark:border-white px-2 py-1" rowSpan={2}>Day</TableHead>
              {periods.map((p, idx) => (
                <TableHead key={idx} className="border border-black dark:border-white px-2 py-1">
                  {p.label}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {periods.map((p, idx) => (
                <TableHead key={idx} className="border border-black dark:border-white px-2 py-1">
                  {p.time}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day}>
                <TableCell className="border border-black dark:border-white font-semibold px-2 py-1">
                  {day}
                </TableCell>
                {(timetable[day] || []).map((subject, idx) => (
                  <TableCell
                    key={`${day}-${idx}`}
                    className={`border hover:scale-110 transition-all cursor-pointer border-black dark:text-black  px-2 py-1 ${subjectColors[subject.name] || "bg-white"}`}
                  >
                    <div className="font-medium">{subject.name}</div>
                    {subject.teacher && (
                      <div className="text-xs text-gray-700 dark:text-black italic">{subject.teacher}</div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}

          </TableBody>
        </Table>
        <div className="mt-1.5">
          <span className="mt-2.5 text-sm capitalize text-muted-foreground">
            Created At:
          </span>
        </div>
      </div>
      <div className="print-hidden flex flex-row justify-between mt-4">
        <Link href="/dashboard/create-time-table">
          <Button className='dark:text-white'>Create New Time Table</Button>
        </Link>
        <Button onClick={() => window.print()} className='dark:text-white'>Print</Button>
      </div>
    </>
  );
};

export default Timetable;
