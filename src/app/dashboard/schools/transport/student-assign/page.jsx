
// app/transport/student-assignments.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

async function fetchAssignments({ schoolId, search }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    const response = await fetch(`/ api / schools / transport / student - routes ? ${params} `);
    if (!response.ok) throw new Error("Failed to fetch assignments");
    return response.json();
}

async function fetchStudents({ schoolId }) {
    const response = await fetch(`/ api / schools / students ? schoolId = ${schoolId} `);
    if (!response.ok) throw new Error("Failed to fetch students");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/ api / schools / transport / routes ? schoolId = ${schoolId} `);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function createAssignment(data) {
    const response = await fetch("/api/schools/transport/student-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create assignment");
    return response.json();
}

async function deleteAssignment(id) {
    const response = await fetch(`/ api / schools / transport / student - routes / ${id} `, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete assignment");
    return true;
}

export default function StudentAssignments() {
    const [saving, setSaving] = useState(false);
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { assignments = [], total = 0 } = {}, isLoading: assignmentsLoading } = useQuery({
        queryKey: ["assignments", schoolId, search],
        queryFn: () => fetchAssignments({ schoolId, search }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: { students = [] } = {} } = useQuery({
        queryKey: ["students", schoolId],
        queryFn: () => fetchStudents({ schoolId }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createAssignment,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["assignments"]);
            setDrawerMode(null);
            toast.success("Assignment added successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to add assignment"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAssignment,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["assignments"]);
            toast.success("Assignment deleted successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to delete assignment"),
    });

    const handleSelectChange = (name, val) => {
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = () => {
        if (!formData.studentId || !formData.routeId) {
            setFormError("Student and Route are required");
            return;
        }
        formData.schoolId = schoolId;
        createMutation.mutate(formData);
    };

    const handleAdd = () => {
        setFormData({});
        setDrawerMode("add");
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="p-6">
            <Button onClick={handleAdd} className="mb-4">Assign Student to Route</Button>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Assigned At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignmentsLoading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : assignments.length > 0 ? (
                            assignments.map((assignment, index) => (
                                <TableRow key={assignment.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{assignment.student?.name}</TableCell>
                                    <TableCell>{assignment.route?.name}</TableCell>
                                    <TableCell>{new Date(assignment.assignedAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(assignment.id)}>
                                            Remove
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No assignments found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>Assign Student to Route</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="studentId" className="mb-2 text-muted-foreground">Student*</Label>
                                <Select value={formData.studentId || ""} onValueChange={(val) => handleSelectChange("studentId", val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.userId} value={student.userId}>{student.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="routeId" className="mb-2 text-muted-foreground">Route*</Label>
                                <Select value={formData.routeId || ""} onValueChange={(val) => handleSelectChange("routeId", val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select route" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {routes.map((route) => (
                                            <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`mt - 6 w - full ${saving ? "opacity-50 cursor-not-allowed" : ""} `}
                        >
                            {saving ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Saving</span>
                                </div>
                            ) : "Save"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
