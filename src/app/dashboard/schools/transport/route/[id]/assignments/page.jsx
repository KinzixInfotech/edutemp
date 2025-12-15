'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Search, Users, GraduationCap, MapPin, Eye, ChevronLeft, ChevronRight, Phone, Mail, Calendar, User } from "lucide-react";

async function fetchRoute(routeId, schoolId) {
    const response = await fetch(`/api/schools/transport/routes/${routeId}?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch route");
    return response.json();
}

async function fetchAssignments({ routeId, schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId, routeId });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await fetch(`/api/schools/transport/student-routes?${params}`);
    if (!response.ok) throw new Error("Failed to fetch assignments");
    return response.json();
}

export default function RouteAssignmentsPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const routeId = params.id;
    const schoolId = fullUser?.schoolId;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const limit = 10;

    const { data: route, isLoading: routeLoading } = useQuery({
        queryKey: ["route", routeId, schoolId],
        queryFn: () => fetchRoute(routeId, schoolId),
        enabled: !!routeId && !!schoolId,
    });

    const { data: { assignments = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["route-assignments", routeId, schoolId, search, page],
        queryFn: () => fetchAssignments({ routeId, schoolId, search, page, limit }),
        enabled: !!routeId && !!schoolId,
        staleTime: 60 * 1000,
    });

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setDetailsOpen(true);
    };

    const totalPages = Math.ceil(total / limit);

    // Calculate stats
    const maleStudents = assignments.filter(a => a.student?.gender === "Male").length;
    const femaleStudents = assignments.filter(a => a.student?.gender === "Female").length;

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="w-fit">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Routes
                </Button>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    {routeLoading ? <Skeleton className="h-8 w-48" /> : route?.route?.name || "Route"} - Student Assignments
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {routeLoading ? <Skeleton className="h-4 w-64 mt-1" /> : (
                        <>Vehicle: {route?.route?.vehicle?.licensePlate || "Not assigned"} • {route?.route?.stops?.length || 0} stops</>
                    )}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Male</CardTitle>
                        <User className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{maleStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Female</CardTitle>
                        <User className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">{femaleStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Stops</CardTitle>
                        <MapPin className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{route?.route?.stops?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search students by name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10 bg-white dark:bg-muted"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="bg-white dark:bg-muted">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Admission No.</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Parent Contact</TableHead>
                                <TableHead>Assigned On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array(7).fill(0).map((_, j) => (
                                            <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : assignments.length > 0 ? (
                                assignments.map((assignment, index) => (
                                    <TableRow key={assignment.id} className="hover:bg-muted/30">
                                        <TableCell className="text-muted-foreground">
                                            {(page - 1) * limit + index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <GraduationCap className="h-4 w-4 text-primary" />
                                                </div>
                                                {assignment.student?.name || "N/A"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{assignment.student?.admissionNumber || "-"}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {assignment.student?.section?.class?.name || "-"}
                                            {assignment.student?.section?.name && ` (${assignment.student.section.name})`}
                                        </TableCell>
                                        <TableCell>
                                            {assignment.student?.parentContact || assignment.student?.fatherMobile || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(assignment.assignedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <Button size="sm" variant="ghost" onClick={() => handleViewStudent(assignment.student)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No students assigned to this route</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} students
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Student Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Student Details</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedStudent.section?.class?.name} {selectedStudent.section?.name && `- ${selectedStudent.section.name}`}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">Admission No.</Badge>
                                    <span className="text-sm font-medium">{selectedStudent.admissionNumber || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{selectedStudent.gender || "N/A"}</span>
                                </div>
                                {selectedStudent.dateOfBirth && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {(selectedStudent.fatherMobile || selectedStudent.motherMobile) && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{selectedStudent.fatherMobile || selectedStudent.motherMobile}</span>
                                    </div>
                                )}
                                {selectedStudent.email && (
                                    <div className="flex items-center gap-2 col-span-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{selectedStudent.email}</span>
                                    </div>
                                )}
                                {selectedStudent.address && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">Address</p>
                                        <p className="text-sm">{selectedStudent.address}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
