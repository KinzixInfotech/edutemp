"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Shared context for wizard/banner state
const OnboardingContext = createContext({
    // State
    showWizard: false,
    showBanner: false,
    onboardingData: null,
    isLoading: true,
    // Actions
    dismissWizard: () => { },
    resumeWizard: () => { },
    completeOnboarding: () => { },
    dismissBanner: () => { },
});

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }) {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    // Local UI state - this takes priority over API data
    const [uiState, setUiState] = useState(null); // null = use API, 'wizard' = show wizard, 'banner' = show banner, 'hidden' = show nothing
    const [bannerDismissed, setBannerDismissed] = useState(false); // Temporary dismiss for current session

    const schoolId = fullUser?.schoolId || fullUser?.school?.id;
    const isAdmin = fullUser?.role?.name === "ADMIN";

    // Fetch onboarding data - with reasonable staleTime to avoid constant refetching
    const { data: onboardingData, isLoading } = useQuery({
        queryKey: ["school-onboarding", schoolId],
        queryFn: async () => {
            if (!schoolId) return null;
            const res = await fetch(`/api/schools/onboarding?schoolId=${schoolId}`);
            if (!res.ok) throw new Error("Failed to fetch onboarding status");
            return res.json();
        },
        enabled: !!schoolId && isAdmin,
        staleTime: 60 * 1000, // 1 minute - don't refetch too often
        refetchOnWindowFocus: false, // Don't refetch on focus to avoid state resets
    });

    // Mutation to update onboarding status
    const updateMutation = useMutation({
        mutationFn: async ({ onboardingComplete, onboardingDismissed }) => {
            const res = await fetch("/api/schools/onboarding", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, onboardingComplete, onboardingDismissed }),
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            // After successful update, invalidate but don't reset UI state
            queryClient.invalidateQueries({ queryKey: ["school-onboarding", schoolId] });
        },
    });

    // Determine what to show based on UI state and API data
    const showWizard = (() => {
        if (!isAdmin || isLoading) return false;

        // UI state takes absolute priority
        if (uiState === 'wizard') return true;
        if (uiState === 'banner' || uiState === 'hidden') return false;

        // Use API data only if no UI override
        return onboardingData?.shouldShowWizard === true;
    })();

    const showBanner = (() => {
        if (!isAdmin || isLoading || bannerDismissed) return false;

        // UI state takes absolute priority
        if (uiState === 'banner') return true;
        if (uiState === 'wizard' || uiState === 'hidden') return false;

        // Use API data only if no UI override
        return onboardingData?.shouldShowBanner === true;
    })();

    // Actions
    const dismissWizard = useCallback(() => {
        // Immediately show banner
        setUiState('banner');

        // Save to API in background
        updateMutation.mutate({ onboardingDismissed: true });
    }, [updateMutation]);

    const resumeWizard = useCallback(() => {
        // Immediately show wizard
        setUiState('wizard');
        setBannerDismissed(false);

        // Save to API in background
        updateMutation.mutate({ onboardingDismissed: false });
    }, [updateMutation]);

    const completeOnboarding = useCallback(() => {
        // Hide everything
        setUiState('hidden');

        // Save to API
        updateMutation.mutate({ onboardingComplete: true });
    }, [updateMutation]);

    const dismissBanner = useCallback(() => {
        // Just temporarily hide banner for this session
        setBannerDismissed(true);
    }, []);

    return (
        <OnboardingContext.Provider
            value={{
                showWizard,
                showBanner,
                onboardingData,
                isLoading,
                dismissWizard,
                resumeWizard,
                completeOnboarding,
                dismissBanner,
            }}
        >
            {children}
        </OnboardingContext.Provider>
    );
}
