/**
 * Dashboard Context Hook
 * TanStack Query hook for /api/dashboard/context
 */

import { useQuery } from '@tanstack/react-query';

/**
 * Fetch dashboard context for a school
 */
async function fetchDashboardContext(schoolId) {
    const response = await fetch(`/api/dashboard/context?schoolId=${schoolId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch dashboard context');
    }
    return response.json();
}

/**
 * Custom hook to get dashboard context
 * @param {string} schoolId - School UUID
 * @returns {Object} Query result with context data
 */
export function useDashboardContext(schoolId) {
    return useQuery({
        queryKey: ['dashboardContext', schoolId],
        queryFn: () => fetchDashboardContext(schoolId),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
    });
}

export default useDashboardContext;
