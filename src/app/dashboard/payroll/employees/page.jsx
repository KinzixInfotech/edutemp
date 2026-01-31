"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Search,
    RefreshCw,
    UserPlus,
    Building2,
    Wallet,
    Eye,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BulkAddDialog } from "./BulkAddDialog";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export default function PayrollEmployees() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [employeeType, setEmployeeType] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);

    // Fetch employees
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["payroll-employees", schoolId, employeeType],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "500" });
            if (employeeType !== "all") params.set("employeeType", employeeType);
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees?${params}`);
            if (!res.ok) throw new Error("Failed to fetch employees");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch non-enrolled staff for adding
    const { data: allStaff, isLoading: loadingStaff } = useQuery({
        queryKey: ["all-staff", schoolId],
        queryFn: async () => {
            const [teachingRes, nonTeachingRes] = await Promise.all([
                fetch(`/api/schools/teaching-staff/${schoolId}`),
                fetch(`/api/schools/non-teaching-staff/${schoolId}`)
            ]);

            const teaching = teachingRes.ok ? await teachingRes.json() : [];
            const nonTeaching = nonTeachingRes.ok ? await nonTeachingRes.json() : [];

            return {
                teaching: Array.isArray(teaching) ? teaching : [],
                nonTeaching: Array.isArray(nonTeaching) ? nonTeaching : []
            };
        },
        enabled: !!schoolId && (showAddDialog || showBulkDialog),
    });

    // Fetch salary structures
    const { data: structures } = useQuery({
        queryKey: ["salary-structures", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/structures?isActive=true`);
            if (!res.ok) throw new Error("Failed to fetch structures");
            return res.json();
        },
        enabled: !!schoolId,
    });

    const employees = data?.employees || [];

    // Filter out already enrolled - memoized
    const availableStaff = useMemo(() => {
        const enrolledIds = new Set(employees.map(e => e.userId));
        return {
            teaching: (allStaff?.teaching || []).filter(s => !enrolledIds.has(s.userId)),
            nonTeaching: (allStaff?.nonTeaching || []).filter(s => !enrolledIds.has(s.userId))
        };
    }, [allStaff, employees]);

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = search === "" ||
                emp.name?.toLowerCase().includes(search.toLowerCase()) ||
                emp.email?.toLowerCase().includes(search.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === "all" ||
                (statusFilter === "active" && emp.isActive) ||
                (statusFilter === "inactive" && !emp.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [employees, search, statusFilter]);

    // Pagination Logic
    const { paginatedEmployees, totalPages } = useMemo(() => {
        const total = Math.ceil(filteredEmployees.length / pageSize);
        const paginated = filteredEmployees.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize
        );
        return { paginatedEmployees: paginated, totalPages: total };
    }, [filteredEmployees, currentPage, pageSize]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, employeeType, statusFilter, pageSize]);

    // Create profile mutation
    const createProfile = useMutation({
        mutationFn: async (profileData) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileData)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create profile");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Employee added to payroll");
            queryClient.invalidateQueries(["payroll-employees"]);
            queryClient.invalidateQueries(["all-staff"]);
            setShowAddDialog(false);
            setSelectedUser(null);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Bulk add mutation
    const bulkAddMutation = useMutation({
        mutationFn: async ({ staffList, employmentType, joiningDate, salaryStructureId }) => {
            const results = { success: 0, failed: 0 };

            for (const staff of staffList) {
                try {
                    const res = await fetch(`/api/schools/${schoolId}/payroll/employees`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: staff.userId,
                            employeeType: staff.type,
                            employmentType,
                            joiningDate,
                            salaryStructureId
                        })
                    });
                    if (res.ok) results.success++;
                    else results.failed++;
                } catch {
                    results.failed++;
                }
            }
            return results;
        },
        onSuccess: (results) => {
            toast.success(`Added ${results.success} employees${results.failed > 0 ? `, ${results.failed} failed` : ''}`);
            queryClient.invalidateQueries(["payroll-employees"]);
            queryClient.invalidateQueries(["all-staff"]);
            setShowBulkDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Update salary structure mutation for inline assignment
    const updateStructure = useMutation({
        mutationFn: async ({ employeeId, salaryStructureId }) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees/${employeeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ salaryStructureId })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to update");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Salary structure assigned");
            queryClient.invalidateQueries(["payroll-employees"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Delete employee mutation
    const deleteEmployee = useMutation({
        mutationFn: async (employeeId) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees/${employeeId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to remove employee");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Employee removed from payroll");
            queryClient.invalidateQueries(["payroll-employees"]);
        },
        onError: () => {
            toast.error("Failed to remove employee");
        }
    });

    const handleAddEmployee = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        createProfile.mutate({
            userId: formData.get("userId"),
            employeeType: formData.get("employeeType"),
            employmentType: formData.get("employmentType"),
            joiningDate: formData.get("joiningDate"),
            salaryStructureId: formData.get("salaryStructureId") || null
        });
    };

    // Selection handlers
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(paginatedEmployees.map(e => e.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Remove ${selectedIds.length} employee(s) from payroll?`)) return;
        for (const id of selectedIds) {
            await deleteEmployee.mutateAsync(id);
        }
        setSelectedIds([]);
    };

    // Stats
    const stats = useMemo(() => ({
        total: employees.length,
        teaching: employees.filter(e => e.employeeType === "TEACHING").length,
        nonTeaching: employees.filter(e => e.employeeType === "NON_TEACHING").length,
        active: employees.filter(e => e.isActive).length
    }), [employees]);

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Payroll Employees
                    </h1>
                    <p className="text-muted-foreground">Manage employee payroll profiles</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Employee
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">Active profiles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teaching Staff</CardTitle>
                        <Building2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.teaching}</div>
                        <p className="text-xs text-muted-foreground">Teachers enrolled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Non-Teaching Staff</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.nonTeaching}</div>
                        <p className="text-xs text-muted-foreground">Support staff enrolled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>All Employees ({filteredEmployees.length})</CardTitle>
                            <CardDescription>
                                Manage payroll profiles and salary structures
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground hidden sm:inline-block">Rows per page:</span>
                                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[70px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedIds.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove ({selectedIds.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters Row */}
                    <div className="flex flex-col gap-3 mb-4 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or employee ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={employeeType} onValueChange={setEmployeeType}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="TEACHING">Teaching</SelectItem>
                                <SelectItem value="NON_TEACHING">Non-Teaching</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedIds.length === paginatedEmployees.length && paginatedEmployees.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Salary Structure</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedEmployees.length > 0 ? (
                                    paginatedEmployees.map((emp, index) => (
                                        <TableRow key={emp.id} className={index % 2 === 0 ? '' : 'bg-muted/50'}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(emp.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(emp.id, checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={emp.profilePicture} />
                                                        <AvatarFallback>{emp.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate max-w-[200px]">{emp.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {emp.employeeId}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={emp.employeeType === "TEACHING" ? "default" : "secondary"}>
                                                    {emp.employeeType === "TEACHING" ? "Teaching" : "Non-Teaching"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{emp.designation || "-"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={emp.salaryStructureId || ""}
                                                    onValueChange={(value) => updateStructure.mutate({ employeeId: emp.id, salaryStructureId: value || null })}
                                                >
                                                    <SelectTrigger className="w-48 h-8">
                                                        <SelectValue placeholder="Assign structure" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {structures?.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.name} - {formatCurrency(s.grossSalary)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={emp.isActive ? "default" : "secondary"} className={emp.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                                    {emp.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Link href={`/dashboard/payroll/employees/${emp.id}`}>
                                                        <Button variant="ghost" size="icon">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm("Remove this employee from payroll?")) {
                                                                deleteEmployee.mutate(emp.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            No employees found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} employees
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Single Employee Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Employee to Payroll</DialogTitle>
                        <DialogDescription>
                            Select a staff member and configure their payroll profile
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddEmployee}>
                        <div className="space-y-4 py-4">
                            <Tabs defaultValue="teaching">
                                <TabsList className="w-full">
                                    <TabsTrigger value="teaching" className="flex-1">Teaching</TabsTrigger>
                                    <TabsTrigger value="nonTeaching" className="flex-1">Non-Teaching</TabsTrigger>
                                </TabsList>
                                <TabsContent value="teaching" className="mt-4">
                                    <Label>Select Teacher</Label>
                                    <Select onValueChange={(v) => setSelectedUser({ ...JSON.parse(v), type: "TEACHING" })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a teacher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStaff?.teaching?.map(staff => (
                                                <SelectItem key={staff.userId} value={JSON.stringify(staff)}>
                                                    {staff.name} ({staff.employeeId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                                <TabsContent value="nonTeaching" className="mt-4">
                                    <Label>Select Staff</Label>
                                    <Select onValueChange={(v) => setSelectedUser({ ...JSON.parse(v), type: "NON_TEACHING" })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a staff member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStaff?.nonTeaching?.map(staff => (
                                                <SelectItem key={staff.userId} value={JSON.stringify(staff)}>
                                                    {staff.name} ({staff.employeeId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                            </Tabs>

                            <input type="hidden" name="userId" value={selectedUser?.userId || ""} />
                            <input type="hidden" name="employeeType" value={selectedUser?.type || "TEACHING"} />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Employment Type</Label>
                                    <Select name="employmentType" defaultValue="PERMANENT">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERMANENT">Permanent</SelectItem>
                                            <SelectItem value="CONTRACT">Contract</SelectItem>
                                            <SelectItem value="PROBATION">Probation</SelectItem>
                                            <SelectItem value="PART_TIME">Part Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Joining Date</Label>
                                    <Input type="date" name="joiningDate" required />
                                </div>
                            </div>

                            <div>
                                <Label>Salary Structure</Label>
                                <Select name="salaryStructureId">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select structure (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {structures?.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name} - {formatCurrency(s.grossSalary)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!selectedUser || createProfile.isPending}>
                                {createProfile.isPending ? "Adding..." : "Add Employee"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Add Dialog - Separate Component */}
            <BulkAddDialog
                open={showBulkDialog}
                onOpenChange={setShowBulkDialog}
                availableStaff={availableStaff}
                structures={structures}
                loadingStaff={loadingStaff}
                onSubmit={(data) => bulkAddMutation.mutate(data)}
                isPending={bulkAddMutation.isPending}
            />
        </div>
    );
}
