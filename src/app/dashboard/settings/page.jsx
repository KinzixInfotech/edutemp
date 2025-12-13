"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export default function GeneralSettingsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        admissionNoPrefix: "",
        employeeIdPrefix: "",
    });

    const { data: settings, isLoading } = useQuery({
        queryKey: ["schoolSettings", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/settings`);
            if (!res.ok) throw new Error("Failed to fetch settings");
            return res.json();
        },
        enabled: !!schoolId,
        enabled: !!schoolId,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                admissionNoPrefix: settings.admissionNoPrefix || "",
                employeeIdPrefix: settings.employeeIdPrefix || "",
            });
        }
    }, [settings]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Settings saved successfully");
            queryClient.invalidateQueries(["schoolSettings", schoolId]);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    if (!schoolId) return <div className="p-8">Loading...</div>;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-full mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <SettingsIcon className="h-6 w-6" />
                    General Settings
                </h1>
                <p className="text-muted-foreground">
                    Manage general configuration for your school
                </p>
            </div>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>ID Generation</CardTitle>
                    <CardDescription>
                        Configure prefixes for automatic ID generation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Student Admission Number Prefix</Label>
                            <Input
                                value={formData.admissionNoPrefix}
                                onChange={(e) => setFormData(prev => ({ ...prev, admissionNoPrefix: e.target.value }))}
                                placeholder="e.g. ADM"
                            />
                            <p className="text-xs text-muted-foreground">
                                IDs will be generated like ADM-001, ADM-002, etc.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Employee ID Prefix</Label>
                            <Input
                                value={formData.employeeIdPrefix}
                                onChange={(e) => setFormData(prev => ({ ...prev, employeeIdPrefix: e.target.value }))}
                                placeholder="e.g. EMP"
                            />
                            <p className="text-xs text-muted-foreground">
                                IDs will be generated like EMP-001, EMP-002, etc.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={() => saveMutation.mutate(formData)}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
