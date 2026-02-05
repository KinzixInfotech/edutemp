"use client";

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getQueryKeysForRoute } from '@/lib/route-prefetch-map';

/**
 * Custom hook for Google-like navigation with prefetching
 * 
 * Features:
 * - Prefetches queries when hovering over links
 * - Optionally delays navigation until data is ready (with timeout)
 * - Falls back to normal navigation if prefetch takes too long
 * 
 * Usage:
 * const { prefetchOnHover, navigateWithPrefetch } = usePrefetchNavigation();
 * 
 * <Link 
 *   href="/dashboard/students"
 *   onMouseEnter={() => prefetchOnHover('/dashboard/students')}
 * >
 */
export function usePrefetchNavigation(options = {}) {
    const {
        // Max time to wait for prefetch before navigating anyway
        maxWaitTime = 2000,
        // Whether to delay navigation until prefetch completes
        waitForPrefetch = false,
    } = options;

    const router = useRouter();
    const queryClient = useQueryClient();
    const prefetchingRef = useRef(new Set());
    const prefetchPromisesRef = useRef(new Map());

    /**
     * Prefetch queries for a route when hovering
     * This is called onMouseEnter for sidebar links
     */
    const prefetchOnHover = useCallback((pathname) => {
        // Don't prefetch same route multiple times
        if (prefetchingRef.current.has(pathname)) {
            return;
        }

        prefetchingRef.current.add(pathname);

        const queryKeys = getQueryKeysForRoute(pathname);

        if (queryKeys.length === 0) {
            // No queries to prefetch, just let Next.js prefetch the page
            router.prefetch(pathname);
            return;
        }

        // Start prefetching all queries for this route
        const prefetchPromises = queryKeys.map(queryKey => {
            // Check if data is already fresh in cache
            const existingData = queryClient.getQueryData(queryKey);
            const queryState = queryClient.getQueryState(queryKey);

            if (existingData && queryState && !queryState.isStale) {
                // Data is fresh, no need to prefetch
                return Promise.resolve();
            }

            // Trigger a background refetch
            return queryClient.prefetchQuery({
                queryKey,
                staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
            }).catch(() => {
                // Silently ignore prefetch errors
            });
        });

        // Store promises for later use if waitForPrefetch is enabled
        prefetchPromisesRef.current.set(pathname, Promise.all(prefetchPromises));

        // Also prefetch the page itself
        router.prefetch(pathname);

        // Clean up after 30 seconds
        setTimeout(() => {
            prefetchingRef.current.delete(pathname);
            prefetchPromisesRef.current.delete(pathname);
        }, 30000);
    }, [queryClient, router]);

    /**
     * Navigate with optional wait for prefetch
     * Use this for programmatic navigation when you want to ensure data is loaded
     */
    const navigateWithPrefetch = useCallback(async (pathname, shouldWait = waitForPrefetch) => {
        if (!shouldWait) {
            router.push(pathname);
            return;
        }

        // Start prefetch if not already started
        if (!prefetchPromisesRef.current.has(pathname)) {
            prefetchOnHover(pathname);
        }

        const prefetchPromise = prefetchPromisesRef.current.get(pathname);

        if (!prefetchPromise) {
            router.push(pathname);
            return;
        }

        // Race between prefetch completing and timeout
        const timeoutPromise = new Promise(resolve =>
            setTimeout(() => resolve('timeout'), maxWaitTime)
        );

        try {
            await Promise.race([prefetchPromise, timeoutPromise]);
        } catch {
            // Ignore errors, just navigate
        }

        router.push(pathname);
    }, [router, prefetchOnHover, maxWaitTime, waitForPrefetch]);

    /**
     * Clear prefetch cache for a route
     * Useful when you know data has changed
     */
    const clearPrefetch = useCallback((pathname) => {
        prefetchingRef.current.delete(pathname);
        prefetchPromisesRef.current.delete(pathname);
    }, []);

    return {
        prefetchOnHover,
        navigateWithPrefetch,
        clearPrefetch,
    };
}

export default usePrefetchNavigation;
