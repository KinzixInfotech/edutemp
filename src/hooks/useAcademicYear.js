"use client";

import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Hook that provides both Active and Running academic years
 * 
 * @returns {Object} Academic year context
 * - activeYear: Admin-selected year (isActive: true) - used for configuration
 * - runningYear: Date-based year (startDate <= today <= endDate) - used for operations
 * - previousYear: The year before the active year (for cloning)
 * - isPreStart: Active year hasn't started yet
 * - isConfigMode: Active year is being prepared before it starts
 * - canOperate: Daily operations are possible (running year exists and matches active or activeYear started)
 * - yearsDiffer: Active and Running years are different
 */
export function useAcademicYear() {
    const { fullUser } = useAuth();

    const { data: years = [], isLoading } = useQuery({
        queryKey: ["academic-years-context", fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const result = useMemo(() => {
        const now = new Date();

        // Active Year = Admin-selected (isActive: true)
        const activeYear = years.find(y => y.isActive) || null;

        // Running Year = Date-based (startDate <= today <= endDate)
        const runningYear = years.find(y => {
            const start = new Date(y.startDate);
            const end = new Date(y.endDate);
            return start <= now && now <= end;
        }) || null;

        // Previous year = year before active year (for cloning)
        // Sort by startDate descending and find the one just before active
        const sortedYears = [...years].sort((a, b) =>
            new Date(b.startDate) - new Date(a.startDate)
        );
        const activeIndex = sortedYears.findIndex(y => y.id === activeYear?.id);
        const previousYear = activeIndex >= 0 && activeIndex < sortedYears.length - 1
            ? sortedYears[activeIndex + 1]
            : null;

        // Status flags
        const isPreStart = activeYear && new Date(activeYear.startDate) > now;
        const isConfigMode = isPreStart; // Alias for clarity
        const yearsDiffer = activeYear?.id !== runningYear?.id;

        // Can perform daily operations?
        // Yes if: running year exists AND (activeYear has started OR activeYear matches runningYear)
        const canOperate = runningYear && (!isPreStart || activeYear?.id === runningYear?.id);

        return {
            activeYear,
            runningYear,
            previousYear,
            allYears: years,
            isLoading,
            isPreStart,
            isConfigMode,
            canOperate,
            yearsDiffer,
        };
    }, [years, isLoading]);

    return result;
}

/**
 * Get the appropriate year for a given operation type
 * 
 * @param {'config' | 'operation'} type - Type of action
 * @param {Object} context - Result from useAcademicYear()
 * @returns {Object|null} The appropriate academic year
 */
export function getYearForAction(type, context) {
    if (type === 'config') {
        // Configuration uses Active year
        return context.activeYear;
    } else if (type === 'operation') {
        // Daily operations use Running year
        return context.runningYear;
    }
    return context.activeYear; // Default to active
}

/**
 * Format date for display
 */
export function formatAcademicDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
