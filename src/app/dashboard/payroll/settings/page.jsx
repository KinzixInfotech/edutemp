"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    RefreshCw,
    Save,
    Settings,
    Wallet,
    Shield,
    Clock
} from "lucide-react";
import { toast } from "sonner";

export default function PayrollSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // Fetch config
    const { data: config, isLoading, refetch } = useQuery({
        queryKey: ["payroll-config", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/config`);
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Update config
    const updateConfig = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/config`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update config");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Settings saved successfully");
            queryClient.invalidateQueries(["payroll-config"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        updateConfig.mutate({
            payCycleDay: parseInt(formData.get("payCycleDay")) || 1,
            paymentDay: parseInt(formData.get("paymentDay")) || 7,
            standardWorkingDays: parseInt(formData.get("standardWorkingDays")) || 26,
            standardWorkingHours: parseFloat(formData.get("standardWorkingHours")) || 8,
            enablePF: formData.get("enablePF") === "on",
            pfEmployerPercent: parseFloat(formData.get("pfEmployerPercent")) || 12,
            pfEmployeePercent: parseFloat(formData.get("pfEmployeePercent")) || 12,
            pfWageLimit: parseFloat(formData.get("pfWageLimit")) || 15000,
            enableESI: formData.get("enableESI") === "on",
            esiEmployerPercent: parseFloat(formData.get("esiEmployerPercent")) || 3.25,
            esiEmployeePercent: parseFloat(formData.get("esiEmployeePercent")) || 0.75,
            esiWageLimit: parseFloat(formData.get("esiWageLimit")) || 21000,
            enableProfessionalTax: formData.get("enableProfessionalTax") === "on",
            enableTDS: formData.get("enableTDS") === "on",
            enableLeaveEncashment: formData.get("enableLeaveEncashment") === "on",
            leaveEncashmentRate: parseFloat(formData.get("leaveEncashmentRate")) || null,
            enableOvertime: formData.get("enableOvertime") === "on",
            overtimeRate: parseFloat(formData.get("overtimeRate")) || 1.5,
            lateGraceMinutes: parseInt(formData.get("lateGraceMinutes")) || 15,
            halfDayThreshold: parseFloat(formData.get("halfDayThreshold")) || 4,
            // Loan & Advance Settings
            enableLoanApplications: formData.get("enableLoanApplications") === "on",
            enableSalaryAdvanceApplications: formData.get("enableSalaryAdvanceApplications") === "on",
            maxLoanAmount: parseFloat(formData.get("maxLoanAmount")) || null,
            maxAdvancePercent: parseFloat(formData.get("maxAdvancePercent")) || 50,
            // Automation Settings
            autoSyncNewStaff: formData.get("autoSyncNewStaff") === "on",
            requireDirectorApproval: formData.get("requireDirectorApproval") === "on",
        });
    };

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Payroll Settings</h1>
                    <p className="text-muted-foreground">Configure payroll rules and statutory compliance</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="general" className="space-y-6">
                        <TabsList className="bg-muted border">
                            <TabsTrigger value="general">
                                <Settings className="h-4 w-4 mr-2" /> General
                            </TabsTrigger>
                            <TabsTrigger value="statutory">
                                <Shield className="h-4 w-4 mr-2" /> Statutory
                            </TabsTrigger>
                            <TabsTrigger value="attendance">
                                <Clock className="h-4 w-4 mr-2" /> Attendance
                            </TabsTrigger>
                            <TabsTrigger value="loans">
                                <Wallet className="h-4 w-4 mr-2" /> Loans & Automation
                            </TabsTrigger>
                        </TabsList>

                        {/* General Settings */}
                        <TabsContent value="general">
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <CardTitle>Pay Cycle</CardTitle>
                                    <CardDescription>Configure your monthly payroll cycle</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Pay Cycle Day</Label>
                                            <Input
                                                name="payCycleDay"
                                                type="number"
                                                min="1"
                                                max="28"
                                                defaultValue={config?.payCycleDay || 1}
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Day of month to run payroll (1-28)</p>
                                        </div>
                                        <div>
                                            <Label>Payment Day</Label>
                                            <Input
                                                name="paymentDay"
                                                type="number"
                                                min="1"
                                                max="28"
                                                defaultValue={config?.paymentDay || 7}
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Day of month salaries are credited</p>
                                        </div>
                                        <div>
                                            <Label>Standard Working Days</Label>
                                            <Input
                                                name="standardWorkingDays"
                                                type="number"
                                                defaultValue={config?.standardWorkingDays || 26}
                                            />
                                        </div>
                                        <div>
                                            <Label>Standard Working Hours</Label>
                                            <Input
                                                name="standardWorkingHours"
                                                type="number"
                                                step="0.5"
                                                defaultValue={config?.standardWorkingHours || 8}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Statutory Settings */}
                        <TabsContent value="statutory" className="space-y-6">
                            {/* PF Settings */}
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Provident Fund (PF)</CardTitle>
                                            <CardDescription>Employee Provident Fund configuration</CardDescription>
                                        </div>
                                        <Switch name="enablePF" defaultChecked={config?.enablePF} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label>Employer Contribution %</Label>
                                            <Input
                                                name="pfEmployerPercent"
                                                type="number"
                                                step="0.01"
                                                defaultValue={config?.pfEmployerPercent || 12}
                                            />
                                        </div>
                                        <div>
                                            <Label>Employee Contribution %</Label>
                                            <Input
                                                name="pfEmployeePercent"
                                                type="number"
                                                step="0.01"
                                                defaultValue={config?.pfEmployeePercent || 12}
                                            />
                                        </div>
                                        <div>
                                            <Label>Basic Wage Limit (₹)</Label>
                                            <Input
                                                name="pfWageLimit"
                                                type="number"
                                                defaultValue={config?.pfWageLimit || 15000}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ESI Settings */}
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Employee State Insurance (ESI)</CardTitle>
                                            <CardDescription>ESI contribution configuration</CardDescription>
                                        </div>
                                        <Switch name="enableESI" defaultChecked={config?.enableESI} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label>Employer Contribution %</Label>
                                            <Input
                                                name="esiEmployerPercent"
                                                type="number"
                                                step="0.01"
                                                defaultValue={config?.esiEmployerPercent || 3.25}
                                            />
                                        </div>
                                        <div>
                                            <Label>Employee Contribution %</Label>
                                            <Input
                                                name="esiEmployeePercent"
                                                type="number"
                                                step="0.01"
                                                defaultValue={config?.esiEmployeePercent || 0.75}
                                            />
                                        </div>
                                        <div>
                                            <Label>Gross Wage Limit (₹)</Label>
                                            <Input
                                                name="esiWageLimit"
                                                type="number"
                                                defaultValue={config?.esiWageLimit || 21000}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Other Statutory */}
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <CardTitle>Other Deductions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Professional Tax</p>
                                            <p className="text-sm text-muted-foreground">State-wise professional tax deduction</p>
                                        </div>
                                        <Switch name="enableProfessionalTax" defaultChecked={config?.enableProfessionalTax} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">TDS (Income Tax)</p>
                                            <p className="text-sm text-muted-foreground">Tax Deducted at Source</p>
                                        </div>
                                        <Switch name="enableTDS" defaultChecked={config?.enableTDS} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Attendance Settings */}
                        <TabsContent value="attendance" className="space-y-6">
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <CardTitle>Attendance Rules</CardTitle>
                                    <CardDescription>Configure attendance-based payroll rules</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Late Grace Period (minutes)</Label>
                                            <Input
                                                name="lateGraceMinutes"
                                                type="number"
                                                defaultValue={config?.lateGraceMinutes || 15}
                                            />
                                        </div>
                                        <div>
                                            <Label>Half Day Threshold (hours)</Label>
                                            <Input
                                                name="halfDayThreshold"
                                                type="number"
                                                step="0.5"
                                                defaultValue={config?.halfDayThreshold || 4}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Overtime</CardTitle>
                                            <CardDescription>Configure overtime calculation</CardDescription>
                                        </div>
                                        <Switch name="enableOvertime" defaultChecked={config?.enableOvertime} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label>Overtime Rate (multiplier)</Label>
                                        <Input
                                            name="overtimeRate"
                                            type="number"
                                            step="0.1"
                                            defaultValue={config?.overtimeRate || 1.5}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">e.g., 1.5 = 150% of regular rate</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Leave Encashment</CardTitle>
                                            <CardDescription>Allow encashment of unused leaves</CardDescription>
                                        </div>
                                        <Switch name="enableLeaveEncashment" defaultChecked={config?.enableLeaveEncashment} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label>Daily Encashment Rate (₹)</Label>
                                        <Input
                                            name="leaveEncashmentRate"
                                            type="number"
                                            placeholder="Per day rate"
                                            defaultValue={config?.leaveEncashmentRate || ""}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Loans & Automation Settings */}
                        <TabsContent value="loans" className="space-y-6">
                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <CardTitle>Loan & Advance Settings</CardTitle>
                                    <CardDescription>Configure employee loan and salary advance options</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Enable Loan Applications</p>
                                            <p className="text-sm text-muted-foreground">Allow teachers to apply for loans through the app</p>
                                        </div>
                                        <Switch name="enableLoanApplications" defaultChecked={config?.enableLoanApplications} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Enable Salary Advance</p>
                                            <p className="text-sm text-muted-foreground">Allow teachers to request salary advances</p>
                                        </div>
                                        <Switch name="enableSalaryAdvanceApplications" defaultChecked={config?.enableSalaryAdvanceApplications} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                        <div>
                                            <Label>Maximum Loan Amount (₹)</Label>
                                            <Input
                                                name="maxLoanAmount"
                                                type="number"
                                                placeholder="No limit"
                                                defaultValue={config?.maxLoanAmount || ""}
                                            />
                                        </div>
                                        <div>
                                            <Label>Max Advance (% of Salary)</Label>
                                            <Input
                                                name="maxAdvancePercent"
                                                type="number"
                                                defaultValue={config?.maxAdvancePercent || 50}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border bg-white dark:bg-muted">
                                <CardHeader>
                                    <CardTitle>Automation Settings</CardTitle>
                                    <CardDescription>Configure payroll automation and approval workflows</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Auto-Sync New Staff</p>
                                            <p className="text-sm text-muted-foreground">Automatically add new staff to payroll system</p>
                                        </div>
                                        <Switch name="autoSyncNewStaff" defaultChecked={config?.autoSyncNewStaff ?? true} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Require Director Approval</p>
                                            <p className="text-sm text-muted-foreground">Director must approve payroll before payment</p>
                                        </div>
                                        <Switch name="requireDirectorApproval" defaultChecked={config?.requireDirectorApproval} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end mt-6">
                        <Button type="submit" disabled={updateConfig.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {updateConfig.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
