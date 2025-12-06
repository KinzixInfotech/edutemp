"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Shield,
    Users,
    Calendar
} from "lucide-react";
import Link from "next/link";

const reports = [
    {
        title: "Salary Register",
        description: "Complete salary details for all employees",
        icon: FileText,
        endpoint: "salary-register",
        color: "bg-blue-500/10 text-blue-500"
    },
    {
        title: "PF Report",
        description: "Provident Fund contribution details",
        icon: Shield,
        endpoint: "pf",
        color: "bg-green-500/10 text-green-500"
    },
    {
        title: "ESI Report",
        description: "Employee State Insurance details",
        icon: Shield,
        endpoint: "esi",
        color: "bg-purple-500/10 text-purple-500"
    },
    {
        title: "TDS Report",
        description: "Tax Deducted at Source summary",
        icon: FileText,
        endpoint: "tds",
        color: "bg-orange-500/10 text-orange-500"
    },
    {
        title: "Department-wise Cost",
        description: "Salary costs grouped by department",
        icon: Users,
        endpoint: "department",
        color: "bg-pink-500/10 text-pink-500"
    },
    {
        title: "Monthly Summary",
        description: "Month-by-month payroll summary",
        icon: Calendar,
        endpoint: "monthly",
        color: "bg-cyan-500/10 text-cyan-500"
    },
];

export default function PayrollReports() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const handleDownload = async (endpoint) => {
        // In a full implementation, this would download the report
        window.open(`/api/schools/${schoolId}/payroll/reports/${endpoint}`, '_blank');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Payroll Reports</h1>
                <p className="text-muted-foreground">Generate and download payroll reports for compliance and analysis</p>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => {
                    const Icon = report.icon;
                    return (
                        <Card key={report.endpoint} className="border bg-white dark:bg-muted hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${report.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{report.title}</CardTitle>
                                        <CardDescription>{report.description}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleDownload(report.endpoint)}
                                >
                                    <Download className="h-4 w-4 mr-2" /> Generate Report
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Info Card */}
            <Card className="bg-muted border-none">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">About Payroll Reports</h3>
                            <p className="text-sm text-muted-foreground">
                                These reports are generated based on processed payroll data. Make sure your payroll for the
                                relevant period is approved before generating reports for statutory compliance. Reports can
                                be downloaded in PDF or Excel format.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
