/**
 * AI Insights Hook
 * TanStack Query hook for /api/ai/dashboard-insights
 */

import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

/**
 * Fetch AI insights for a school
 */
async function fetchAiInsights(schoolId) {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/ai/dashboard-insights?schoolId=${schoolId}`, {
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch AI insights');
    }

    return response.json();
}

/**
 * Custom hook to get AI insights
 * @param {string} schoolId - School UUID
 * @param {boolean} aiAllowed - Whether AI is allowed today
 * @returns {Object} Query result with insights data
 */
export function useAiInsights(schoolId, aiAllowed = true) {
    return useQuery({
        queryKey: ['aiInsights', schoolId],
        queryFn: () => fetchAiInsights(schoolId),
        enabled: !!schoolId && aiAllowed,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        retry: 1, // Only retry once
    });
}

export default useAiInsights;
