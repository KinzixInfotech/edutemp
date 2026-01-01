"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    Circle,
    Users,
    IndianRupee,
    BookOpen,
    Calendar,
    BookMarked,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Copy,
    Settings2,
    Clock,
    GraduationCap,
    ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAcademicYear, formatAcademicDate } from "@/hooks/useAcademicYear";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const setupSteps = [
    {
        id: "classesConfigured",
        title: "Class Teachers",
        description: "Assign class teachers/incharges for each class & section",
        icon: Users,
        href: "/dashboard/schools/create-classes",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        cloneSupported: true,
        cloneEndpoint: "/api/schools/academic-years/clone/class-teachers",
        cloneLabel: "Clone Teacher Assignments",
    },
    {
        id: "studentsPromoted",
        title: "Student Promotion",
        description: "Promote students from the previous academic year",
        icon: GraduationCap,
        href: "/dashboard/schools/academic/promotion",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        cloneSupported: false,
    },
    {
        id: "feesConfigured",
        title: "Fee Structure",
        description: "Set up fee structures, particulars, and installment plans",
        icon: IndianRupee,
        href: "/dashboard/fees/manage-fee-structure",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        cloneSupported: true,
        cloneEndpoint: "/api/schools/academic-years/clone/fees",
        cloneLabel: "Clone Fee Structures",
    },
    {
        id: "subjectsConfigured",
        title: "Subjects & Teachers",
        description: "Map subjects and assign teachers to classes",
        icon: BookOpen,
        href: "/dashboard/schools/academic/subjects",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-500/10",
        cloneSupported: true,
        cloneEndpoint: "/api/schools/academic-years/clone/subjects",
        cloneLabel: "Clone Subjects & Teachers",
    },
    {
        id: "timetableConfigured",
        title: "Timetable",
        description: "Create weekly timetables for all classes",
        icon: Calendar,
        href: "/dashboard/schools/timetable",
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-500/10",
        cloneSupported: false, // Timetable cloning is complex, usually better to start fresh or separate tool
    },
];

