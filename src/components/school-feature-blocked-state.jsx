"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SchoolFeatureBlockedState({ feature, plan }) {
    if (!feature) {
        return null;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/10">
                <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                            {plan}
                        </Badge>
                        <Badge variant="outline">Plan Restricted</Badge>
                    </div>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-amber-600" />
                        {feature.label} is not enabled for this school
                    </CardTitle>
                    <CardDescription className="text-sm text-amber-900/80 dark:text-amber-200/80">
                        {feature.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {feature.dependencies?.length > 0 && (
                        <div className="rounded-lg border border-amber-200/80 bg-background/80 p-4 dark:border-amber-900/40">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                                <div>
                                    <p className="text-sm font-medium">Dependencies for this module</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {feature.dependencies.join(", ")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/dashboard">
                                Back to Dashboard
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
