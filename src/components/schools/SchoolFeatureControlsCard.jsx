"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Layers3, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
    PLAN_BILLING,
    previewFeatureUpdate,
    resolveFeatureState,
    SCHOOL_FEATURE_PLAN,
} from "@/lib/school-feature-config";

function groupFeaturesByCategory(features) {
    return features.reduce((groups, feature) => {
        const current = groups.get(feature.category) || [];
        current.push(feature);
        groups.set(feature.category, current);
        return groups;
    }, new Map());
}

export default function SchoolFeatureControlsCard({ schoolId }) {
    const queryClient = useQueryClient();
    const [draftPlan, setDraftPlan] = useState(null);
    const [draftOverrides, setDraftOverrides] = useState(null);
    const [lastImpact, setLastImpact] = useState(null);

    const featureQuery = useQuery({
        queryKey: ["school-feature-controls", schoolId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/admin/schools/${schoolId}/features`);
            if (!res.ok) {
                throw new Error("Failed to load feature controls");
            }
            return res.json();
        },
    });

    const activePlan = draftPlan ?? featureQuery.data?.plan ?? SCHOOL_FEATURE_PLAN.BASE;
    const activeOverrides = useMemo(
        () => draftOverrides ?? featureQuery.data?.overrides ?? { enabled: [], disabled: [] },
        [draftOverrides, featureQuery.data?.overrides],
    );

    const resolvedState = useMemo(() => resolveFeatureState({
        plan: activePlan,
        overrides: activeOverrides,
    }), [activeOverrides, activePlan]);

    const groupedFeatures = useMemo(
        () => groupFeaturesByCategory(resolvedState.features),
        [resolvedState.features],
    );

    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetchWithAuth(`/api/admin/schools/${schoolId}/features`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    plan: activePlan,
                    overrides: activeOverrides,
                }),
            });

            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.error || "Failed to update feature controls");
            }

            return payload;
        },
        onSuccess: (payload) => {
            toast.success(payload.message || "Feature controls updated.");
            queryClient.invalidateQueries(["school-feature-controls", schoolId]);
            queryClient.invalidateQueries(["school", schoolId]);
            queryClient.invalidateQueries(["school-stats", schoolId]);
            setDraftPlan(null);
            setDraftOverrides(null);
            setLastImpact({
                type: "saved",
                message: "Plan and module access saved successfully.",
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handlePlanChange = (nextPlan) => {
        const preview = previewFeatureUpdate({
            plan: activePlan,
            overrides: activeOverrides,
            action: "change_plan",
            nextPlan,
        });

        setDraftPlan(nextPlan);
        setLastImpact({
            type: "plan",
            enabled: preview.enabledByChange,
            disabled: preview.disabledByChange,
            message: `Plan switched to ${nextPlan}.`,
        });
    };

    const handleFeatureToggle = (featureKey, enabled) => {
        const preview = previewFeatureUpdate({
            plan: activePlan,
            overrides: activeOverrides,
            action: enabled ? "enable" : "disable",
            featureKey,
        });

        if (!preview.valid) {
            toast.error("This module cannot be enabled yet.", {
                description: preview.missingDependencies?.length
                    ? `Enable these first: ${preview.missingDependencies.join(", ")}`
                    : preview.reason,
            });
            return;
        }

        setDraftOverrides(preview.nextOverrides);
        setLastImpact({
            type: enabled ? "enable" : "disable",
            cascadedDisables: preview.cascadedDisables,
            enabledFeature: enabled ? featureKey : null,
            message: enabled
                ? "Module enabled."
                : preview.cascadedDisables.length > 1
                    ? `Disabling this module also disabled ${preview.cascadedDisables.length - 1} dependent module(s).`
                    : "Module disabled.",
        });
    };

    if (featureQuery.isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Plan & Feature Controls</CardTitle>
                    <CardDescription>Loading school plan configuration...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-56 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (featureQuery.isError) {
        return (
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle>Plan & Feature Controls</CardTitle>
                    <CardDescription>Could not load the feature configuration for this school.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const billing = {
        pricePerStudent: PLAN_BILLING[activePlan].pricePerStudent,
        activeStudentCount: featureQuery.data?.billing?.activeStudentCount || 0,
        yearlyAmount: (featureQuery.data?.billing?.activeStudentCount || 0) * PLAN_BILLING[activePlan].pricePerStudent,
    };

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Layers3 className="h-5 w-5 text-blue-600" />
                            Plan & Feature Controls
                        </CardTitle>
                        <CardDescription>
                            Base plan defaults, per-school overrides, dependency-safe toggles, and billing alignment.
                        </CardDescription>
                    </div>
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? "Saving..." : "Save Controls"}
                    </Button>
                </div>

                <div className="rounded-xl border bg-muted/40 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">School plan</p>
                            <p className="text-sm text-muted-foreground">
                                Pricing updates immediately from the active student count.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Select value={activePlan} onValueChange={handlePlanChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={SCHOOL_FEATURE_PLAN.BASE}>BASE</SelectItem>
                                    <SelectItem value={SCHOOL_FEATURE_PLAN.PRO}>PRO</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="rounded-lg border bg-background px-4 py-3 text-sm">
                                <p className="font-medium">₹{billing.pricePerStudent} / student / year</p>
                                <p className="text-muted-foreground">
                                    {billing.activeStudentCount} active students = ₹{billing.yearlyAmount.toLocaleString("en-IN")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {lastImpact && (
                    <div className={`rounded-lg border p-4 text-sm ${lastImpact.type === "disable" ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/10" : "border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/10"}`}>
                        <div className="flex items-start gap-3">
                            {lastImpact.type === "disable" ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                            ) : (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                            )}
                            <div className="space-y-1">
                                <p className="font-medium">{lastImpact.message}</p>
                                {lastImpact.disabled?.length > 0 && (
                                    <p className="text-muted-foreground">
                                        No longer included: {lastImpact.disabled.join(", ")}
                                    </p>
                                )}
                                {lastImpact.enabled?.length > 0 && (
                                    <p className="text-muted-foreground">
                                        Newly included: {lastImpact.enabled.join(", ")}
                                    </p>
                                )}
                                {lastImpact.cascadedDisables?.length > 1 && (
                                    <p className="text-muted-foreground">
                                        Cascaded disables: {lastImpact.cascadedDisables.join(", ")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-6">
                {Array.from(groupedFeatures.entries()).map(([category, features]) => (
                    <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">{category}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {features.filter((feature) => feature.enabled).length} of {features.length} enabled
                                </p>
                            </div>
                            <Badge variant="outline">{category}</Badge>
                        </div>
                        <div className="overflow-hidden rounded-xl border">
                            {features.map((feature) => (
                                <div
                                    key={feature.key}
                                    className="flex flex-col gap-4 border-b bg-background px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{feature.label}</p>
                                            <Badge variant={feature.enabled ? "default" : "secondary"}>
                                                {feature.enabled ? "Enabled" : "Disabled"}
                                            </Badge>
                                            {feature.source === "override_enabled" && (
                                                <Badge variant="outline">Override On</Badge>
                                            )}
                                            {feature.source === "override_disabled" && (
                                                <Badge variant="outline">Override Off</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                        {feature.dependencies.length > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Depends on: {feature.dependencies.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 md:min-w-[170px] md:justify-end">
                                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                            Feature Flag
                                        </span>
                                        <Switch
                                            checked={feature.enabled}
                                            onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Separator />
                    </div>
                ))}

                <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium">Dependency policy</p>
                            <p className="text-muted-foreground">
                                A feature cannot be enabled while one of its prerequisites is disabled. Disabling a base module automatically disables every dependent module so the school never lands in a broken combination.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
