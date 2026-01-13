"use client";

import { createContext, useContext } from "react";
import { Rocket, ArrowRight, X } from "lucide-react";
import { useOnboarding } from "@/context/OnboardingStateContext";
import { Button } from "@/components/ui/button";

// Context to share banner height with layout
const OnboardingBannerContext = createContext({
    showBanner: false,
    bannerHeight: 0,
});
export const useOnboardingBanner = () => useContext(OnboardingBannerContext);

export function OnboardingSetupBannerProvider({ children }) {
    const { showBanner, onboardingData, resumeWizard, dismissBanner } = useOnboarding();

    const bannerHeight = showBanner ? 44 : 0;

    return (
        <OnboardingBannerContext.Provider value={{ showBanner, bannerHeight }}>
            {/* Set CSS variable for layout offset */}
            <div style={{ "--onboarding-banner-height": `${bannerHeight}px` }}>
                {/* Fixed banner at top */}
                <div
                    className={`fixed top-0 left-0 right-0 z-[99] transition-all duration-300 ease-in-out ${showBanner
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0 pointer-events-none"
                        }`}
                    style={{
                        height: "44px",
                        marginTop: "var(--network-banner-height, 0px)",
                    }}
                >
                    <div className="w-full h-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-b border-blue-500/30 backdrop-blur-sm">
                        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-center gap-3">
                            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Complete your school setup
                                {onboardingData?.progress && (
                                    <span className="hidden sm:inline text-blue-600/80 dark:text-blue-400/80 ml-1">
                                        — {onboardingData.progress.completedSteps}/{onboardingData.progress.totalSteps} steps done
                                    </span>
                                )}
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={resumeWizard}
                                className="h-7 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                            >
                                Resume Setup
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                            <button
                                onClick={dismissBanner}
                                className="p-1 rounded-full hover:bg-blue-500/20 transition-colors ml-2"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {children}
            </div>
        </OnboardingBannerContext.Provider>
    );
}

// Backward compatibility export
export default function OnboardingSetupBanner() {
    return null;
}
