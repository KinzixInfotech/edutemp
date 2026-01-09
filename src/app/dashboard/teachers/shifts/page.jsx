"use client";

import React from "react";
import ShiftManager from "@/components/teachers/ShiftManager";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ArrowRight, Calendar, Users } from "lucide-react";

export default function TeacherShiftsPage() {
    return (
        <div className="space-y-6 p-10 pb-16 block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Daily Schedule & Substitutes</h2>
                <p className="text-muted-foreground">
                    View daily schedule from timetable and assign substitutes when teachers are absent.
                </p>
            </div>

            {/* Hierarchy Explainer */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">Timetable</span>
                    <span>(weekly)</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">Daily Schedule</span>
                    <span>(auto-generated)</span>
                </div>
                <ArrowRight className="h-4 w-4" />
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-foreground">Substitutes</span>
                    <span>(overrides only)</span>
                </div>
            </div>

            <Separator className="my-6" />
            <div className="flex-1 lg:max-w-7xl">
                <ShiftManager />
            </div>
        </div>
    );
}
