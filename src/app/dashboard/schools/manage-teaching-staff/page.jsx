"use client";
export const dynamic = "force-dynamic";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import StaffList from "@/components/schools/StaffList";

export default function TeacherListPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const { data: teachers = [], isLoading, refetch } = useQuery({
        queryKey: ["teachers", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/teaching-staff/${schoolId}`);
            return res.data.data || [];
        },
        enabled: !!schoolId,
    });

    const subjects = ["Math", "Science", "English", "History", "Physics", "Chemistry", "Biology", "Computer Science"];

    return (
        <StaffList
            title="Teaching Staff"
            data={teachers}
            loading={isLoading}
            onRefresh={refetch}
            addNewLink={`/dashboard/schools/${schoolId}/profiles/teacher/new`}
            filterOptions={subjects}
            type="TEACHING"
        />
    );
}