export default function AcademicYearSetupPage() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { activeYear, runningYear, previousYear, isPreStart, yearsDiffer, isLoading: contextLoading } = useAcademicYear();

    const [cloningStep, setCloningStep] = useState(null);
    const [selectedCloneYear, setSelectedCloneYear] = useState(null);
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [includeTeachers, setIncludeTeachers] = useState(false);

    // Fetch all academic years for selection
    const { data: allYears = [] } = useQuery({
        queryKey: ["academicYears", fullUser?.schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser?.schoolId}`);
            if (!res.ok) throw new Error("Failed to fetch years");
            return res.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    // Filter potential source years (exclude active year, and generally only look at past years)
    const cloneSourceYears = allYears.filter(y =>
        y.id !== activeYear?.id &&
        new Date(y.startDate) < new Date(activeYear?.startDate)
    );

    const markStepCompleteMutation = useMutation({
        mutationFn: async ({ stepId, value }) => {
            if (!activeYear?.id) return;
            const res = await fetch(`/api/schools/academic-years/${activeYear.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [stepId]: value }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["academic-years-context"]);
            queryClient.invalidateQueries(["active-academic-year"]);
            toast.success("Progress updated");
        },
    });

    const cloneMutation = useMutation({
        mutationFn: async ({ endpoint, stepId, extraBody = {} }) => {
            // Use selected year or fallback to previous year
            const sourceYear = selectedCloneYear || previousYear;
            if (!activeYear?.id || !sourceYear?.id) {
                throw new Error("Please select a source year to clone from");
            }
            setCloningStep(stepId);
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromYearId: sourceYear.id,
                    toYearId: activeYear.id,
                    schoolId: fullUser?.schoolId,
                    ...extraBody
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Clone failed");
            }
            return res.json();
        },
        onSuccess: (data, { stepId }) => {
            toast.success(`Successfully cloned! ${data.message || ''}`);
            // Mark step as complete
            markStepCompleteMutation.mutate({ stepId, value: true });
            setCloningStep(null);
            setShowCloneDialog(false);
        },
        onError: (error) => {
            toast.error(error.message || "Clone failed");
            setCloningStep(null);
        },
    });

    const markAllCompleteMutation = useMutation({
        mutationFn: async () => {
            if (!activeYear?.id) return;
            const res = await fetch(`/api/schools/academic-years/${activeYear.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setupComplete: true,
                    classesConfigured: true,
                    studentsPromoted: true,
                    feesConfigured: true,
                    subjectsConfigured: true,
                    timetableConfigured: true,
                }),
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Academic year setup marked as complete!");
            queryClient.invalidateQueries(["academic-years-context"]);
            queryClient.invalidateQueries(["active-academic-year"]);
            router.push("/dashboard");
        },
    });

    const completedSteps = setupSteps.filter(step => activeYear?.[step.id] === true).length;
    const totalSteps = setupSteps.length;
    const progressPercent = (completedSteps / totalSteps) * 100;

    if (contextLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!activeYear) {
        return (
            <div className="p-6">
                <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-6 flex items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-amber-600" />
                        <div>
                            <h3 className="font-semibold">No Active Academic Year</h3>
                            <p className="text-sm text-muted-foreground">
                                Please activate an academic year first.
                            </p>
                        </div>
                        <Link href="/dashboard/schools/academic-years" className="ml-auto">
                            <Button>Manage Academic Years</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleCloneClick = (step) => {
        if (step.id === 'subjectsConfigured') {
            setShowCloneDialog(true);
        } else {
            cloneMutation.mutate({
                endpoint: step.cloneEndpoint,
                stepId: step.id
            });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Academic Year Setup</h1>
                <p className="text-muted-foreground">
                    Configure <strong>{activeYear.name}</strong> for the new session
                </p>
            </div>

            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Active Year Card */}
                <Card className={cn(
                    "border-2",
                    isPreStart ? "border-indigo-500/30 bg-indigo-500/5" : "border-green-500/30 bg-green-500/5"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center",
                                isPreStart ? "bg-indigo-500/10" : "bg-green-500/10"
                            )}>
                                <Settings2 className={cn(
                                    "h-5 w-5",
                                    isPreStart ? "text-indigo-600" : "text-green-600"
                                )} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Active Year (Configuring)
                                </p>
                                <p className="text-lg font-bold">{activeYear.name}</p>
                                {isPreStart && (
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Starts {formatAcademicDate(activeYear.startDate)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Running Year Card */}
                {yearsDiffer && runningYear && (
                    <Card className="border-2 border-blue-500/30 bg-blue-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <ClipboardList className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Running Year (Operations)
                                    </p>
                                    <p className="text-lg font-bold">{runningYear.name}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        Attendance & daily work here
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Clone From Previous Year Info */}
            {previousYear && (
                <Card className="border-dashed">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Copy className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">Clone data from previous year</p>
                            <p className="text-xs text-muted-foreground">
                                You can quickly copy configurations from <strong>{previousYear.name}</strong>
                            </p>
                        </div>
                        <Badge variant="outline">{previousYear.name}</Badge>
                    </CardContent>
                </Card>
            )}

            {/* Progress Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-lg">Setup Progress</h3>
                            <p className="text-sm text-muted-foreground">
                                {completedSteps} of {totalSteps} steps completed
                            </p>
                        </div>
                        <Badge
                            variant={activeYear.setupComplete ? "default" : "secondary"}
                            className={activeYear.setupComplete ? "bg-green-500" : ""}
                        >
                            {activeYear.setupComplete ? "Complete" : "In Progress"}
                        </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Clone Source Selector */}
            <Card className="border-blue-500/30 bg-blue-500/5">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Copy className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-medium text-sm">Clone From Year</p>
                                <p className="text-xs text-muted-foreground">
                                    Select which academic year to copy settings from
                                </p>
                            </div>
                        </div>
                        {cloneSourceYears.length > 0 ? (
                            <Select
                                value={selectedCloneYear?.id || previousYear?.id || ""}
                                onValueChange={(val) => {
                                    const year = cloneSourceYears.find(y => y.id === val);
                                    setSelectedCloneYear(year);
                                }}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select source year..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cloneSourceYears.map(year => (
                                        <SelectItem key={year.id} value={year.id}>
                                            {year.name} {year.id === previousYear?.id && "(Previous)"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="secondary">No other years available</Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Setup Steps */}
            <div className="space-y-3">
                {setupSteps.map((step, index) => {
                    const isComplete = activeYear[step.id] === true;
                    const Icon = step.icon;
                    const isCloning = cloningStep === step.id;

                    return (
                        <Card
                            key={step.id}
                            className={cn(
                                "transition-all hover:shadow-md",
                                isComplete && "border-green-500/30 bg-green-500/5"
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
                                        isComplete ? "bg-green-500/10" : step.bgColor
                                    )}>
                                        {isComplete ? (
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        ) : (
                                            <Icon className={cn("h-6 w-6", step.color)} />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                STEP {index + 1}
                                            </span>
                                            {isComplete && (
                                                <Badge variant="outline" className="text-green-600 border-green-500/30 text-xs">
                                                    Done
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="font-semibold">{step.title}</h3>
                                        <p className="text-sm text-muted-foreground">{step.description}</p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                                        {/* Clone Button */}
                                        {step.cloneSupported && cloneSourceYears.length > 0 && !isComplete && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCloneClick(step)}
                                                disabled={isCloning || cloneMutation.isPending}
                                                className="text-xs"
                                            >
                                                {isCloning ? (
                                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                ) : (
                                                    <Copy className="h-3 w-3 mr-1" />
                                                )}
                                                Clone
                                            </Button>
                                        )}

                                        <Link href={step.href}>
                                            <Button size="sm" className="gap-2">
                                                Configure <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Complete Button */}
            <div className="flex justify-end pt-6">
                <Button
                    size="lg"
                    onClick={() => markAllCompleteMutation.mutate()}
                    disabled={activeYear.setupComplete || completedSteps < totalSteps}
                    className={cn(
                        "w-full sm:w-auto",
                        activeYear.setupComplete && "bg-green-600 hover:bg-green-700"
                    )}
                >
                    {activeYear.setupComplete ? (
                        <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Configuration Complete
                        </>
                    ) : (
                        <>
                            Complete Setup <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>

            {/* Dialog for Subject Cloning Options */}
            <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clone Options</DialogTitle>
                        <DialogDescription>
                            Choose what you want to clone from the previous year.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="subjects"
                                checked={true}
                                disabled={true}
                            />
                            <Label htmlFor="subjects">Subjects (Required)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="teachers"
                                checked={includeTeachers}
                                onCheckedChange={setIncludeTeachers}
                            />
                            <Label htmlFor="teachers">Teacher Assignments</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Note: Subjects will be mapped to new classes by name. Teacher assignments will only be copied if the teacher accounts still exist.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloneDialog(false)}>Cancel</Button>
                        <Button onClick={() => cloneMutation.mutate({
                            endpoint: '/api/schools/academic-years/clone/subjects',
                            stepId: 'subjectsConfigured',
                            extraBody: { includeTeachers }
                        })}>
                            Clone Selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
