// app/admissions/enrolled.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchEnrolledApplications(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}&stageId=enrolled-id`); // Assume stage id
    if (!response.ok) throw new Error("Failed to fetch enrolled");
    return response.json();
}

async function assignClass(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to assign");
    return response.json();
}

export default function Enrolled() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;
    const [classAssignments, setClassAssignments] = useState({});

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["enrolledApplications", schoolId],
        queryFn: () => fetchEnrolledApplications(schoolId),
        enabled: !!schoolId,
    });

    const assignMutation = useMutation({
        mutationFn: assignClass,
        onSuccess: () => {
            queryClient.invalidateQueries(["enrolledApplications"]);
            toast.success("Class assigned");
        },
        onError: () => toast.error("Failed to assign"),
    });

    const handleAssign = (id) => {
        assignMutation.mutate({ id, stageId: "enrolled-id", movedById, notes: `Assigned to class ${classAssignments[id]}` });
    };

    const handleChange = (id, val) => {
        setClassAssignments({ ...classAssignments, [id]: val });
    };

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
                            <TableHead>Assign Class/Roll</TableHead>
                            <TableHead>Actions</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : applications.length > 0 ? (
                            applications.map((app, index) => (
                                <TableRow key={app.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{app.applicantName}</TableCell>
                                    <TableCell>{app.applicantEmail}</TableCell>
                                    <TableCell>
                                        <Select onValueChange={(val) => handleChange(app.id, val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="class1">Class 1</SelectItem>
                                                <SelectItem value="class2">Class 2</SelectItem>
                                                {/* Add more classes */}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleAssign(app.id)}>Assign</Button>
                                        <Button size="sm" variant="outline">View Profile</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No enrolled students.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}