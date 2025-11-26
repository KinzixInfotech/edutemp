"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function FormSubmissionsPage({ params }) {
    const { formId } = React.use(params);
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    // Fetch Form Details
    const { data: form, isLoading: formLoading } = useQuery({
        queryKey: ["form", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}`);
            return res.data;
        },
        enabled: !!schoolId && !!formId,
    });

    // Fetch Submissions
    const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
        queryKey: ["form-submissions", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}/submissions`);
            return res.data;
        },
        enabled: !!schoolId && !!formId,
    });

    const exportToCSV = () => {
        if (!submissions.length) return;

        // Get all unique keys from data
        const dataKeys = Array.from(new Set(submissions.flatMap(s => Object.keys(s.data || {}))));

        const headers = ["ID", "Name", "Email", "Submitted At", ...dataKeys];
        const csvContent = [
            headers.join(","),
            ...submissions.map(s => {
                const row = [
                    s.id,
                    `"${s.applicantName}"`,
                    s.applicantEmail,
                    format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm:ss"),
                    ...dataKeys.map(key => `"${s.data[key] || ""}"`)
                ];
                return row.join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${form?.title || "submissions"}_export.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (formLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/forms">
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{form?.title} - Submissions</h1>
                        <p className="text-muted-foreground">Total Submissions: {submissions.length}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={exportToCSV} disabled={!submissions.length}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Submitted At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissionsLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto animate-spin" /></TableCell>
                            </TableRow>
                        ) : submissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No submissions yet.</TableCell>
                            </TableRow>
                        ) : (
                            submissions.map((sub, index) => (
                                <TableRow key={sub.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{sub.applicantName}</TableCell>
                                    <TableCell>{sub.applicantEmail}</TableCell>
                                    <TableCell>{format(new Date(sub.submittedAt), "MMM d, yyyy HH:mm")}</TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(sub)}>View Data</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Submission Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Applicant</p>
                                                            <p className="font-medium">{sub.applicantName}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Email</p>
                                                            <p className="font-medium">{sub.applicantEmail}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Submitted At</p>
                                                            <p className="font-medium">{format(new Date(sub.submittedAt), "PPpp")}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold mb-2">Form Data</h3>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {Object.entries(sub.data || {}).map(([key, value]) => (
                                                                <div key={key} className="bg-muted p-3 rounded-md">
                                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{key}</p>
                                                                    <p className="text-sm whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value) : value}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
