"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AlertTriangle, ArrowRight, Clock, Settings2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/context/OnboardingStateContext";

// Context to share setup status
const SetupBannerContext = createContext({
    showBanner: false,
    bannerHeight: 0,
    yearStatus: null,
    activeYear: null,
    runningYear: null
});
export const useSetupBanner = () => useContext(SetupBannerContext);

export function AcademicYearSetupBannerProvider({ children }) {
    const { fullUser } = useAuth();
    const { showWizard } = useOnboarding();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Only fetch for ADMIN role
    const isAdmin = fullUser?.role?.name === "ADMIN";

    const { data: years = [], isLoading } = useQuery({
        queryKey: ["active-academic-year", fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: !!fullUser?.schoolId && isAdmin,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { activeYear, runningYear, yearStatus, showBanner, bannerType, incompleteSteps } = useMemo(() => {
        const now = new Date();

        // Active Year = Admin-selected (isActive: true)
        const active = years.find(y => y.isActive) || null;

        // Running Year = Date-based (startDate <= today <= endDate)
        const running = years.find(y => {
            const start = new Date(y.startDate);
            const end = new Date(y.endDate);
            return start <= now && now <= end;
        }) || null;

        // Determine year status
        let status = null;
        if (active) {
            const startDate = new Date(active.startDate);
            const endDate = new Date(active.endDate);
            if (now < startDate) {
                status = "pre-start";
            } else if (now > endDate) {
                status = "ended";
            } else {
                status = "running";
            }
        }

        // Determine if years differ
        const yearsDiffer = active && running && active.id !== running.id;

        // Check if needs setup
        const hasData = active && (
            active._count?.students > 0 ||
            active._count?.classes > 0 ||
            active._count?.FeeStructures > 0
        );
        const needsSetup = active && !active.setupComplete && !hasData;

        // Calculate incomplete steps
        const steps = [];
        if (active && !active.setupComplete) {
            if (!active.studentsPromoted) steps.push("Students");
            if (!active.feesConfigured) steps.push("Fees");
            if (!active.classesConfigured) steps.push("Classes");
            if (!active.timetableConfigured) steps.push("Timetable");
            if (!active.subjectsConfigured) steps.push("Subjects");
        }

        // Determine banner type priority: config-mode > needs-setup > none
        let type = null;
        let show = false;

        // Count total non-archived years to determine if this is a "transition" scenario
        const totalYears = years.length;
        const isFirstYearEver = totalYears === 1;

        if (mounted && isAdmin && !isLoading && active && fullUser?.school?.onboardingComplete) {
            if (yearsDiffer && status === "pre-start") {
                // Active is a future year, Running is current → Config mode
                type = "config-mode";
                show = true;
            } else if (status === "pre-start" && !isFirstYearEver) {
                // Active is pre-start but no running year (only show if not first year)
                type = "pre-start";
                show = true;
            } else if (needsSetup && !isFirstYearEver) {
                // Active needs setup - only show if this is NOT the first/only year
                // First year setup is handled by onboarding, not this banner
                type = "setup-needed";
                show = true;
            }
        }

        return {
            activeYear: active,
            runningYear: running,
            yearStatus: status,
            showBanner: show,
            bannerType: type,
            incompleteSteps: steps
        };
    }, [years, isLoading, mounted, isAdmin]);

    const bannerHeight = showBanner ? 40 : 0;

    // Format date for display
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Banner colors based on type
    const getBannerStyles = (type) => {
        switch (type) {
            case "config-mode":
                return "bg-indigo-500/15 dark:bg-indigo-900/25 border-indigo-500/30";
            case "pre-start":
                return "bg-blue-500/15 dark:bg-blue-900/25 border-blue-500/30";
            case "setup-needed":
                return "bg-amber-500/15 dark:bg-amber-900/25 border-amber-500/30";
            default:
                return "bg-muted border-border";
        }
    };

    const getIconStyles = (type) => {
        switch (type) {
            case "config-mode":
                return "text-indigo-600 dark:text-indigo-400";
            case "pre-start":
                return "text-blue-600 dark:text-blue-400";
            case "setup-needed":
                return "text-amber-600 dark:text-amber-400";
            default:
                return "text-muted-foreground";
        }
    };

    const getTextStyles = (type) => {
        switch (type) {
            case "config-mode":
                return "text-indigo-700 dark:text-indigo-400";
            case "pre-start":
                return "text-blue-700 dark:text-blue-400";
            case "setup-needed":
                return "text-amber-700 dark:text-amber-400";
            default:
                return "text-foreground";
        }
    };

    return (
        <SetupBannerContext.Provider value={{ showBanner: showWizard ? false : showBanner, bannerHeight: showWizard ? 0 : bannerHeight, yearStatus, activeYear, runningYear }}>
            {/* Set CSS variable for layout offset */}
            <div style={{ "--setup-banner-height": `${showWizard ? 0 : bannerHeight}px` }}>
                {/* Fixed banner at top */}
                {showBanner && !showWizard && (
                    <div
                        className={`fixed left-0 right-0 z-[99] border-b backdrop-blur-sm transition-all duration-300 ${getBannerStyles(bannerType)}`}
                        style={{
                            top: "var(--network-banner-height, 0px)",
                            height: "40px"
                        }}
                    >
                        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-center gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                {bannerType === "config-mode" ? (
                                    <>
                                        <Settings2 className={`h-4 w-4 flex-shrink-0 ${getIconStyles(bannerType)}`} />
                                        <span className={`text-sm font-medium truncate ${getTextStyles(bannerType)}`}>
                                            Configuring <strong>{activeYear?.name}</strong>
                                            <span className="hidden sm:inline"> • Operations running on </span>
                                            <span className="hidden sm:inline font-semibold">{runningYear?.name}</span>
                                            <span className="hidden md:inline text-indigo-600 dark:text-indigo-500 ml-1">
                                                — Starts {formatDate(activeYear?.startDate)}
                                            </span>
                                        </span>
                                    </>
                                ) : bannerType === "pre-start" ? (
                                    <>
                                        <Clock className={`h-4 w-4 flex-shrink-0 ${getIconStyles(bannerType)}`} />
                                        <span className={`text-sm font-medium truncate ${getTextStyles(bannerType)}`}>
                                            Academic year <strong>{activeYear?.name}</strong> starts on <strong>{formatDate(activeYear?.startDate)}</strong>
                                            <span className="hidden md:inline text-blue-600 dark:text-blue-500 ml-1">
                                                — Configuration mode
                                            </span>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${getIconStyles(bannerType)}`} />
                                        <span className={`text-sm font-medium truncate ${getTextStyles(bannerType)}`}>
                                            Academic year <strong>{activeYear?.name}</strong> setup is incomplete.
                                            {incompleteSteps.length > 0 && (
                                                <span className="hidden md:inline text-amber-600 dark:text-amber-500 ml-1">
                                                    Pending: {incompleteSteps.slice(0, 3).join(", ")}
                                                    {incompleteSteps.length > 3 && ` +${incompleteSteps.length - 3} more`}
                                                </span>
                                            )}
                                        </span>
                                    </>
                                )}
                            </div>
                            <Link href="/dashboard/schools/academic-years/setup" className="flex-shrink-0">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-7 text-xs font-medium ${getTextStyles(bannerType)} hover:bg-white/20`}
                                >
                                    {bannerType === "config-mode" ? "View Setup" :
                                        bannerType === "pre-start" ? "Configure" : "Complete Setup"}
                                    <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {children}
            </div>
        </SetupBannerContext.Provider>
    );
}

// Simple non-provider version for backward compatibility
export function AcademicYearSetupBanner() {
    return null; // Replaced by provider pattern
}
