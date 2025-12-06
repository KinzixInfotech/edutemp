"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    UsersRound
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
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Fetch employees
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["payroll-employees", schoolId, employeeType],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "100" });
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

    const filteredEmployees = employees.filter(emp =>
        search === "" ||
        emp.name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(search.toLowerCase())
    );

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
                    <h1 className="text-2xl font-bold">Payroll Employees</h1>
                    <p className="text-muted-foreground">Manage employee payroll profiles</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
                        <UsersRound className="mr-2 h-4 w-4" /> Add All Staff
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Enrolled</p>
                                <p className="text-2xl font-bold">{employees.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <Building2 className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Teaching Staff</p>
                                <p className="text-2xl font-bold">
                                    {employees.filter(e => e.employeeType === "TEACHING").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <Wallet className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Non-Teaching Staff</p>
                                <p className="text-2xl font-bold">
                                    {employees.filter(e => e.employeeType === "NON_TEACHING").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Table */}
            <Card className="border bg-white dark:bg-muted">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or employee ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={employeeType} onValueChange={setEmployeeType}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Employee Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="TEACHING">Teaching</SelectItem>
                                <SelectItem value="NON_TEACHING">Non-Teaching</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : filteredEmployees.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Designation</TableHead>
                                    <TableHead>Salary Structure</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map(emp => (
                                    <TableRow key={emp.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={emp.profilePicture} />
                                                    <AvatarFallback>{emp.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{emp.name}</p>
                                                    <p className="text-sm text-muted-foreground">{emp.employeeId}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={emp.employeeType === "TEACHING" ? "default" : "secondary"}>
                                                {emp.employeeType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{emp.designation || "-"}</TableCell>
                                        <TableCell>
                                            {emp.salaryStructure ? (
                                                <div>
                                                    <p className="font-medium">{emp.salaryStructure.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatCurrency(emp.salaryStructure.grossSalary)}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Not assigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={emp.isActive ? "success" : "secondary"}>
                                                {emp.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/payroll/employees/${emp.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No employees found</p>
                            <Button variant="link" onClick={() => setShowAddDialog(true)}>
                                Add your first employee
                            </Button>
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
