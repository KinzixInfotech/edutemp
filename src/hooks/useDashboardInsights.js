/**
 * Dashboard Insights Hook
 * Combines AI insights with live rule-based hints for a dynamic experience
 * 
 * This hook provides:
 * 1. AI-generated insights (cached, 3x/day)
 * 2. Live hints (free, updated every page load)
 * 3. Time-aware formatting
 */

import { useQuery } from '@tanstack/react-query';
import { useDashboardContext } from './useDashboardContext';
import { useAiInsights } from './useAiInsights';
import { useMemo } from 'react';
import { getTopHints } from '@/lib/ai/liveHintsEngine';
import { formatSummaryByTime, getGreeting, adjustInsightTone } from '@/lib/ai/timeAwareFormatter';

/**
 * Fetch dashboard stats from API (for live hints)
 */
async function fetchDashboardStats(schoolId) {
    const response = await fetch(`/api/dashboard/daily-stats?schoolId=${schoolId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
    }
    return response.json();
}

/**
 * Custom hook that combines AI insights with live hints
 * @param {string} schoolId - School UUID
 * @returns {Object} Combined insights data
 */
export function useDashboardInsights(schoolId) {
    // Get day context
    const {
        data: context,
        isLoading: contextLoading,
    } = useDashboardContext(schoolId);

    // Get AI insights (cached)
    const {
        data: aiInsightsData,
        isLoading: aiLoading,
    } = useAiInsights(schoolId, context?.aiAllowed);

    // Get fresh stats for live hints (every page load)
    const {
        data: stats,
        isLoading: statsLoading,
    } = useQuery({
        queryKey: ['dashboardStats', schoolId],
        queryFn: () => fetchDashboardStats(schoolId),
        enabled: !!schoolId,
        staleTime: 60 * 1000, // 1 minute - refresh more often for live hints
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true, // Refresh when user comes back
    });

    // Combine everything
    const combinedInsights = useMemo(() => {
        const greeting = getGreeting();
        const schoolConfig = stats?.schoolConfig || {};

        // Generate live hints from current stats
        const liveHints = stats ? getTopHints(stats, schoolConfig, 3) : [];

        // If AI allowed and has AI insights, combine with live hints
        if (context?.aiAllowed && aiInsightsData) {
            // Use AI summary but adjust tone based on time
            let summary = aiInsightsData.summary;
            if (summary) {
                summary = adjustInsightTone(summary, schoolConfig);
            } else if (stats) {
                // Fallback: generate summary from stats
                summary = formatSummaryByTime(stats, schoolConfig);
            }

            // Combine AI insights with live hints
            // AI insights take priority, live hints fill gaps
            const aiInsights = aiInsightsData.insights || [];
            const combinedCards = [];

            // First, add AI insights
            aiInsights.forEach((insight, index) => {
                combinedCards.push({
                    source: 'AI',
                    text: insight,
                    priority: index,
                });
            });

            // Then, add live hints that don't duplicate
            liveHints.forEach((hint, index) => {
                // Avoid duplicating similar content
                const isDuplicate = combinedCards.some(card =>
                    card.text.toLowerCase().includes(hint.category.toLowerCase())
                );
                if (!isDuplicate && combinedCards.length < 3) {
                    combinedCards.push({
                        source: 'LIVE',
                        category: hint.category,
                        title: hint.title,
                        text: hint.hint,
                        priority: 10 + index,
                    });
                }
            });

            return {
                summary,
                insights: combinedCards.slice(0, 3),
                aiUsed: true,
                cached: aiInsightsData.cached,
                dayType: context?.dayType,
                greeting,
                liveHintsCount: liveHints.length,
            };
        }

        // AI not allowed or no AI data - use live hints only
        const summary = stats ? formatSummaryByTime(stats, schoolConfig) : null;

        return {
            summary,
            insights: liveHints.map((hint, index) => ({
                source: 'LIVE',
                category: hint.category,
                title: hint.title,
                text: hint.hint,
                priority: index,
            })),
            aiUsed: false,
            cached: false,
            dayType: context?.dayType,
            greeting,
            liveHintsCount: liveHints.length,
        };
    }, [context, aiInsightsData, stats]);

    return {
        data: combinedInsights,
        isLoading: contextLoading || (context?.aiAllowed && aiLoading) || statsLoading,
        context,
        stats,
    };
}

export default useDashboardInsights;
