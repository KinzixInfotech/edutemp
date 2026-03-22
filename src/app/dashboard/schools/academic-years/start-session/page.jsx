"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    CheckCircle2,
    Calendar,
    Copy,
    GraduationCap,
    CreditCard,
    Rocket,
    AlertTriangle,
    Users,
    BookOpen,
    Clock,
    Eye,
    Sparkles,
    Shield,
    ChevronRight,
    ChevronDown,
} from "lucide-react";

const STEPS = [
    { id: 1, title: "Basic Setup", icon: Calendar, description: "Name & dates" },
    { id: 2, title: "Carry Forward", icon: Copy, description: "What to clone" },
    { id: 3, title: "Student Promotion", icon: GraduationCap, description: "Move students up" },
    { id: 4, title: "Fee Setup", icon: CreditCard, description: "Fee structures" },
    { id: 5, title: "Preview", icon: Eye, description: "Review changes" },
    { id: 6, title: "Execute", icon: Rocket, description: "Start session" },
];

export default function StartSessionPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState(null);
    const [preview, setPreview] = useState(null);

    // Step 1: Basic Setup
    const [form, setForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
    });

    // Step 2: Carry Forward
    const [carryForward, setCarryForward] = useState({
        classesAndSections: true,
        subjectMappings: true,
        feeStructure: true,
        timetable: false,
    });

    // Step 3: Student Promotion
    const [promotionMode, setPromotionMode] = useState("auto");
    // Admin overrides: { classId: { targetClassId, targetClassName } | 'alumni' | 'skip' }
    const [promotionOverrides, setPromotionOverrides] = useState({});
    const [expandedPromotionClasses, setExpandedPromotionClasses] = useState(new Set());

    // Execution progress (0-100)
    const [executionProgress, setExecutionProgress] = useState(0);

    // Existing year selection
    const [selectedExistingYearId, setSelectedExistingYearId] = useState(null);

    // Load preview data
    useEffect(() => {
        if (!schoolId) return;
        fetchPreview();
    }, [schoolId]);

    const fetchPreview = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/schools/${schoolId}/academic-years/start-session`);
            const data = await res.json();
            setPreview(data);

            // Auto-suggest name and dates
            if (data.currentYear) {
                const oldEnd = new Date(data.currentYear.endDate);
                const suggestedStart = new Date(oldEnd);
                suggestedStart.setDate(suggestedStart.getDate() + 1);
                const suggestedEnd = new Date(suggestedStart);
                suggestedEnd.setFullYear(suggestedEnd.getFullYear() + 1);
                suggestedEnd.setDate(suggestedEnd.getDate() - 1);

                const startYear = suggestedStart.getFullYear();
                const endYearSuffix = suggestedEnd.getFullYear().toString().slice(-2);

                setForm({
                    name: `${startYear}-${endYearSuffix}`,
                    startDate: suggestedStart.toISOString().split("T")[0],
                    endDate: suggestedEnd.toISOString().split("T")[0],
                });
            }
        } catch (err) {
            toast.error("Failed to load preview data");
        } finally {
            setLoading(false);
        }
    };

    // Auto-suggest end date when start date changes
    const handleStartDateChange = (dateStr) => {
        setForm(prev => {
            const start = new Date(dateStr);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);

            const startYear = start.getFullYear();
            const endYearSuffix = end.getFullYear().toString().slice(-2);

            return {
                ...prev,
                startDate: dateStr,
                endDate: end.toISOString().split("T")[0],
                name: `${startYear}-${endYearSuffix}`,
            };
        });
    };

    // Execute wizard
    const handleExecute = async () => {
        setExecuting(true);
        setExecutionProgress(0);

        // Simulate progress while waiting for the backend
        const progressSteps = [5, 10, 15, 20, 28, 35, 42, 50, 55, 62, 65, 72, 78, 85, 88];
        let stepIdx = 0;
        const progressTimer = setInterval(() => {
            if (stepIdx < progressSteps.length) {
                setExecutionProgress(progressSteps[stepIdx]);
                stepIdx++;
            }
        }, 3000); // advance every 3s

        try {
            const res = await fetch(`/api/schools/${schoolId}/academic-years/start-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(selectedExistingYearId
                        ? { existingYearId: selectedExistingYearId }
                        : { name: form.name, startDate: form.startDate, endDate: form.endDate }),
                    carryForward,
                    promotionMode,
                    promotionOverrides,
                    promotedBy: fullUser?.id,
                }),
            });

            clearInterval(progressTimer);
            setExecutionProgress(95);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to start session");
            }

            setExecutionProgress(100);
            setExecutionResult(data);
            toast.success("New academic session started successfully!");

            // Auto-redirect after 5 seconds
            setTimeout(() => {
                window.location.href = "/dashboard/schools/academic-years";
            }, 5000);
        } catch (err) {
            clearInterval(progressTimer);
            setExecutionProgress(0);
            toast.error(err.message);
        } finally {
            setExecuting(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return form.name && form.startDate && form.endDate;
            case 2: return true;
            case 3: return true;
            case 4: return true;
            case 5: return true;
            case 6: return true;
            default: return false;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Loading session data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard/schools/academic-years")}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Rocket className="h-6 w-6 text-primary" />
                        Start New Academic Session
                    </h1>
                    <p className="text-muted-foreground">
                        Guided setup to transition your school to a new academic year
                    </p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    const isDisabled = executionResult && step.id !== 6;

                    return (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-default ${isActive
                                    ? "bg-primary text-primary-foreground "
                                    : isCompleted
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Icon className="h-4 w-4" />
                                    )}
                                    <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">
                                        {step.title}
                                    </span>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground mx-0.5 flex-shrink-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {(() => {
                            const Icon = STEPS[currentStep - 1].icon;
                            return <Icon className="h-5 w-5 text-primary" />;
                        })()}
                        Step {currentStep}: {STEPS[currentStep - 1].title}
                    </CardTitle>
                    <CardDescription>
                        {STEPS[currentStep - 1].description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* ───── Step 1: Basic Setup ───── */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            {preview?.currentYear && (
                                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-800 dark:text-blue-300">
                                        Current Session: {preview.currentYear.name}
                                    </AlertTitle>
                                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                                        {new Date(preview.currentYear.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} →{" "}
                                        {new Date(preview.currentYear.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        <span className="ml-2 text-xs opacity-70">
                                            (will be archived → read-only)
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Existing future years selector */}
                            {preview?.futureYears?.length > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Use Existing Year</Label>
                                    <p className="text-xs text-muted-foreground -mt-1">
                                        Select a pre-created year, or create a new one below
                                    </p>
                                    <div className="grid gap-2">
                                        {preview.futureYears.map(fy => (
                                            <div
                                                key={fy.id}
                                                onClick={() => {
                                                    if (selectedExistingYearId === fy.id) {
                                                        setSelectedExistingYearId(null);
                                                        return;
                                                    }
                                                    setSelectedExistingYearId(fy.id);
                                                    setForm({
                                                        name: fy.name,
                                                        startDate: fy.startDate.split("T")[0],
                                                        endDate: fy.endDate.split("T")[0],
                                                    });
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedExistingYearId === fy.id
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/40"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <p className="font-medium text-sm">{fy.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(fy.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} → {new Date(fy.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedExistingYearId === fy.id && (
                                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="relative my-3">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or create new</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>Session Name</Label>
                                    <Input
                                        placeholder="2026-27"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => handleStartDateChange(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {form.startDate && form.endDate && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <span>
                                        Academic session will run for{" "}
                                        <strong>
                                            {Math.round((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24 * 30))} months
                                        </strong>{" "}
                                        from {new Date(form.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───── Step 2: Carry Forward ───── */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800 dark:text-amber-300">
                                    What gets carried forward?
                                </AlertTitle>
                                <AlertDescription className="text-amber-700 dark:text-amber-400">
                                    Only structure/config is cloned. Attendance, marks, payments, and transactional data are <strong>never</strong> carried over.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-3">
                                {[
                                    {
                                        key: "classesAndSections",
                                        title: "Classes & Sections",
                                        desc: `${preview?.preview?.classesToClone || 0} classes will be cloned`,
                                        icon: BookOpen,
                                        recommended: true,
                                    },
                                    {
                                        key: "subjectMappings",
                                        title: "Subject Mappings",
                                        desc: `${preview?.preview?.subjectsToClone || 0} subject assignments`,
                                        icon: BookOpen,
                                        recommended: true,
                                    },
                                    {
                                        key: "feeStructure",
                                        title: "Fee Structures",
                                        desc: `${preview?.preview?.feeStructuresToClone || 0} fee structures will be cloned`,
                                        icon: CreditCard,
                                        recommended: true,
                                    },
                                    {
                                        key: "timetable",
                                        title: "Timetable",
                                        desc: `${preview?.preview?.timetableEntriesToClone || 0} entries — teachers/subjects may change`,
                                        icon: Clock,
                                        recommended: false,
                                        notRecommended: true,
                                    },
                                ].map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.key}
                                            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${carryForward[item.key]
                                                ? "border-primary/50 bg-primary/5"
                                                : "border-muted"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${carryForward[item.key]
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-muted text-muted-foreground"
                                                    }`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{item.title}</span>
                                                        {item.recommended && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                                Recommended
                                                            </Badge>
                                                        )}
                                                        {item.notRecommended && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                                                                Not Recommended
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={carryForward[item.key]}
                                                onCheckedChange={val =>
                                                    setCarryForward(prev => ({
                                                        ...prev,
                                                        [item.key]: val,
                                                        // If disabling classes, disable dependent items
                                                        ...(item.key === "classesAndSections" && !val && {
                                                            subjectMappings: false,
                                                            feeStructure: false,
                                                            timetable: false,
                                                        }),
                                                    }))
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">
                                    <Shield className="h-4 w-4 inline mr-1 text-green-600" />
                                    <strong>Staff (Teachers, Non-Teaching)</strong> are automatically kept — they persist across sessions.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ───── Step 3: Student Promotion ───── */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium">{preview?.preview?.studentsToPromote || 0} students</p>
                                    <p className="text-sm text-muted-foreground">in current session</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    {
                                        mode: "auto",
                                        title: "Auto Promote All",
                                        desc: "Class 1→2, Class 2→3, ... Last class students stay (alumni). Same section names preserved.",
                                        badge: "Recommended",
                                    },
                                    {
                                        mode: "skip",
                                        title: "Skip Promotion",
                                        desc: "Students stay in old session. You can promote manually later.",
                                        badge: null,
                                    },
                                ].map(opt => (
                                    <div
                                        key={opt.mode}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${promotionMode === opt.mode
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/30"
                                            }`}
                                        onClick={() => setPromotionMode(opt.mode)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promotionMode === opt.mode ? "border-primary" : "border-muted-foreground/30"
                                                }`}>
                                                {promotionMode === opt.mode && (
                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{opt.title}</span>
                                                    {opt.badge && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                                                            {opt.badge}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {promotionMode === "auto" && preview?.classBreakdown?.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">Promotion Preview</p>
                                        <p className="text-[10px] text-muted-foreground">Click class to expand sections • Override class or section targets</p>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        {/* Header */}
                                        <div className="grid grid-cols-[1fr_80px_160px_140px] bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                                            <span>Class / Section</span>
                                            <span className="text-center">Students</span>
                                            <span className="text-right">Promoted To</span>
                                            <span className="text-right">Target Section</span>
                                        </div>

                                        {preview.classBreakdown.map((cls) => {
                                            const override = promotionOverrides[cls.id];
                                            const defaultTarget = cls.promotedTo;
                                            const isAlumni = override === 'alumni' || (!override && !defaultTarget);
                                            const isSkipped = override === 'skip';
                                            const hasWarning = isAlumni && cls.students > 0 && !override;

                                            // Get target class sections
                                            const targetClassId = override?.targetClassId || defaultTarget?.id;
                                            const targetClassData = targetClassId
                                                ? preview.classBreakdown.find(c => c.id === targetClassId || c.id?.toString() === targetClassId?.toString())
                                                : null;
                                            const targetSections = targetClassData?.sections || defaultTarget?.sections || [];

                                            // Expandable state per class
                                            const isExpanded = expandedPromotionClasses?.has(cls.id);

                                            return (
                                                <div key={cls.id}>
                                                    {/* ── Class header row ── */}
                                                    <div
                                                        className={`grid grid-cols-[1fr_80px_160px_140px] px-4 py-2.5 border-t items-center cursor-pointer hover:bg-muted/40 transition-colors ${hasWarning ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                                                        onClick={() => {
                                                            setExpandedPromotionClasses(prev => {
                                                                const next = new Set(prev || []);
                                                                if (next.has(cls.id)) next.delete(cls.id);
                                                                else next.add(cls.id);
                                                                return next;
                                                            });
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {cls.sections?.length > 0 ? (
                                                                isExpanded
                                                                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                            ) : <span className="w-3.5" />}
                                                            <span className="font-semibold text-sm">{cls.name}</span>
                                                            {cls.sections?.length > 0 && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            {hasWarning && (
                                                                <span className="text-[10px] text-amber-600">
                                                                    ⚠ Last class → Alumni
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-center">
                                                            <Badge variant="outline">{cls.students}</Badge>
                                                        </div>
                                                        {/* Class-level Promoted To dropdown */}
                                                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                className="text-xs border rounded px-2 py-1 bg-background text-right max-w-[150px] cursor-pointer"
                                                                value={
                                                                    override === 'alumni' ? '__alumni__'
                                                                    : override === 'skip' ? '__skip__'
                                                                    : override?.targetClassId || defaultTarget?.id || '__alumni__'
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '__alumni__') {
                                                                        setPromotionOverrides(prev => ({ ...prev, [cls.id]: 'alumni' }));
                                                                    } else if (val === '__skip__') {
                                                                        setPromotionOverrides(prev => ({ ...prev, [cls.id]: 'skip' }));
                                                                    } else if (val === (defaultTarget?.id?.toString() || '')) {
                                                                        setPromotionOverrides(prev => {
                                                                            const next = { ...prev };
                                                                            delete next[cls.id];
                                                                            return next;
                                                                        });
                                                                    } else {
                                                                        const targetCls = preview.classBreakdown.find(c => c.id.toString() === val);
                                                                        if (targetCls) {
                                                                            setPromotionOverrides(prev => ({
                                                                                ...prev,
                                                                                [cls.id]: {
                                                                                    targetClassId: targetCls.id,
                                                                                    targetClassName: targetCls.name,
                                                                                    sectionMap: prev[cls.id]?.sectionMap || {},
                                                                                }
                                                                            }));
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                {preview.classBreakdown
                                                                    .filter(c => c.id !== cls.id)
                                                                    .map(c => (
                                                                        <option key={c.id} value={c.id}>
                                                                            → {c.name}{c.id === defaultTarget?.id ? ' ✓' : ''}
                                                                        </option>
                                                                    ))}
                                                                <option value="__alumni__">🎓 Alumni</option>
                                                                <option value="__skip__">⏭ Skip</option>
                                                            </select>
                                                        </div>
                                                        {/* Class-level: no section dropdown here */}
                                                        <div className="flex justify-end">
                                                            {!isAlumni && !isSkipped && cls.sections?.length > 0 ? (
                                                                <span className="text-[10px] text-muted-foreground italic">expand ↓</span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ── Expanded section rows ── */}
                                                    {isExpanded && !isAlumni && !isSkipped && cls.sections?.map((sec) => {
                                                        const sectionMap = override?.sectionMap || {};
                                                        const currentSectionTarget = sectionMap[sec.id];

                                                        return (
                                                            <div
                                                                key={sec.id}
                                                                className="grid grid-cols-[1fr_80px_160px_140px] px-4 py-2 border-t items-center bg-muted/20"
                                                            >
                                                                <div className="flex items-center gap-2 pl-6">
                                                                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                                                        {sec.name}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="text-xs text-muted-foreground">{sec.students || 0}</span>
                                                                </div>
                                                                {/* Empty — class row already shows target class */}
                                                                <div className="flex justify-end">
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        → {override?.targetClassName || defaultTarget?.name || 'Alumni'}
                                                                    </span>
                                                                </div>
                                                                {/* Section-level target section dropdown */}
                                                                <div className="flex justify-end">
                                                                    {targetSections.length > 0 ? (
                                                                        <select
                                                                            className="text-xs border rounded px-1.5 py-1 bg-background text-right max-w-[120px] cursor-pointer"
                                                                            value={currentSectionTarget || '__auto__'}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setPromotionOverrides(prev => {
                                                                                    const existing = prev[cls.id] || {};
                                                                                    if (typeof existing === 'string') return prev;
                                                                                    const newSectionMap = { ...(existing.sectionMap || {}) };
                                                                                    if (val === '__auto__') {
                                                                                        delete newSectionMap[sec.id];
                                                                                    } else {
                                                                                        newSectionMap[sec.id] = parseInt(val);
                                                                                    }
                                                                                    return {
                                                                                        ...prev,
                                                                                        [cls.id]: {
                                                                                            targetClassId: existing.targetClassId || defaultTarget?.id,
                                                                                            targetClassName: existing.targetClassName || defaultTarget?.name,
                                                                                            sectionMap: newSectionMap,
                                                                                        }
                                                                                    };
                                                                                });
                                                                            }}
                                                                        >
                                                                            <option value="__auto__">Auto ({sec.name})</option>
                                                                            {targetSections.map(s => (
                                                                                <option key={s.id} value={s.id}>
                                                                                    → {s.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───── Step 4: Fee Setup ───── */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            {carryForward.feeStructure ? (
                                <>
                                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertTitle className="text-green-800 dark:text-green-300">
                                            Fee Structures will be Cloned
                                        </AlertTitle>
                                        <AlertDescription className="text-green-700 dark:text-green-400">
                                            <strong>{preview?.preview?.feeStructuresToClone || 0}</strong> fee structures will be copied as <strong>DRAFT</strong>.
                                            You can edit amounts after the session starts.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                        <p className="text-sm font-medium">What gets cloned:</p>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" /> Fee structure names & amounts
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" /> Fee particulars (components)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" /> Installment rules (dates shifted)
                                            </li>
                                        </ul>
                                        <div className="border-t pt-2 mt-2">
                                            <p className="text-sm font-medium">What does NOT transfer:</p>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li className="flex items-center gap-2">
                                                    <span className="text-red-500">✕</span> Student fee assignments
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="text-red-500">✕</span> Payments & receipts
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span className="text-red-500">✕</span> Discounts & waivers
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800 dark:text-amber-300">
                                        Fee Structures Not Cloned
                                    </AlertTitle>
                                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                                        You chose not to carry forward fee structures. You&apos;ll need to create them manually in the new session.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* ───── Step 5: Preview ───── */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                                <Eye className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800 dark:text-blue-300">
                                    Review Before Starting
                                </AlertTitle>
                                <AlertDescription className="text-blue-700 dark:text-blue-400">
                                    Please review all changes below. This action will archive the current session.
                                </AlertDescription>
                            </Alert>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted px-4 py-3 border-b">
                                    <p className="font-semibold">New Session: {form.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(form.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} →{" "}
                                        {new Date(form.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                    </p>
                                </div>

                                <div className="divide-y">
                                    {[
                                        {
                                            label: "Current Session",
                                            value: `${preview?.currentYear?.name || "None"} → ARCHIVED (read-only)`,
                                            icon: "📦",
                                        },
                                        {
                                            label: "Classes & Sections",
                                            value: carryForward.classesAndSections ? `${preview?.preview?.classesToClone || 0} classes cloned` : "Not cloned",
                                            icon: carryForward.classesAndSections ? "✅" : "⏭️",
                                        },
                                        {
                                            label: "Subject Mappings",
                                            value: carryForward.subjectMappings ? `${preview?.preview?.subjectsToClone || 0} subjects cloned` : "Not cloned",
                                            icon: carryForward.subjectMappings ? "✅" : "⏭️",
                                        },
                                        {
                                            label: "Fee Structures",
                                            value: carryForward.feeStructure ? `${preview?.preview?.feeStructuresToClone || 0} structures cloned` : "Not cloned",
                                            icon: carryForward.feeStructure ? "✅" : "⏭️",
                                        },
                                        {
                                            label: "Student Promotion",
                                            value: promotionMode === "auto"
                                                ? `${preview?.preview?.studentsToPromote || 0} students auto-promoted`
                                                : "Skipped (manual later)",
                                            icon: promotionMode === "auto" ? "✅" : "⏭️",
                                        },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span>{item.icon}</span>
                                                <span className="font-medium text-sm">{item.label}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-800 dark:text-red-300">
                                    Irreversible Action
                                </AlertTitle>
                                <AlertDescription className="text-red-700 dark:text-red-400">
                                    Starting a new session will <strong>archive the current session</strong> and make it read-only.
                                    Attendance, marks, and fee payments data is preserved in the archived session.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* ───── Step 6: Execute ───── */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            {!executionResult && !executing && (
                                <div className="text-center space-y-6 py-4">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                        <Rocket className="h-10 w-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Ready to Launch</h3>
                                        <p className="text-muted-foreground mt-1">
                                            Click below to start <strong>{form.name}</strong> session
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="px-8 text-base"
                                        onClick={handleExecute}
                                    >
                                        <Rocket className="mr-2 h-5 w-5" />
                                        Start New Session
                                    </Button>
                                </div>
                            )}

                            {executing && (() => {
                                const steps = [
                                    { label: "Creating academic year...", range: [0, 15] },
                                    { label: "Cloning classes & sections...", range: [15, 35] },
                                    { label: "Cloning subjects...", range: [35, 50] },
                                    { label: "Cloning fee structures...", range: [50, 65] },
                                    { label: "Promoting students...", range: [65, 90] },
                                    { label: "Finalizing setup...", range: [90, 100] },
                                ];
                                return (
                                    <div className="space-y-6 py-8">
                                        <div className="text-center space-y-3">
                                            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold">Setting Up New Session...</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    This may take a few minutes for large schools
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="space-y-3 max-w-md mx-auto">
                                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${executionProgress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{steps.find(s => executionProgress >= s.range[0] && executionProgress < s.range[1])?.label || "Finalizing..."}</span>
                                                <span className="font-medium">{Math.round(executionProgress)}%</span>
                                            </div>
                                        </div>

                                        {/* Step checklist */}
                                        <div className="max-w-md mx-auto space-y-2">
                                            {steps.map((step, i) => {
                                                const done = executionProgress >= step.range[1];
                                                const active = executionProgress >= step.range[0] && executionProgress < step.range[1];
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 text-sm ${done ? "text-green-600" : active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                                        {done ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                                        ) : active ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                                                        ) : (
                                                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                                                        )}
                                                        <span>{step.label.replace("...", "")}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {executionResult && (
                                <div className="space-y-4">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                                                Session Started Successfully!
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {executionResult.newYearName} is now active
                                            </p>
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    {executionResult.warning && (
                                        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-sm">
                                                {executionResult.warning}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-muted px-4 py-2 text-sm font-medium">Summary</div>
                                        <div className="divide-y text-sm">
                                            {executionResult.archivedYearName && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Archived</span>
                                                    <span>{executionResult.archivedYearName}</span>
                                                </div>
                                            )}
                                            {executionResult.cloned?.classes !== undefined && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Classes Cloned</span>
                                                    <Badge variant="outline">{executionResult.cloned.classes}</Badge>
                                                </div>
                                            )}
                                            {executionResult.cloned?.subjects !== undefined && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Subjects Cloned</span>
                                                    <Badge variant="outline">{executionResult.cloned.subjects}</Badge>
                                                </div>
                                            )}
                                            {executionResult.cloned?.feeStructures !== undefined && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Fee Structures Cloned</span>
                                                    <Badge variant="outline">{executionResult.cloned.feeStructures}</Badge>
                                                </div>
                                            )}
                                            {executionResult.promotion?.promoted !== undefined && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Students Promoted</span>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        {executionResult.promotion.promoted} / {executionResult.promotion.total}
                                                    </Badge>
                                                </div>
                                            )}
                                            {executionResult.promotion?.alumni > 0 && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Marked as Alumni</span>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {executionResult.promotion.alumni}
                                                    </Badge>
                                                </div>
                                            )}
                                            {executionResult.promotion?.skipped > 0 && (
                                                <div className="flex justify-between px-4 py-2.5">
                                                    <span className="text-muted-foreground">Skipped</span>
                                                    <Badge variant="outline">{executionResult.promotion.skipped}</Badge>
                                                </div>
                                            )}
                                            {executionResult.cloned?.error && (
                                                <div className="flex justify-between px-4 py-2.5 bg-red-50 dark:bg-red-950/20">
                                                    <span className="text-red-600">Error</span>
                                                    <span className="text-red-600 text-xs max-w-[250px] truncate">
                                                        {executionResult.cloned.error}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center space-y-3 pt-2">
                                        <p className="text-xs text-muted-foreground">
                                            Redirecting to Academic Years in a few seconds...
                                        </p>
                                        <Button
                                            onClick={() => {
                                                window.location.href = "/dashboard/schools/academic-years";
                                            }}
                                        >
                                            Go to Academic Years
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            {!executionResult && (
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                        disabled={currentStep === 1 || executing}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    {currentStep < 6 && (
                        <Button
                            onClick={() => setCurrentStep(s => Math.min(6, s + 1))}
                            disabled={!canProceed() || executing}
                        >
                            Next
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
