"use client";

import BigCalendar from "@/components/big-calendar";
import { useState } from "react";

const BigCalendarContainer = () => {
  const [viewMode, setViewMode] = useState("work_week"); // or "day"

  const subjects = {
    Sunday: ["", "", "", "", "", "", ""],
    Monday: ["Hindi", "Language Skill", "Jazz", "Taekwondo", "Skating", "NU.Work", "GK"],
    Tuesday: ["Number Work", "KYS", "Computer", "Sports", "Language Skill", "Hindi", "Art"],
    Wednesday: ["Reading", "Number Work", "Music", "KYS", "Language Skill", "Hindi", "Computer"],
    Thursday: ["Language Skill", "Sports", "Hindi", "KYS", "Jazz", "Yoga", "Number Work"],
    Friday: ["Creative Writing", "KYS", "Hindi", "Number Work", "Hula Hoop", "Language Skill", "Art"],
    Saturday: ["KYS", "Reading", "Hindi", "Language Skill", "Number Work", "Creative Writing", "Library"]
  };

  const colors = {
    Hindi: "#e53935",
    "Language Skill": "#8e24aa",
    Jazz: "#3949ab",
    Taekwondo: "#1e88e5",
    Skating: "#039be5",
    "NU.Work": "#00897b",
    GK: "#43a047",
    "Number Work": "#f4511e",
    KYS: "#6d4c41",
    Computer: "#00acc1",
    Sports: "#5e35b1",
    Reading: "#3949ab",
    Music: "#ffb300",
    Yoga: "#7cb342",
    Art: "#fb8c00",
    "Creative Writing": "#757575",
    "Hula Hoop": "#00838f",
    Library: "#546e7a",
  };

  const timeSlots = [
    [8, 30, 9, 10],
    [9, 10, 9, 50],
    [9, 50, 10, 30],
    [10, 50, 11, 30],
    [11, 30, 12, 5],
    [12, 5, 12, 40],
    [12, 40, 13, 15],
  ];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay(); // Sunday as start
  const events = [];

  days.forEach((day, dayIndex) => {
    const baseDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek + dayIndex);

    subjects[day].forEach((subject, periodIndex) => {
      if (!subject) return;

      const [sh, sm, eh, em] = timeSlots[periodIndex];
      const start = new Date(baseDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(baseDate);
      end.setHours(eh, em, 0, 0);

      events.push({
        title: `${periodIndex + 1} - ${subject}`,
        start,
        end,
        color: colors[subject] || "#90a4ae",
      });
    });
  });

  return (
    <div className="h-[90vh]">
      <div className="flex items-center justify-end mb-2 pr-4">
        <button
          onClick={() => setViewMode(viewMode === "work_week" ? "day" : "work_week")}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Toggle View ({viewMode === "work_week" ? "Week" : "Day"})
        </button>
      </div>
      <BigCalendar data={events} viewMode={viewMode} />
    </div>
  );
};

export default BigCalendarContainer;
