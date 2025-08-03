'use client';

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    // Tuesday: ["Number Work", "KYS", "Computer", "Break", "Sports", "Language Skill", "Hindi", "Art"],
    // Wednesday: ["Reading", "Number Work", "Music", "Break", "KYS", "Language Skill", "Hindi", "Computer"],
    // Thursday: ["Language Skill", "Sports", "Hindi", "Break", "KYS", "Jazz", "Yoga", "Number Work"],
    // Friday: ["Creative Writing", "KYS", "Hindi", "Break", "Number Work", "Hula Hoop", "Language Skill", "Art"],
    // Saturday: ["KYS", "Reading", "Hindi", "Break", "Language Skill", "Number Work", "Creative Writing", "Library"],
  },
};

const Timetable = ({ className }) => {
  const timetable = timetableData[className];

  if (!timetable) return <p>No timetable data for {className}</p>;

  return (
    <div id="timetable" className="overflow-x-auto shadow-lg p-4 bg-muted rounded-lg border-[#0768f4] border-[3px]">
      <Table className="min-w-[800px] text-center text-sm border border-black dark:border-white">
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
                  className={`border border-black dark:text-black dark:border-white px-2 py-1 ${subjectColors[subject.name] || "bg-white"}`}
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
    </div>
  );
};

export default Timetable;
