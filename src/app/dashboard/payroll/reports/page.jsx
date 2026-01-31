"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    FileText,
    Download,
    Shield,
    Users,
    Calendar,
    Loader2,
    FileSpreadsheet,
    Building2
} from "lucide-react";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const reports = [
    {
        id: "pf",
        title: "PF Report",
        description: "Provident Fund contribution details (Employee + Employer)",
        icon: Shield,
        endpoint: "pf",
        color: "bg-green-500/10 text-green-500",
        tooltip: "Generate PF report for EPFO filing"
    },
    {
        id: "esi",
        title: "ESI Report",
        description: "Employee State Insurance details for eligible employees",
        icon: Shield,
        endpoint: "esi",
        color: "bg-purple-500/10 text-purple-500",
        tooltip: "ESI applies to employees earning ≤₹21,000/month"
    },
    {
        id: "monthly-summary",
        title: "Monthly Summary",
        description: "Complete payroll summary with all earnings & deductions",
        icon: Calendar,
        endpoint: "monthly-summary",
        color: "bg-blue-500/10 text-blue-500",
        tooltip: "Full breakdown of all salary components"
    },
    {
        id: "bank-transfer",
        title: "Bank Transfer Sheet",
        description: "Bank account details for salary transfers",
        icon: Building2,
        endpoint: "bank-transfer",
        color: "bg-orange-500/10 text-orange-500",
        tooltip: "Export for bank bulk transfer upload"
    },
    {
        id: "employees",
        title: "Employee Master",
        description: "All employees with payroll profile details",
        icon: Users,
        endpoint: "employees",
        color: "bg-pink-500/10 text-pink-500",
        tooltip: "Export employee master with bank & ID details"
    },
    {
        id: "deductions",
        title: "Deductions Summary",
        description: "All deductions breakdown by employee",
        icon: FileText,
        endpoint: "deductions",
        color: "bg-cyan-500/10 text-cyan-500",
        tooltip: "PF, ESI, PT, TDS, Loans, LOP breakdown"
    },
];

export default function PayrollReports() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [loading, setLoading] = useState({});

    const handleDownload = async (report, format = 'csv') => {
        const key = `${report.id}-${format}`;
        setLoading(prev => ({ ...prev, [key]: true }));

        try {
            let url;

            // Build URL based on report type
            if (['pf', 'esi', 'monthly-summary'].includes(report.id)) {
                url = `/api/schools/${schoolId}/payroll/reports/${report.endpoint}?month=${selectedMonth}&year=${selectedYear}&format=${format}`;
            } else if (report.id === 'bank-transfer') {
                // Bank transfer uses the period endpoint
                const periodRes = await fetch(`/api/schools/${schoolId}/payroll/periods?month=${selectedMonth}&year=${selectedYear}`);
                const periodData = await periodRes.json();
                if (!periodData.periods || periodData.periods.length === 0) {
                    throw new Error('No payroll period found for selected month');
                }
                url = `/api/schools/${schoolId}/payroll/periods/${periodData.periods[0].id}/bank-slip?format=csv`;
            } else if (report.id === 'employees') {
                url = `/api/schools/${schoolId}/payroll/exports/employees?format=${format}`;
            } else if (report.id === 'deductions') {
                url = `/api/schools/${schoolId}/payroll/exports/deductions?month=${selectedMonth}&year=${selectedYear}&format=${format}`;
            } else {
                url = `/api/schools/${schoolId}/payroll/reports/${report.endpoint}?month=${selectedMonth}&year=${selectedYear}&format=${format}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            const monthName = months.find(m => m.value === selectedMonth)?.label;
            a.download = `${report.title.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(`${report.title} downloaded successfully`);
        } catch (error) {
            toast.error(error.message || 'Failed to download report');
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const selectedMonthName = months.find(m => m.value === selectedMonth)?.label;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Payroll Reports</h1>
                    <p className="text-muted-foreground">Generate statutory and management reports</p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                    {month.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Selected Period Badge */}
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm py-1.5 px-3">
                    <Calendar className="h-4 w-4 mr-2" />
                    Generating reports for: <strong className="ml-1">{selectedMonthName} {selectedYear}</strong>
                </Badge>
            </div>

            {/* Statutory Reports */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Statutory Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.slice(0, 3).map((report) => {
                        const Icon = report.icon;
                        const isLoadingCsv = loading[`${report.id}-csv`];
                        return (
                            <Card key={report.id} className="border bg-white dark:bg-muted hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-lg ${report.color}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base">{report.title}</CardTitle>
                                            <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleDownload(report, 'csv')}
                                        disabled={isLoadingCsv}
                                    >
                                        {isLoadingCsv ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        )}
                                        Download CSV
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Export Reports */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5 text-blue-500" />
                    Export Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.slice(3).map((report) => {
                        const Icon = report.icon;
                        const isLoadingCsv = loading[`${report.id}-csv`];
                        return (
                            <Card key={report.id} className="border bg-white dark:bg-muted hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-lg ${report.color}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base">{report.title}</CardTitle>
                                            <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleDownload(report, 'csv')}
                                        disabled={isLoadingCsv}
                                    >
                                        {isLoadingCsv ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        )}
                                        Download CSV
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Info Card */}
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium">About Payroll Reports</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <strong>PF Report:</strong> Generate for EPFO monthly ECR filing</li>
                                <li>• <strong>ESI Report:</strong> For ESIC portal submission (employees ≤₹21,000)</li>
                                <li>• <strong>Monthly Summary:</strong> Complete payroll breakdown for records</li>
                                <li>• <strong>Bank Transfer:</strong> Upload directly to your bank portal for bulk salary transfer</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Tip: Make sure payroll for the selected month is <strong>Approved</strong> before generating statutory reports.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
