"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboarding } from "@/context/OnboardingStateContext";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    CheckCircle2,
    Rocket,
    X,
    Check,
    CheckCheck
} from "lucide-react";
import { motion } from "framer-motion";

// Map of setup page paths to their step IDs
const SETUP_PAGE_MAP = {
    "/dashboard/schools/create-classes": "classes",
    "/dashboard/schools/manage-teaching-staff": "teachers",
    "/dashboard/schools/manage-student": "students",
    "/dashboard/schools/manage-parent": "parents",
    "/dashboard/schools/manage-non-teaching-staff": "nonTeachingStaff",
    "/dashboard/fees/manage-fee-structure": "feeStructure",
};

// Helper to get/set manually completed steps from localStorage
const getManuallyCompletedSteps = (schoolId) => {
    if (!schoolId || typeof window === 'undefined') return [];
    try {
        const key = `onboarding-manual-steps-${schoolId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const setManuallyCompletedStep = (schoolId, stepId) => {
    if (!schoolId || typeof window === 'undefined') return;
    try {
        const key = `onboarding-manual-steps-${schoolId}`;
        const current = getManuallyCompletedSteps(schoolId);
        if (!current.includes(stepId)) {
            current.push(stepId);
            localStorage.setItem(key, JSON.stringify(current));
        }
    } catch {
        // Ignore storage errors
    }
};

export function SetupHelperButton() {
    const pathname = usePathname();
    const router = useRouter();
    const { fullUser } = useAuth();
    const { onboardingData, resumeWizard, completeOnboarding } = useOnboarding();
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [manualSteps, setManualSteps] = useState([]);

    const isAdmin = fullUser?.role?.name === "ADMIN";
    const schoolId = fullUser?.schoolId || fullUser?.school?.id;

    // Load manually completed steps
    useEffect(() => {
        if (schoolId) {
            setManualSteps(getManuallyCompletedSteps(schoolId));
        }
    }, [schoolId]);

    // Check if current page is a setup page
    const currentStepId = SETUP_PAGE_MAP[pathname];
    const isOnSetupPage = !!currentStepId;

    // Only show if: admin, on setup page, and onboarding is not complete
    const shouldShow = isAdmin && isOnSetupPage && onboardingData && !onboardingData.school?.onboardingComplete;

    if (!shouldShow) return null;

    // Find current step info
    const currentStep = onboardingData.steps?.find(s => s.id === currentStepId);
    const isStepComplete = currentStep?.isComplete || manualSteps.includes(currentStepId);

    // Calculate progress including manual completions
    const totalSteps = onboardingData.progress?.totalSteps || 6;
    const autoComplete = onboardingData.steps?.filter(s => s.isComplete).map(s => s.id) || [];
    const allComplete = [...new Set([...autoComplete, ...manualSteps])];
    const completedCount = allComplete.length;

    // Handle "Done with this step" - mark as complete and go back
    const handleStepDone = async () => {
        // Mark this step as manually complete
        setManuallyCompletedStep(schoolId, currentStepId);
        setManualSteps([...manualSteps, currentStepId]);

        toast.success(`✓ ${currentStep?.title || 'Step'} marked as complete!`);

        // Navigate back to dashboard and show wizard
        router.push("/dashboard");
        setTimeout(() => {
            resumeWizard();
            // Refresh the query to pick up any actual data changes too
            queryClient.invalidateQueries({ queryKey: ["school-onboarding", schoolId] });
        }, 100);
    };

    // Handle "Mark all complete" - skip everything
    const handleMarkAllComplete = () => {
        completeOnboarding();
        toast.success("🎉 School setup marked as complete!");
        router.push("/dashboard");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
            <motion.div
                layout
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-gray-900 dark:bg-white rounded-2xl shadow-2xl border border-gray-700 dark:border-gray-300 overflow-hidden"
            >
                {isExpanded ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="p-4 min-w-[340px]"
                    >
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <Rocket className="w-5 h-5 text-blue-400 dark:text-blue-600" />
                                <span className="font-semibold text-sm text-white dark:text-gray-900">Setup Mode</span>
                                <span className="text-xs bg-gray-700 dark:bg-gray-200 text-gray-300 dark:text-gray-700 px-2 py-0.5 rounded-full">
                                    {completedCount}/{totalSteps}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Current step status */}
                            <div className="bg-gray-800 dark:bg-gray-100 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                                <div className="text-gray-300 dark:text-gray-700">
                                    <span className="text-gray-500">Current:</span>{" "}
                                    <span className="font-medium text-white dark:text-gray-900">{currentStep?.title}</span>
                                </div>
                                {isStepComplete && (
                                    <span className="flex items-center gap-1 text-green-400 dark:text-green-600 text-xs">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Done
                                    </span>
                                )}
                            </div>

                            {/* Main Action */}
                            <Button
                                size="sm"
                                onClick={handleStepDone}
                                disabled={isStepComplete}
                                className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-medium disabled:opacity-50"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {isStepComplete ? "Already Complete" : "Done with this step → Back to Setup"}
                            </Button>

                            {/* Secondary Action */}
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleMarkAllComplete}
                                className="w-full text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-xs"
                            >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Skip remaining & complete all
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setIsExpanded(true)}
                        className="h-12 px-5 flex items-center justify-center gap-3"
                    >
                        <Rocket className="w-5 h-5 text-blue-400 dark:text-blue-600" />
                        <span className="font-medium text-sm text-white dark:text-gray-900">Setup Mode</span>
                        <span className="text-xs bg-gray-700 dark:bg-gray-200 text-gray-300 dark:text-gray-700 px-2 py-0.5 rounded-full">
                            {completedCount}/{totalSteps}
                        </span>
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
}

// Export helper for use in wizard
export { getManuallyCompletedSteps };
