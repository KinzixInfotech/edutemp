"use client";

import React from "react";
import ShiftManager from "@/components/teachers/ShiftManager";
import { Separator } from "@/components/ui/separator";

export default function TeacherShiftsPage() {
    return (
        <div className="space-y-6 p-10 pb-16 block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Teacher Shifts</h2>
                <p className="text-muted-foreground">
                    Manage daily teacher assignments and shifts.
                </p>
            </div>
            <Separator className="my-6" />
            <div className="flex-1 lg:max-w-7xl">
                <ShiftManager />
            </div>
        </div>
    );
}
