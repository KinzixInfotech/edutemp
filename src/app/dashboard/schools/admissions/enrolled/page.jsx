// app/admissions/enrolled.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";

async function fetchEnrolledApplications(schoolId) {
    const response = await fetch(`/api/schools/${schoolId}/admissions/applications?stageId=Enrolled`);
    if (!response.ok) throw new Error("Failed to fetch enrolled");
    return response.json();
}

export default function Enrolled() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["enrolledApplications", schoolId],
        queryFn: () => fetchEnrolledApplications(schoolId),
        enabled: !!schoolId,
    });

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Enrolled Students</h2>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Admission No</TableHead>
                            <TableHead>Class & Section</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead>Enrollment Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : applications.length > 0 ? (
                            applications.map((app, index) => (
                                <TableRow key={app.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{app.applicantName}</TableCell>
                                    <TableCell>{app.applicantEmail}</TableCell>
                                    <TableCell>
                                        <span className="font-mono font-medium">
                                            {app.studentDetails?.admissionNo || "Not Assigned"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {app.studentDetails?.className && app.studentDetails?.sectionName
                                            ? `${app.studentDetails.className} - ${app.studentDetails.sectionName}`
                                            : "Not Assigned"}
                                    </TableCell>
                                    <TableCell>
                                        {app.studentDetails?.rollNumber || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {app.studentDetails?.admissionDate
                                            ? new Date(app.studentDetails.admissionDate).toLocaleDateString('en-IN')
                                            : "N/A"}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">No enrolled students.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}