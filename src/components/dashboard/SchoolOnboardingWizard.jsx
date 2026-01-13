"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingStateContext";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    GraduationCap,
    Users,
    UserPlus,
    UserCheck,
    Briefcase,
    IndianRupee,
    ArrowRight,
    Check,
    CheckCircle2,
    X,
    Sparkles,
    Rocket,
    ExternalLink,
    ChevronRight,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const iconMap = {
    GraduationCap,
    Users,
    UserPlus,
    UserCheck,
    Briefcase,
    IndianRupee,
};

const stepColors = [
    { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
    { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
    { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", border: "border-green-500/30" },
    { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
    { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
    { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
];

export default function SchoolOnboardingWizard() {
    const { fullUser } = useAuth();
    const { showWizard, onboardingData, isLoading, dismissWizard, completeOnboarding } = useOnboarding();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [hasSeenIntro, setHasSeenIntro] = useState(false); // Track if intro was seen
    const [currentStep, setCurrentStep] = useState(0); // 0 = welcome, 1 = steps

    const isAdmin = fullUser?.role?.name === "ADMIN";
    const schoolId = fullUser?.schoolId || fullUser?.school?.id;

    // ONLY show wizard on the main dashboard page
    const isDashboardPage = pathname === "/dashboard";

    // Check localStorage to see if intro was already shown for this school
    useEffect(() => {
        if (schoolId) {
            const key = `onboarding-intro-shown-${schoolId}`;
            const shown = localStorage.getItem(key);
            if (shown === "true") {
                setHasSeenIntro(true);
                setCurrentStep(1); // Skip to steps view
            }
        }
    }, [schoolId]);

    // Mark intro as seen when user clicks "Start Setup"
    const markIntroAsSeen = () => {
        if (schoolId) {
            const key = `onboarding-intro-shown-${schoolId}`;
            localStorage.setItem(key, "true");
            setHasSeenIntro(true);
        }
    };

    const handleDismiss = () => {
        markIntroAsSeen(); // Mark intro as seen
        dismissWizard();
        toast.info("You can resume setup anytime from the banner above.");
    };

    const handleComplete = () => {
        markIntroAsSeen();
        completeOnboarding();
        toast.success("🎉 School setup complete! Welcome aboard!");
    };

    // Don't render if not showing OR not on dashboard page
    if (!showWizard || !isAdmin || isLoading || !onboardingData || !isDashboardPage) {
        return null;
    }

    const { steps = [], progress = {} } = onboardingData;
    const userName = fullUser?.name
        ? fullUser.name.charAt(0).toUpperCase() + fullUser.name.slice(1).toLowerCase()
        : "Admin";

    return (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm overflow-y-auto">
            {/* Close button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDismiss();
                }}
                className="absolute top-4 right-4 z-[210] p-2 rounded-full hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close"
            >
                <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-3xl">
                    {currentStep === 0 ? (
                        <WelcomeStep
                            userName={userName}
                            schoolName={fullUser?.school?.name}
                            profilePicture={fullUser?.profilePicture}
                            onContinue={() => {
                                markIntroAsSeen();
                                setCurrentStep(1);
                            }}
                        />
                    ) : (
                        <SetupStepsView
                            steps={steps}
                            progress={progress}
                            schoolId={schoolId}
                            onComplete={handleComplete}
                            onDismiss={handleDismiss}
                            onRefresh={async () => {
                                await queryClient.invalidateQueries({ queryKey: ["school-onboarding", schoolId] });
                                await queryClient.refetchQueries({ queryKey: ["school-onboarding", schoolId] });
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function WelcomeStep({ userName, schoolName, profilePicture, onContinue }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8"
        >
            {/* Decorative element */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />
                    <div className="relative w-28 h-28 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center rotate-3 shadow-2xl">
                        {profilePicture ? (
                            <img
                                src={profilePicture}
                                alt="Profile"
                                className="w-20 h-20 rounded-2xl object-cover"
                            />
                        ) : (
                            <Rocket className="h-12 w-12 text-white" />
                        )}
                    </div>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-2 -right-2"
                    >
                        <Sparkles className="h-8 w-8 text-amber-500" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Welcome text */}
            <div className="space-y-4">
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                >
                    Welcome, {userName}! 👋
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground max-w-md mx-auto"
                >
                    Let's set up <strong className="text-foreground">{schoolName || "your school"}</strong> on EduBreezy.
                    This quick guide will help you configure the essential modules.
                </motion.p>
            </div>

            {/* Features preview */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-3"
            >
                {["Classes", "Teachers", "Students", "Parents", "Staff", "Fees"].map((item, i) => (
                    <Badge
                        key={item}
                        variant="secondary"
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium",
                            stepColors[i].bg,
                            stepColors[i].text
                        )}
                    >
                        {item}
                    </Badge>
                ))}
            </motion.div>

            {/* CTA */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="relative z-10"
            >
                <Button
                    type="button"
                    size="lg"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onContinue();
                    }}
                    className="h-14 px-10 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                    Start Setup
                    <ArrowRight className="h-5 w-5" />
                </Button>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm text-muted-foreground"
            >
                Takes about 5-10 minutes • You can skip and complete later
            </motion.p>
        </motion.div>
    );
}

// Helper to get manually completed steps from localStorage
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

function SetupStepsView({ steps, progress, schoolId, onComplete, onDismiss, onRefresh }) {
    const [refreshing, setRefreshing] = useState(false);
    const [manualSteps, setManualSteps] = useState([]);

    // Load manually completed steps
    useEffect(() => {
        if (schoolId) {
            setManualSteps(getManuallyCompletedSteps(schoolId));
        }
    }, [schoolId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        // Reload manual steps after refresh
        if (schoolId) {
            setManualSteps(getManuallyCompletedSteps(schoolId));
        }
        setTimeout(() => setRefreshing(false), 500);
    };

    // Merge auto and manual completions
    const enhancedSteps = steps.map(step => ({
        ...step,
        isComplete: step.isComplete || manualSteps.includes(step.id)
    }));

    // Recalculate progress
    const completedCount = enhancedSteps.filter(s => s.isComplete).length;
    const totalCount = enhancedSteps.length;
    const enhancedProgress = {
        ...progress,
        completedSteps: completedCount,
        totalSteps: totalCount,
        percentage: Math.round((completedCount / totalCount) * 100),
        allComplete: completedCount === totalCount
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    School Setup Checklist
                </h2>
                <p className="text-muted-foreground">
                    Complete these steps to get your school ready
                </p>
            </div>

            {/* Progress bar */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                        {enhancedProgress.completedSteps} of {enhancedProgress.totalSteps} completed
                    </span>
                    <Badge variant={enhancedProgress.allComplete ? "default" : "secondary"}>
                        {enhancedProgress.percentage}%
                    </Badge>
                </div>
                <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${enhancedProgress.percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={cn(
                            "h-full rounded-full transition-all",
                            enhancedProgress.allComplete
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-blue-500 to-indigo-500"
                        )}
                    />
                </div>
            </div>

            {/* Steps list */}
            <div className="space-y-3">
                {enhancedSteps.map((step, index) => {
                    const Icon = iconMap[step.icon] || GraduationCap;
                    const colors = stepColors[index];

                    return (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "group relative bg-card border rounded-xl p-4 transition-all",
                                step.isComplete
                                    ? "border-green-500/30 bg-green-500/5"
                                    : "hover:border-primary/30 hover:shadow-md"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div
                                    className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                                        step.isComplete ? "bg-green-500/10" : colors.bg
                                    )}
                                >
                                    {step.isComplete ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    ) : (
                                        <Icon className={cn("h-6 w-6", colors.text)} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">{step.title}</h3>
                                        {step.isComplete && (
                                            <Badge variant="outline" className="text-green-600 border-green-500/30 text-xs">
                                                Done
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                    {step.count > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {step.count} {step.count === 1 ? "record" : "records"} added
                                        </p>
                                    )}
                                </div>

                                {/* Action */}
                                <Link href={step.href} target="_blank" className="flex-shrink-0">
                                    <Button
                                        size="sm"
                                        variant={step.isComplete ? "outline" : "default"}
                                        className="gap-1.5"
                                    >
                                        {step.isComplete ? "View" : "Add"}
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Refresh button */}
            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-muted-foreground"
                >
                    {refreshing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4 mr-2" />
                    )}
                    Refresh Progress
                </Button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={onDismiss}
                    className="flex-1 h-12"
                >
                    Skip for now
                </Button>
                <Button
                    size="lg"
                    onClick={onComplete}
                    disabled={!progress.allComplete}
                    className={cn(
                        "flex-1 h-12 font-semibold",
                        progress.allComplete
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                    )}
                >
                    {progress.allComplete ? (
                        <>
                            <Check className="mr-2 h-5 w-5" />
                            Complete Setup
                        </>
                    ) : (
                        <>
                            Complete All Steps First
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>

            {/* Help text */}
            <p className="text-center text-xs text-muted-foreground">
                Tip: Open each step in a new tab, add data, then click "Refresh Progress"
            </p>
        </motion.div>
    );
}
