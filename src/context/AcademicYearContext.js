'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';

const AcademicYearContext = createContext();

export function AcademicYearProvider({ children }) {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const isAdmin = fullUser?.role?.name === 'ADMIN';

    // Fetch all academic years
    const { data: allYears = [], isLoading } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            const data = await res.json();
            return Array.isArray(data) ? data : (data.academicYears || []);
        },
        enabled: !!schoolId && isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    // The DB-active year (source of truth for writes)
    const activeYear = useMemo(() => allYears.find(y => y.isActive), [allYears]);

    // Only show setup-complete years in the switcher
    const switchableYears = useMemo(
        () => allYears.filter(y => y.setupComplete === true || y.isActive),
        [allYears]
    );

    // Selected year for "viewing" (client-side only)
    const [selectedYearId, setSelectedYearId] = useState(null);

    // On mount or when activeYear changes, default to DB-active year
    useEffect(() => {
        if (!activeYear) return;

        // Check localStorage for a saved selection
        const saved = localStorage.getItem(`viewedYear_${schoolId}`);
        if (saved && allYears.find(y => y.id === saved && (y.setupComplete || y.isActive))) {
            setSelectedYearId(saved);
        } else {
            setSelectedYearId(activeYear.id);
        }
    }, [activeYear?.id, schoolId, allYears]);

    // The year currently being viewed
    const selectedYear = useMemo(
        () => allYears.find(y => y.id === selectedYearId) || activeYear,
        [allYears, selectedYearId, activeYear]
    );

    const isViewingPastYear = selectedYear && activeYear && selectedYear.id !== activeYear.id;

    // Switch year — client-side only, no DB mutation!
    const switchYear = useCallback((yearId) => {
        setSelectedYearId(yearId);
        if (schoolId) {
            localStorage.setItem(`viewedYear_${schoolId}`, yearId);
        }
    }, [schoolId]);

    // Reset to active year
    const resetToActiveYear = useCallback(() => {
        if (activeYear) {
            setSelectedYearId(activeYear.id);
            if (schoolId) {
                localStorage.removeItem(`viewedYear_${schoolId}`);
            }
        }
    }, [activeYear, schoolId]);

    const value = useMemo(() => ({
        allYears,
        activeYear,        // DB-active (for writes)
        selectedYear,      // Currently viewed (for reads/display)
        switchableYears,   // Only setup-complete years
        isViewingPastYear,
        isLoading,
        switchYear,
        resetToActiveYear,
    }), [allYears, activeYear, selectedYear, switchableYears, isViewingPastYear, isLoading, switchYear, resetToActiveYear]);

    return (
        <AcademicYearContext.Provider value={value}>
            {children}
        </AcademicYearContext.Provider>
    );
}

export const useAcademicYear = () => useContext(AcademicYearContext);
