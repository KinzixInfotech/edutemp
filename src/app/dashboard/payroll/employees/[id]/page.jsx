"use client";

import { useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Save,
    User,
    Wallet,
    Building2,
    FileText,
    CreditCard,
    IndianRupee,
    Calendar,
    Phone,
    Mail,
    MapPin
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export default function EmployeeDetailPage({ params }) {
    const unwrappedParams = use(params);
    const employeeId = unwrappedParams.id;

    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // Fetch employee details
    const { data: employee, isLoading, error } = useQuery({
        queryKey: ["payroll-employee", schoolId, employeeId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees/${employeeId}`);
            if (!res.ok) throw new Error("Failed to fetch employee");
            return res.json();
        },
        enabled: !!schoolId && !!employeeId,
        onSuccess: (data) => {
            setFormData({
                employmentType: data.employmentType || "PERMANENT",
                salaryStructureId: data.salaryStructureId || "",
                joiningDate: data.joiningDate?.split('T')[0] || "",
                confirmationDate: data.confirmationDate?.split('T')[0] || "",
                bankName: data.bankName || "",
                bankBranch: data.bankBranch || "",
                accountNumber: data.accountNumber || "",
                ifscCode: data.ifscCode || "",
                accountHolder: data.accountHolder || "",
                upiId: data.upiId || "",
                panNumber: data.panNumber || "",
                aadharNumber: data.aadharNumber || "",
                uanNumber: data.uanNumber || "",
                esiNumber: data.esiNumber || "",
                taxRegime: data.taxRegime || "NEW"
            });
        }
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

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to update");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Employee profile updated");
            queryClient.invalidateQueries(["payroll-employee", schoolId, employeeId]);
            setIsEditing(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateMutation.mutate(formData);
    };

    // Initialize form data when employee loads
    if (employee && Object.keys(formData).length === 0) {
        setFormData({
            employmentType: employee.employmentType || "PERMANENT",
            salaryStructureId: employee.salaryStructureId || "",
            joiningDate: employee.joiningDate?.split('T')[0] || "",
            confirmationDate: employee.confirmationDate?.split('T')[0] || "",
            bankName: employee.bankName || "",
            bankBranch: employee.bankBranch || "",
            accountNumber: employee.accountNumber || "",
            ifscCode: employee.ifscCode || "",
            accountHolder: employee.accountHolder || "",
            upiId: employee.upiId || "",
            panNumber: employee.panNumber || "",
            aadharNumber: employee.aadharNumber || "",
            uanNumber: employee.uanNumber || "",
            esiNumber: employee.esiNumber || "",
            taxRegime: employee.taxRegime || "NEW"
        });
    }

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card><CardContent className="p-6"><p>Loading...</p></CardContent></Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !employee) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">Employee not found</p>
                        <Link href="/dashboard/payroll/employees">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/payroll/employees">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Employee Payroll Profile</h1>
                        <p className="text-muted-foreground">View and manage payroll details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending}>
                                <Save className="mr-2 h-4 w-4" />
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </Button>
                    )}
                </div>
            </div>

            {/* Employee Info Card */}
            <Card className="border bg-white dark:bg-muted">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={employee.profilePicture} />
                            <AvatarFallback className="text-2xl">{employee.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold">{employee.name}</h2>
                                <p className="text-muted-foreground">{employee.staffEmployeeId}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant={employee.employeeType === "TEACHING" ? "default" : "secondary"}>
                                    {employee.employeeType}
                                </Badge>
                                <Badge variant="outline">{employee.employmentType}</Badge>
                                <Badge variant={employee.isActive ? "success" : "destructive"}>
                                    {employee.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{employee.email}</span>
                                </div>
                                {employee.contactNumber && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{employee.contactNumber}</span>
                                    </div>
                                )}
                                {employee.department && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span>{employee.department}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Joined {formatDate(employee.joiningDate)}</span>
                                </div>
                            </div>
                        </div>
                        {employee.salaryStructure && (
                            <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Monthly Salary</p>
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(employee.salaryStructure.grossSalary)}
                                </p>
                                <p className="text-xs text-muted-foreground">{employee.salaryStructure.name}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="employment" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="employment">
                        <User className="mr-2 h-4 w-4" /> Employment
                    </TabsTrigger>
                    <TabsTrigger value="salary">
                        <IndianRupee className="mr-2 h-4 w-4" /> Salary
                    </TabsTrigger>
                    <TabsTrigger value="bank">
                        <CreditCard className="mr-2 h-4 w-4" /> Bank Details
                    </TabsTrigger>
                    <TabsTrigger value="tax">
                        <FileText className="mr-2 h-4 w-4" /> Tax & Statutory
                    </TabsTrigger>
                    <TabsTrigger value="loans">
                        <Wallet className="mr-2 h-4 w-4" /> Loans
                    </TabsTrigger>
                </TabsList>

                {/* Employment Tab */}
                <TabsContent value="employment">
                    <Card className="border bg-white dark:bg-muted">
                        <CardHeader>
                            <CardTitle>Employment Details</CardTitle>
                            <CardDescription>Basic employment information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <Label>Employment Type</Label>
                                    {isEditing ? (
                                        <Select
                                            value={formData.employmentType}
                                            onValueChange={(v) => handleChange("employmentType", v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERMANENT">Permanent</SelectItem>
                                                <SelectItem value="CONTRACT">Contract</SelectItem>
                                                <SelectItem value="PROBATION">Probation</SelectItem>
                                                <SelectItem value="PART_TIME">Part Time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.employmentType}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Designation</Label>
                                    <p className="mt-1 font-medium">{employee.designation || "-"}</p>
                                </div>
                                <div>
                                    <Label>Department</Label>
                                    <p className="mt-1 font-medium">{employee.department || "-"}</p>
                                </div>
                                <div>
                                    <Label>Joining Date</Label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={formData.joiningDate}
                                            onChange={(e) => handleChange("joiningDate", e.target.value)}
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{formatDate(employee.joiningDate)}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Confirmation Date</Label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={formData.confirmationDate}
                                            onChange={(e) => handleChange("confirmationDate", e.target.value)}
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{formatDate(employee.confirmationDate)}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Gender</Label>
                                    <p className="mt-1 font-medium">{employee.gender || "-"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary">
                    <Card className="border bg-white dark:bg-muted">
                        <CardHeader>
                            <CardTitle>Salary Structure</CardTitle>
                            <CardDescription>Assigned salary structure and breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <Label>Salary Structure</Label>
                                    {isEditing ? (
                                        <Select
                                            value={formData.salaryStructureId}
                                            onValueChange={(v) => handleChange("salaryStructureId", v)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
                                            <SelectContent>
                                                {structures?.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name} - {formatCurrency(s.grossSalary)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : employee.salaryStructure ? (
                                        <div className="mt-2 p-4 bg-muted rounded-lg">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-semibold">{employee.salaryStructure.name}</h3>
                                                <Badge>CTC: {formatCurrency(employee.salaryStructure.ctc)}</Badge>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Basic Salary</p>
                                                    <p className="font-medium">{formatCurrency(employee.salaryStructure.basicSalary)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">HRA</p>
                                                    <p className="font-medium">{formatCurrency(employee.salaryStructure.hra)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">DA</p>
                                                    <p className="font-medium">{formatCurrency(employee.salaryStructure.da)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Gross Salary</p>
                                                    <p className="font-medium text-primary">{formatCurrency(employee.salaryStructure.grossSalary)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-muted-foreground">No salary structure assigned</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bank Details Tab */}
                <TabsContent value="bank">
                    <Card className="border bg-white dark:bg-muted">
                        <CardHeader>
                            <CardTitle>Bank Account Details</CardTitle>
                            <CardDescription>Bank information for salary transfer</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <Label>Bank Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.bankName}
                                            onChange={(e) => handleChange("bankName", e.target.value)}
                                            placeholder="Enter bank name"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.bankName || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Branch</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.bankBranch}
                                            onChange={(e) => handleChange("bankBranch", e.target.value)}
                                            placeholder="Enter branch name"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.bankBranch || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Account Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.accountNumber}
                                            onChange={(e) => handleChange("accountNumber", e.target.value)}
                                            placeholder="Enter account number"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.accountNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>IFSC Code</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.ifscCode}
                                            onChange={(e) => handleChange("ifscCode", e.target.value.toUpperCase())}
                                            placeholder="Enter IFSC code"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.ifscCode || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Account Holder Name</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.accountHolder}
                                            onChange={(e) => handleChange("accountHolder", e.target.value)}
                                            placeholder="Enter account holder name"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.accountHolder || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>UPI ID</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.upiId}
                                            onChange={(e) => handleChange("upiId", e.target.value)}
                                            placeholder="Enter UPI ID"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.upiId || "-"}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tax & Statutory Tab */}
                <TabsContent value="tax">
                    <Card className="border bg-white dark:bg-muted">
                        <CardHeader>
                            <CardTitle>Tax & Statutory Details</CardTitle>
                            <CardDescription>PAN, Aadhar, PF, ESI information</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <Label>PAN Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.panNumber}
                                            onChange={(e) => handleChange("panNumber", e.target.value.toUpperCase())}
                                            placeholder="Enter PAN"
                                            maxLength={10}
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.panNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Aadhar Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.aadharNumber}
                                            onChange={(e) => handleChange("aadharNumber", e.target.value)}
                                            placeholder="Enter Aadhar"
                                            maxLength={12}
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.aadharNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Tax Regime</Label>
                                    {isEditing ? (
                                        <Select
                                            value={formData.taxRegime}
                                            onValueChange={(v) => handleChange("taxRegime", v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NEW">New Regime</SelectItem>
                                                <SelectItem value="OLD">Old Regime</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.taxRegime === "NEW" ? "New Regime" : "Old Regime"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>UAN Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.uanNumber}
                                            onChange={(e) => handleChange("uanNumber", e.target.value)}
                                            placeholder="Enter UAN"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.uanNumber || "-"}</p>
                                    )}
                                </div>
                                <div>
                                    <Label>ESI Number</Label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.esiNumber}
                                            onChange={(e) => handleChange("esiNumber", e.target.value)}
                                            placeholder="Enter ESI"
                                        />
                                    ) : (
                                        <p className="mt-1 font-medium">{employee.esiNumber || "-"}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Loans Tab */}
                <TabsContent value="loans">
                    <Card className="border bg-white dark:bg-muted">
                        <CardHeader>
                            <CardTitle>Active Loans & Advances</CardTitle>
                            <CardDescription>Current loans and upcoming repayments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {employee.loans?.length > 0 ? (
                                <div className="space-y-4">
                                    {employee.loans.map(loan => (
                                        <div key={loan.id} className="p-4 border rounded-lg">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-semibold">{loan.loanType.replace("_", " ")}</h4>
                                                    <p className="text-sm text-muted-foreground">{loan.description}</p>
                                                </div>
                                                <Badge variant={loan.status === "ACTIVE" ? "success" : "secondary"}>
                                                    {loan.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Principal</p>
                                                    <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Outstanding</p>
                                                    <p className="font-medium text-orange-500">{formatCurrency(loan.outstandingAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">EMI</p>
                                                    <p className="font-medium">{formatCurrency(loan.emiAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Repaid</p>
                                                    <p className="font-medium text-green-500">{formatCurrency(loan.totalRepaid)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No active loans or advances</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
