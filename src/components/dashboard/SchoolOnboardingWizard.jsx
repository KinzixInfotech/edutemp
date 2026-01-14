"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingStateContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    CalendarDays,
    Clock,
    School,
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

const days = [
    { value: 0, label: 'Sunday', short: 'Sun', abbr: 'S' },
    { value: 1, label: 'Monday', short: 'Mon', abbr: 'M' },
    { value: 2, label: 'Tuesday', short: 'Tue', abbr: 'T' },
    { value: 3, label: 'Wednesday', short: 'Wed', abbr: 'W' },
    { value: 4, label: 'Thursday', short: 'Thu', abbr: 'T' },
    { value: 5, label: 'Friday', short: 'Fri', abbr: 'F' },
    { value: 6, label: 'Saturday', short: 'Sat', abbr: 'S' },
];

// Stepper steps for the wizard header
const wizardSteps = [
    { number: 1, title: "Welcome", icon: School },
    { number: 2, title: "Academic Year", icon: CalendarDays },
    { number: 3, title: "School Timing", icon: Clock },
    { number: 4, title: "Setup Checklist", icon: CheckCircle2 },
];

// Startup sound - subtle chime (from public folder)
const STARTUP_SOUND_URL = "/startup_fx.mp3";

export default function SchoolOnboardingWizard() {
    const { fullUser } = useAuth();
    const { showWizard, onboardingData, isLoading, dismissWizard, completeOnboarding } = useOnboarding();
    const queryClient = useQueryClient();
    const [hasSeenIntro, setHasSeenIntro] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0=welcome, 1=academic year, 2=school timing, 3=setup steps
    const [loading, setLoading] = useState(false);
    const [soundPlayed, setSoundPlayed] = useState(false);

    // Academic Year form
    const [academicYearForm, setAcademicYearForm] = useState({
        name: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    });

    // School Timing form
    const [timingForm, setTimingForm] = useState({
        workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat default
        startTime: '09:00',
        endTime: '17:00',
    });

    const isAdmin = fullUser?.role?.name === "ADMIN";
    const schoolId = fullUser?.schoolId || fullUser?.school?.id;

    // Disable body scroll when wizard is open
    useEffect(() => {
        if (showWizard && isAdmin && !isLoading && onboardingData) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [showWizard, isAdmin, isLoading, onboardingData]);

    // Ref for hidden audio trigger button
    const audioButtonRef = useRef(null);

    // Auto-click the hidden button when wizard opens on Welcome step to play sound
    useEffect(() => {
        if (showWizard && isAdmin && !isLoading && onboardingData && !soundPlayed && currentStep === 0) {
            // Small delay to ensure button is rendered
            const timer = setTimeout(() => {
                if (audioButtonRef.current) {
                    audioButtonRef.current.click();
                    setSoundPlayed(true);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [showWizard, isAdmin, isLoading, onboardingData, soundPlayed, currentStep]);

    // Reset sound played state when wizard closes
    useEffect(() => {
        if (!showWizard) {
            setSoundPlayed(false);
        }
    }, [showWizard]);

    // Play audio function triggered by hidden button
    const handlePlayAudio = () => {
        const audio = new Audio(STARTUP_SOUND_URL);
        audio.volume = 0.5;
        audio.play().catch(() => { });
    };

    // Check localStorage to see if intro was already shown for this school
    useEffect(() => {
        if (schoolId) {
            const key = `onboarding-intro-shown-${schoolId}`;
            const shown = localStorage.getItem(key);
            if (shown === "true") {
                setHasSeenIntro(true);
                // Check if academic year exists - if yes, skip to step 3
                const academicYearKey = `onboarding-academic-year-done-${schoolId}`;
                const timingKey = `onboarding-timing-done-${schoolId}`;

                if (localStorage.getItem(academicYearKey) === "true" && localStorage.getItem(timingKey) === "true") {
                    setCurrentStep(3); // Skip to setup steps
                } else if (localStorage.getItem(academicYearKey) === "true") {
                    setCurrentStep(2); // Skip to timing
                } else {
                    setCurrentStep(1); // Go to academic year
                }
            }
        }
    }, [schoolId]);

    const markIntroAsSeen = () => {
        if (schoolId) {
            const key = `onboarding-intro-shown-${schoolId}`;
            localStorage.setItem(key, "true");
            setHasSeenIntro(true);
        }
    };

    const toggleWorkingDay = (day) => {
        setTimingForm(prev => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day].sort((a, b) => a - b),
        }));
    };

    const handleCreateAcademicYear = async () => {
        try {
            setLoading(true);
            const payload = {
                ...academicYearForm,
                schoolId: fullUser?.schoolId || fullUser?.school?.id,
                isActive: true
            };

            if (!payload.schoolId) {
                toast.error("School ID is missing");
                return;
            }

            const res = await fetch("/api/schools/academic-years", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create");
            }

            toast.success("Academic Year Created Successfully!");
            localStorage.setItem(`onboarding-academic-year-done-${schoolId}`, "true");
            setCurrentStep(2); // Move to school timing step

        } catch (err) {
            toast.error(err.message || "Failed to create academic year");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchoolTiming = async () => {
        try {
            setLoading(true);

            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    defaultStartTime: timingForm.startTime,
                    defaultEndTime: timingForm.endTime,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save timing");
            }

            toast.success("School Timing Saved!");
            localStorage.setItem(`onboarding-timing-done-${schoolId}`, "true");
            setCurrentStep(3); // Move to setup steps

        } catch (err) {
            toast.error(err.message || "Failed to save school timing");
        } finally {
            setLoading(false);
        }
    };

    const skipAcademicYear = () => {
        toast.info("You can configure academic year later in Settings");
        localStorage.setItem(`onboarding-academic-year-done-${schoolId}`, "true");
        setCurrentStep(2);
    };

    const skipTiming = () => {
        toast.info("You can configure school timing later in Settings");
        localStorage.setItem(`onboarding-timing-done-${schoolId}`, "true");
        setCurrentStep(3);
    };

    const handleDismiss = () => {
        markIntroAsSeen();
        dismissWizard();
        toast.info("You can resume setup anytime from the banner above.");
    };

    const handleComplete = () => {
        markIntroAsSeen();
        completeOnboarding();
        toast.success("School setup complete! Welcome aboard!");
    };

    // Don't render if not showing
    if (!showWizard || !isAdmin || isLoading || !onboardingData) {
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

            {/* Hidden audio trigger button - auto-clicked on mount */}
            <button
                ref={audioButtonRef}
                onClick={handlePlayAudio}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                aria-hidden="true"
                tabIndex={-1}
            />

            {/* Animated gradient mesh backgrounds - positioned at corners (only for Welcome step) */}
            <AnimatePresence>
                {currentStep === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
                    >
                        {/* Top-left mesh - blue/indigo */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="absolute -top-40 -left-40 w-[800px] h-[800px]"
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.15, 0.25, 0.15]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full blur-[120px]"
                            />
                        </motion.div>

                        {/* Bottom-right mesh - purple/pink */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                            className="absolute -bottom-20 -right-20 w-[1000px] h-[1000px] translate-x-1/4 translate-y-1/4"
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.15, 0.25, 0.15]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-[120px]"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-3xl">
                    {/* Stepper Header - Show only after welcome step */}
                    {currentStep > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-muted/50 rounded-xl p-2 mb-6"
                        >
                            <div className="grid grid-cols-4 gap-2">
                                {wizardSteps.map((s) => {
                                    const stepIndex = s.number - 1;
                                    const isActive = currentStep === stepIndex;
                                    const isCompleted = currentStep > stepIndex;
                                    const Icon = s.icon;

                                    return (
                                        <div
                                            key={s.number}
                                            className={cn(
                                                "relative flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg transition-all duration-300",
                                                isActive
                                                    ? "bg-background border border-border"
                                                    : "bg-transparent opacity-60"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center transition-colors shrink-0",
                                                isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                                        "bg-muted text-muted-foreground"
                                            )}>
                                                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className={cn(
                                                "text-xs font-medium hidden sm:block truncate",
                                                isActive ? "text-foreground" : "text-muted-foreground"
                                            )}>
                                                {s.title}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <WelcomeStep
                                key="welcome"
                                userName={userName}
                                schoolName={fullUser?.school?.name}
                                onContinue={() => {
                                    markIntroAsSeen();
                                    setCurrentStep(1);
                                }}
                            />
                        )}

                        {currentStep === 1 && (
                            <AcademicYearStep
                                key="academic-year"
                                form={academicYearForm}
                                setForm={setAcademicYearForm}
                                loading={loading}
                                onBack={() => setCurrentStep(0)}
                                onNext={handleCreateAcademicYear}
                                onSkip={skipAcademicYear}
                            />
                        )}

                        {currentStep === 2 && (
                            <SchoolTimingStep
                                key="school-timing"
                                form={timingForm}
                                setForm={setTimingForm}
                                toggleWorkingDay={toggleWorkingDay}
                                loading={loading}
                                onBack={() => setCurrentStep(1)}
                                onNext={handleSaveSchoolTiming}
                                onSkip={skipTiming}
                            />
                        )}

                        {currentStep === 3 && (
                            <SetupStepsView
                                key="setup-steps"
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
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}



// Welcome Step - clean design without mesh (mesh is now in parent)
function WelcomeStep({ userName, schoolName, onContinue }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative text-center space-y-8"
        >
            {/* Welcome text */}
            <div className="space-y-4">
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                >
                    Welcome, {userName}! 👋
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg text-muted-foreground max-w-md mx-auto"
                >
                    Let's set up <strong className="text-foreground">{schoolName || "your school"}</strong> on EduBreezy.
                    We'll configure the academic year, school timing, and essential modules.
                </motion.p>
            </div>

            {/* Features preview */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-3"
            >
                {["Academic Year", "School Timing", "Classes", "Teachers", "Students", "Fees"].map((item, i) => (
                    <Badge
                        key={item}
                        variant="secondary"
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium",
                            stepColors[i % stepColors.length].bg,
                            stepColors[i % stepColors.length].text
                        )}
                    >
                        {item}
                    </Badge>
                ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
                    <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-muted-foreground"
            >
                Takes about 5-10 minutes • You can skip and complete later
            </motion.p>
        </motion.div>
    );
}

// Academic Year Step - cleaner styling matching welcome step
function AcademicYearStep({ form, setForm, loading, onBack, onNext, onSkip }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold">Define Academic Year</h3>
                <p className="text-muted-foreground">Set the timeframe for your academic session. This is required for attendance, fees, and other modules.</p>
            </div>

            <div className="space-y-5 bg-muted/50 p-5 rounded-2xl border border-border/50">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Session Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. 2024-2025"
                        value={form.name}
                        className="h-11 text-base"
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start" className="text-sm font-semibold">Start Date</Label>
                        <Input
                            id="start"
                            type="date"
                            value={form.startDate}
                            className="h-11"
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end" className="text-sm font-semibold">End Date</Label>
                        <Input
                            id="end"
                            type="date"
                            value={form.endDate}
                            className="h-11"
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" onClick={onBack} disabled={loading} className="h-12">
                    Back
                </Button>
                <Button variant="ghost" size="lg" onClick={onSkip} disabled={loading} className="h-12 text-muted-foreground">
                    Skip
                </Button>
                <Button onClick={onNext} disabled={loading} size="lg" className="flex-1 h-12 font-semibold">
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Next: School Timing
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}

// School Timing Step
function SchoolTimingStep({ form, setForm, toggleWorkingDay, loading, onBack, onNext, onSkip }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold">Configure School Timing</h3>
                <p className="text-muted-foreground">Set working days and school hours for attendance tracking.</p>
            </div>

            <div className="space-y-5 bg-muted/50 p-5 rounded-2xl border border-border/50">
                {/* Working Days */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold">Working Days</Label>
                    <div className="flex gap-2">
                        {days.map((day) => {
                            const isSelected = form.workingDays.includes(day.value);
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWorkingDay(day.value)}
                                    className={cn(
                                        'relative flex-1 min-w-0 py-3 px-1 rounded-xl font-semibold text-sm transition-all duration-200',
                                        'border-2 hover:scale-[1.02] active:scale-95',
                                        isSelected
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-background border-border text-muted-foreground hover:border-blue-300'
                                    )}
                                >
                                    {isSelected && (
                                        <div className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full p-0.5">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                    <span className="hidden sm:block">{day.short}</span>
                                    <span className="sm:hidden">{day.abbr}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* School Hours */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Start Time
                        </Label>
                        <Input
                            type="time"
                            value={form.startTime}
                            className="h-11"
                            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            End Time
                        </Label>
                        <Input
                            type="time"
                            value={form.endTime}
                            className="h-11"
                            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" onClick={onBack} disabled={loading} className="h-12">
                    Back
                </Button>
                <Button variant="ghost" size="lg" onClick={onSkip} disabled={loading} className="h-12 text-muted-foreground">
                    Skip
                </Button>
                <Button onClick={onNext} disabled={loading} size="lg" className="flex-1 h-12 font-semibold bg-green-600 hover:bg-green-700">
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Next: Setup Checklist
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                    )}
                </Button>
            </div>
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
                                    : "hover:border-primary/30"
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
                    disabled={!enhancedProgress.allComplete}
                    className={cn(
                        "flex-1 h-12 font-semibold",
                        enhancedProgress.allComplete
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                    )}
                >
                    {enhancedProgress.allComplete ? (
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
