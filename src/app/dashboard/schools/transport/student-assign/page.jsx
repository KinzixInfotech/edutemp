'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Users, Route, GraduationCap, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";

async function fetchAssignments({ schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await fetch(`/api/schools/transport/student-routes?${params}`);
    if (!response.ok) throw new Error("Failed to fetch assignments");
    return response.json();
}

async function searchStudents({ schoolId, search, limit = 20 }) {
    if (!search || search.length < 2) return { students: [] };
    const params = new URLSearchParams({ schoolId, search, limit });
    const response = await fetch(`/api/schools/students?${params}`);
    if (!response.ok) throw new Error("Failed to search students");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/api/schools/transport/routes?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function createAssignment(data) {
    const response = await fetch("/api/schools/transport/student-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create assignment");
    }
    return response.json();
}

async function deleteAssignment(id) {
    const response = await fetch(`/api/schools/transport/student-routes/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete assignment");
    return true;
}

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function StudentAssignments() {
    const { fullUser } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Student search state
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const debouncedStudentSearch = useDebounce(studentSearch, 300);

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { assignments = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["student-assignments", schoolId, search, page],
        queryFn: () => fetchAssignments({ schoolId, search, page, limit }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // Search students with debounce
    const { data: { students: searchedStudents = [] } = {}, isFetching: searchingStudents } = useQuery({
        queryKey: ["student-search", schoolId, debouncedStudentSearch],
        queryFn: () => searchStudents({ schoolId, search: debouncedStudentSearch }),
        enabled: !!schoolId && debouncedStudentSearch.length >= 2 && dialogOpen,
        staleTime: 30 * 1000,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId && dialogOpen,
    });

    const createMutation = useMutation({
        mutationFn: createAssignment,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["student-assignments"]);
            setDialogOpen(false);
            toast.success("Student assigned successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries(["student-assignments"]);
            setDeleteDialogOpen(false);
            toast.success("Assignment removed");
        },
        onError: () => toast.error("Failed to remove assignment"),
    });

    const validateForm = () => {
        const errors = {};
        if (!selectedStudent) errors.studentId = "Select a student";
        if (!formData.routeId) errors.routeId = "Route is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        createMutation.mutate({ studentId: selectedStudent.userId, routeId: formData.routeId, schoolId });
    };

    const handleAdd = () => {
        setFormData({});
        setFormErrors({});
        setSelectedStudent(null);
        setStudentSearch("");
        setDialogOpen(true);
    };

    const handleDeleteClick = (assignment) => {
        setSelectedAssignment(assignment);
        setDeleteDialogOpen(true);
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setStudentSearch("");
        setShowStudentDropdown(false);
    };

    const handleClearStudent = () => {
        setSelectedStudent(null);
        setStudentSearch("");
    };

    // Stats - count unique routes
    const uniqueRoutes = [...new Set(assignments.map(a => a.routeId))].length;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Student Route Assignment</h1>
                    <p className="text-muted-foreground text-sm mt-1">Assign students to transport routes</p>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Assign Student
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                        <Route className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{uniqueRoutes}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">This Page</CardTitle>
                        <GraduationCap className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{assignments.length}</div></CardContent>
                </Card>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by student name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 bg-white dark:bg-muted" />
            </div>

            <div className="rounded-lg border overflow-hidden ">
                <div className="overflow-x-auto">
                    <Table className={'bg-white dark:bg-muted'}>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Assigned On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>{Array(5).fill(0).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>))}</TableRow>
                                ))
                            ) : assignments.length > 0 ? (
                                assignments.map((assignment, index) => (
                                    <TableRow key={assignment.id} className="hover:bg-muted/30">
                                        <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                                        <TableCell className="font-semibold">{assignment.student?.name || "N/A"}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {assignment.route?.name || "N/A"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(assignment.assignedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(assignment)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No student assignments found</p>
                                        <Button variant="link" onClick={handleAdd} className="mt-2">Assign your first student</Button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Student to Route</DialogTitle>
                        <DialogDescription>Search for a student and assign them to a transport route</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Student Search */}
                        <div className="space-y-2">
                            <Label>Student <span className="text-destructive">*</span></Label>
                            {selectedStudent ? (
                                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <GraduationCap className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{selectedStudent.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedStudent.admissionNumber && `#${selectedStudent.admissionNumber} • `}
                                            {selectedStudent.section?.class?.name} {selectedStudent.section?.name}
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={handleClearStudent}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Type at least 2 characters to search..."
                                        value={studentSearch}
                                        onChange={(e) => {
                                            setStudentSearch(e.target.value);
                                            setShowStudentDropdown(true);
                                        }}
                                        onFocus={() => setShowStudentDropdown(true)}
                                        className={`pl-10 ${formErrors.studentId ? "border-destructive" : ""}`}
                                    />
                                    {showStudentDropdown && studentSearch.length >= 2 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {searchingStudents ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    <span className="text-sm text-muted-foreground">Searching...</span>
                                                </div>
                                            ) : searchedStudents.length > 0 ? (
                                                searchedStudents.map((student) => (
                                                    <div
                                                        key={student.userId}
                                                        className="flex items-center gap-2 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                                        onClick={() => handleSelectStudent(student)}
                                                    >
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <GraduationCap className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{student.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {student.admissionNumber && `#${student.admissionNumber} • `}
                                                                {student.section?.class?.name} {student.section?.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                    No students found matching "{studentSearch}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {formErrors.studentId && <p className="text-xs text-destructive">{formErrors.studentId}</p>}
                        </div>

                        {/* Route Selection */}
                        <div className="space-y-2">
                            <Label>Route <span className="text-destructive">*</span></Label>
                            <Select value={formData.routeId || ""} onValueChange={(val) => setFormData({ ...formData, routeId: val })}>
                                <SelectTrigger className={formErrors.routeId ? "border-destructive" : ""}>
                                    <SelectValue placeholder="Select route" />
                                </SelectTrigger>
                                <SelectContent>
                                    {routes.map((route) => (
                                        <SelectItem key={route.id} value={route.id}>
                                            {route.name} {route.vehicle?.licensePlate && `(${route.vehicle.licensePlate})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.routeId && <p className="text-xs text-destructive">{formErrors.routeId}</p>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</> : "Assign Student"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remove Assignment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <span className="font-semibold">{selectedAssignment?.student?.name}</span> from <span className="font-semibold">{selectedAssignment?.route?.name}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedAssignment?.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</> : "Remove"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
