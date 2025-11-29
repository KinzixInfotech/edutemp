"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import StaffList from "@/components/schools/StaffList";

export default function NonTeachingStaffPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchNonTeachers = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/schools/non-teaching-staff/${schoolId}`);
            const json = await res.json();
            const data = json?.data || [];
            setStaff(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch staff", err);
            setStaff([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNonTeachers();
    }, [schoolId]);

    const designations = [
        "Admin",
        "Clerk",
        "Accountant",
        "Librarian",
        "Lab Assistant",
        "Peon",
        "Security Guard",
        "Driver",
        "Cleaner"
    ];

    return (
        <StaffList
            title="Non-Teaching Staff"
            data={staff}
            loading={loading}
            onRefresh={fetchNonTeachers}
            addNewLink={`/dashboard/schools/${schoolId}/profiles/staff/new`}
            filterOptions={designations}
            type="NON_TEACHING"
        />
    );
}
