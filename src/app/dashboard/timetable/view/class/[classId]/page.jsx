"use client";

import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Loader2, Printer, ArrowLeft, Calendar, BookOpen, Users,
    GraduationCap, Clock, LayoutGrid, ChevronDown,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const DAYS_MAP = {
    1: "Monday", 2: "Tuesday", 3: "Wednesday",
    4: "Thursday", 5: "Friday", 6: "Saturday",
};

const SUBJECT_COLORS = [
    { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", accent: "bg-blue-500", printBg: "#eff6ff" },
    { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", accent: "bg-emerald-500", printBg: "#ecfdf5" },
    { bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", accent: "bg-violet-500", printBg: "#f5f3ff" },
    { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", accent: "bg-amber-500", printBg: "#fffbeb" },
    { bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", accent: "bg-rose-500", printBg: "#fff1f2" },
    { bg: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", accent: "bg-cyan-500", printBg: "#ecfeff" },
    { bg: "bg-pink-50 dark:bg-pink-950/40", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", accent: "bg-pink-500", printBg: "#fdf2f8" },
    { bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", accent: "bg-teal-500", printBg: "#f0fdfa" },
    { bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", accent: "bg-orange-500", printBg: "#fff7ed" },
    { bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", accent: "bg-indigo-500", printBg: "#eef2ff" },
];

function displayClassName(name) {
    if (!name) return "";
    const n = name.replace(/^CLASS[_\s]*/i, "").trim();
    const map = { NURSERY: "Nursery", LKG: "LKG", UKG: "UKG", PREP: "Prep", "PRE-NURSERY": "Pre-Nursery" };
    if (map[n.toUpperCase()]) return map[n.toUpperCase()];
    const num = parseInt(n);
    if (!isNaN(num)) return `Class ${num}`;
    return n;
}

export default function ClassTimetableViewPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const printRef = useRef(null);
    const classId = params.classId;
    const sectionId = searchParams.get("sectionId");

    // Fetch timetable data (includes class/section info from updated API)
    const { data: timetableData, isLoading } = useQuery({
        queryKey: ["class-timetable-view", classId, sectionId],
        queryFn: async () => {
            const url = `/api/schools/${fullUser.schoolId}/timetable/view/class/${classId}${sectionId ? `?sectionId=${sectionId}` : ""}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch timetable");
            return res.json();
        },
        enabled: !!fullUser?.schoolId && !!classId,
    });

    // Fallback: fetch class info separately if API doesn't return className yet (cache)
    const { data: classInfo } = useQuery({
        queryKey: ["class-info-fallback", fullUser?.schoolId, classId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${fullUser.schoolId}/classes`);
            if (!res.ok) return null;
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data?.data || [];
            return arr.find(c => c.id?.toString() === classId?.toString());
        },
        enabled: !!fullUser?.schoolId && !!classId && !timetableData?.className,
    });

    // Resolve class name and section name
    const resolvedClassName = useMemo(() => {
        if (timetableData?.className) return displayClassName(timetableData.className);
        if (classInfo?.className) return displayClassName(classInfo.className);
        return `Class ${classId}`;
    }, [timetableData?.className, classInfo?.className, classId]);

    const resolvedSectionName = useMemo(() => {
        if (timetableData?.sectionName) return timetableData.sectionName;
        if (sectionId && classInfo?.sections) {
            const sec = classInfo.sections.find(s => s.id?.toString() === sectionId);
            return sec?.name || null;
        }
        return null;
    }, [timetableData?.sectionName, sectionId, classInfo]);

    const allSections = timetableData?.sections || classInfo?.sections || [];

    // Build subject → color mapping
    const subjectColorMap = useMemo(() => {
        if (!timetableData?.timetable) return {};
        const map = {};
        let idx = 0;
        Object.values(timetableData.timetable).forEach(daySlots => {
            Object.values(daySlots).forEach(entry => {
                const name = entry.subject?.subjectName;
                if (name && !(name in map)) {
                    map[name] = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                    idx++;
                }
            });
        });
        return map;
    }, [timetableData]);

    // Stats
    const stats = useMemo(() => {
        if (!timetableData?.timetable) return { totalPeriods: 0, uniqueSubjects: 0, uniqueTeachers: 0, daysActive: 0 };
        const subjects = new Set();
        const teachers = new Set();
        const activeDays = new Set();
        let total = 0;
        Object.entries(timetableData.timetable).forEach(([day, slots]) => {
            Object.values(slots).forEach(entry => {
                total++;
                activeDays.add(day);
                if (entry.subject?.subjectName) subjects.add(entry.subject.subjectName);
                if (entry.teacher?.name) teachers.add(entry.teacher.name);
            });
        });
        return { totalPeriods: total, uniqueSubjects: subjects.size, uniqueTeachers: teachers.size, daysActive: activeDays.size };
    }, [timetableData]);

    // ─── Print ─────────────────────────────────────────────────────
    const handlePrint = () => {
        if (!timetableData?.timetable || !timetableData?.timeSlots) return;

        const schoolName = timetableData?.schoolName || fullUser?.schoolName || "School";
        const sectionLabel = resolvedSectionName ? ` — Section ${resolvedSectionName}` : "";
        const title = `${resolvedClassName}${sectionLabel}`;
        const { timeSlots, timetable } = timetableData;

        // Build print table HTML manually
        let tableHtml = `<table><thead><tr><th class="day-col">Day</th>`;
        timeSlots.forEach(slot => {
            const isBreak = slot.isBreak;
            tableHtml += `<th${isBreak ? ' class="break-col"' : ''}>${isBreak ? '🍴 ' : ''}${slot.label}<br/><span class="time-sub">${slot.startTime} – ${slot.endTime}</span></th>`;
        });
        tableHtml += `</tr></thead><tbody>`;

        [1, 2, 3, 4, 5, 6].forEach(day => {
            const dayEntries = timetable[day] || {};
            const hasEntries = Object.keys(dayEntries).length > 0;
            tableHtml += `<tr${!hasEntries ? ' class="empty-row"' : ''}>`;
            tableHtml += `<td class="day-cell">${DAYS_MAP[day]}</td>`;
            timeSlots.forEach(slot => {
                if (slot.isBreak) {
                    tableHtml += `<td class="break-cell">Break</td>`;
                    return;
                }
                const entry = dayEntries[slot.id];
                if (entry) {
                    const color = subjectColorMap[entry.subject?.subjectName];
                    tableHtml += `<td style="background:${color?.printBg || '#f9fafb'}"><div class="subject">${entry.subject?.subjectName || ''}</div><div class="teacher">${entry.teacher?.name || ''}</div>${entry.roomNumber ? `<div class="room">📍 ${entry.roomNumber}</div>` : ''}${entry.section?.name && !sectionId ? `<div class="section">Sec ${entry.section.name}</div>` : ''}</td>`;
                } else {
                    tableHtml += `<td class="empty-cell">—</td>`;
                }
            });
            tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table>`;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`<!DOCTYPE html><html><head>
            <title>Timetable - ${title}</title>
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
                .header{text-align:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #e5e7eb}
                .header h1{font-size:20px;font-weight:700;margin-bottom:2px}
                .header h2{font-size:15px;font-weight:600;color:#374151}
                .header p{font-size:11px;color:#9ca3af;margin-top:3px}
                table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
                th{background:#f3f4f6;padding:8px 6px;border:1px solid #d1d5db;font-weight:600;text-align:center;font-size:11px}
                td{padding:7px 6px;border:1px solid #d1d5db;vertical-align:top;min-width:90px}
                .day-col{width:75px}
                .day-cell{background:#f9fafb;font-weight:600;text-align:center;width:75px}
                .time-sub{font-size:9px;color:#9ca3af;font-weight:400}
                .subject{font-weight:600;font-size:11px;color:#1e3a5f}
                .teacher{font-size:10px;color:#6b7280;margin-top:1px}
                .room{font-size:9px;color:#9ca3af;margin-top:1px}
                .section{font-size:9px;color:#6366f1;margin-top:1px;font-weight:500}
                .empty-cell{color:#d1d5db;text-align:center}
                .empty-row{opacity:0.5}
                .break-col{background:#fef3c7!important}
                .break-cell{background:#fffbeb;text-align:center;font-size:10px;color:#b45309;font-style:italic}
                .footer{text-align:center;margin-top:16px;font-size:9px;color:#d1d5db}
                @media print{body{padding:12px}}
            </style>
        </head><body>
            <div class="header">
                <h1>${schoolName}</h1>
                <h2>Timetable — ${title}</h2>
                <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            ${tableHtml}
            <div class="footer">Generated by Edubreezy</div>
            <script>window.onload=function(){window.print()}</script>
        </body></html>`);
        printWindow.document.close();
    };

    const handleSectionSwitch = (newSectionId) => {
        const url = `/dashboard/timetable/view/class/${classId}${newSectionId ? `?sectionId=${newSectionId}` : ""}`;
        router.push(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!timetableData) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-semibold mb-2">No timetable data available</h3>
                        <p className="text-sm text-muted-foreground mb-4">Create a timetable for this class first</p>
                        <Link href="/dashboard/timetable/create">
                            <Button>Create Timetable</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { timeSlots, timetable } = timetableData;

    return (
        <div className="p-4 sm:p-6 space-y-4">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/timetable/manage">
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                            <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
                            <span>{resolvedClassName}</span>
                            {resolvedSectionName && (
                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-semibold">
                                    Section {resolvedSectionName}
                                </Badge>
                            )}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Weekly timetable schedule
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {allSections?.length > 1 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                                    {resolvedSectionName ? `Section ${resolvedSectionName}` : "All Sections"}
                                    <ChevronDown className="ml-1.5 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSectionSwitch(null)}>
                                    All Sections
                                </DropdownMenuItem>
                                {allSections.map(sec => (
                                    <DropdownMenuItem key={sec.id} onClick={() => handleSectionSwitch(sec.id)}>
                                        Section {sec.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Link href={`/dashboard/timetable/create?classId=${classId}${sectionId ? `&sectionId=${sectionId}` : ""}`}>
                        <Button variant="outline" size="sm">
                            <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                        </Button>
                    </Link>
                    <Button size="sm" onClick={handlePrint} className="dark:text-white">
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        Print
                    </Button>
                </div>
            </div>

            <Separator />

            {/* ─── Quick Stats ─────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <Card className="border-l-[3px] border-l-blue-500">
                    <CardContent className="py-3 px-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Periods</p>
                                <p className="text-lg font-bold">{stats.totalPeriods}</p>
                            </div>
                            <LayoutGrid className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-[3px] border-l-emerald-500">
                    <CardContent className="py-3 px-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Subjects</p>
                                <p className="text-lg font-bold">{stats.uniqueSubjects}</p>
                            </div>
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-[3px] border-l-violet-500">
                    <CardContent className="py-3 px-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Teachers</p>
                                <p className="text-lg font-bold">{stats.uniqueTeachers}</p>
                            </div>
                            <Users className="h-4 w-4 text-violet-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-[3px] border-l-amber-500">
                    <CardContent className="py-3 px-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Days</p>
                                <p className="text-lg font-bold">{stats.daysActive}</p>
                            </div>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Timetable Grid ──────────────────────────────────── */}
            <Card className="overflow-hidden">
                <CardContent className="p-0" ref={printRef}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="border border-border bg-muted/80 px-3 py-2.5 text-left font-semibold text-xs w-[80px] sticky left-0 z-[5]">
                                        Day
                                    </th>
                                    {timeSlots.map((slot) => (
                                        <th key={slot.id} className={`border border-border px-2 py-2.5 text-center min-w-[120px] ${slot.isBreak ? "bg-amber-50/60 dark:bg-amber-950/20" : "bg-muted/80"}`}>
                                            <div className="font-semibold text-xs">
                                                {slot.isBreak ? "🍴 " : ""}{slot.label}
                                            </div>
                                            <div className="text-[10px] font-normal text-muted-foreground">
                                                {slot.startTime} – {slot.endTime}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5, 6].map((day) => {
                                    const hasEntries = Object.keys(timetable[day] || {}).length > 0;
                                    return (
                                        <tr key={day} className={!hasEntries ? "opacity-40" : ""}>
                                            <td className="border border-border px-3 py-2.5 font-semibold text-xs bg-muted/50 sticky left-0 z-[4]">
                                                {DAYS_MAP[day]}
                                            </td>
                                            {timeSlots.map((slot) => {
                                                if (slot.isBreak) {
                                                    return (
                                                        <td key={slot.id} className="border border-border px-2 py-2 bg-amber-50/30 dark:bg-amber-950/10">
                                                            <div className="flex items-center justify-center">
                                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">Break</span>
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                const entry = timetable[day]?.[slot.id];
                                                const color = entry?.subject?.subjectName
                                                    ? subjectColorMap[entry.subject.subjectName]
                                                    : null;

                                                return (
                                                    <td key={slot.id} className="border border-border p-1">
                                                        {entry ? (
                                                            <div className={`rounded-md px-2 py-1.5 border ${color?.bg || ""} ${color?.border || "border-transparent"}`}>
                                                                <div className="flex items-start gap-1.5">
                                                                    <div className={`w-0.5 rounded-full shrink-0 self-stretch ${color?.accent || "bg-gray-300"}`} />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`font-semibold text-[11px] leading-tight truncate ${color?.text || ""}`}>
                                                                            {entry.subject?.subjectName}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                                            {entry.teacher?.name}
                                                                        </p>
                                                                        {entry.roomNumber && (
                                                                            <p className="text-[9px] text-muted-foreground">📍 {entry.roomNumber}</p>
                                                                        )}
                                                                        {entry.section?.name && !sectionId && (
                                                                            <Badge variant="outline" className="text-[8px] mt-0.5 h-3.5 px-1 py-0">
                                                                                Sec {entry.section.name}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center min-h-[36px]">
                                                                <span className="text-muted-foreground/20">—</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Subject Legend ───────────────────────────────────── */}
            {Object.keys(subjectColorMap).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(subjectColorMap).map(([subject, color]) => (
                        <div
                            key={subject}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${color.bg} ${color.border}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${color.accent}`} />
                            <span className={`text-[11px] font-medium ${color.text}`}>{subject}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
