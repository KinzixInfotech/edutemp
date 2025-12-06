"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    RefreshCw,
    DollarSign,
    Users,
    Edit,
    Trash2
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export default function SalaryStructures() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [showDialog, setShowDialog] = useState(false);
    const [editStructure, setEditStructure] = useState(null);

    // Fetch structures
    const { data: structures, isLoading, refetch } = useQuery({
        queryKey: ["salary-structures", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/structures`);
            if (!res.ok) throw new Error("Failed to fetch structures");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Create/Update structure
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const url = editStructure
                ? `/api/schools/${schoolId}/payroll/structures/${editStructure.id}`
                : `/api/schools/${schoolId}/payroll/structures`;
            const res = await fetch(url, {
                method: editStructure ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save structure");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editStructure ? "Structure updated" : "Structure created");
            queryClient.invalidateQueries(["salary-structures"]);
            setShowDialog(false);
            setEditStructure(null);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Delete structure
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/structures/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete structure");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Structure deleted");
            queryClient.invalidateQueries(["salary-structures"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        saveMutation.mutate({
            name: formData.get("name"),
            description: formData.get("description"),
            basicSalary: parseFloat(formData.get("basicSalary")) || 0,
            hraPercent: parseFloat(formData.get("hraPercent")) || 40,
            daPercent: parseFloat(formData.get("daPercent")) || 0,
            taAmount: parseFloat(formData.get("taAmount")) || 0,
            medicalAllowance: parseFloat(formData.get("medicalAllowance")) || 0,
            specialAllowance: parseFloat(formData.get("specialAllowance")) || 0,
        });
    };

    const openEdit = (structure) => {
        setEditStructure(structure);
        setShowDialog(true);
    };

    const openCreate = () => {
        setEditStructure(null);
        setShowDialog(true);
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
                    <h1 className="text-2xl font-bold">Salary Structures</h1>
                    <p className="text-muted-foreground">Configure salary templates for employees</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Create Structure
                    </Button>
                </div>
            </div>

            {/* Structures Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            ) : structures?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {structures.map(structure => (
                        <Card key={structure.id} className="border bg-white dark:bg-muted">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{structure.name}</CardTitle>
                                    <Badge variant={structure.isActive ? "success" : "secondary"}>
                                        {structure.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                {structure.description && (
                                    <CardDescription>{structure.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Salary Breakdown */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Basic Salary</span>
                                        <span className="font-medium">{formatCurrency(structure.basicSalary)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">HRA ({structure.hraPercent}%)</span>
                                        <span>{formatCurrency(structure.basicSalary * structure.hraPercent / 100)}</span>
                                    </div>
                                    {structure.daPercent > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">DA ({structure.daPercent}%)</span>
                                            <span>{formatCurrency(structure.basicSalary * structure.daPercent / 100)}</span>
                                        </div>
                                    )}
                                    {structure.taAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Transport</span>
                                            <span>{formatCurrency(structure.taAmount)}</span>
                                        </div>
                                    )}
                                    {structure.medicalAllowance > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Medical</span>
                                            <span>{formatCurrency(structure.medicalAllowance)}</span>
                                        </div>
                                    )}
                                    {structure.specialAllowance > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Special</span>
                                            <span>{formatCurrency(structure.specialAllowance)}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 mt-2">
                                        <div className="flex justify-between font-medium">
                                            <span>Gross Salary</span>
                                            <span className="text-primary">{formatCurrency(structure.grossSalary)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>CTC</span>
                                            <span>{formatCurrency(structure.ctc)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Employees Count */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>{structure.employeeCount} employees</span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(structure)}>
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteMutation.mutate(structure.id)}
                                        disabled={structure.employeeCount > 0}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="py-12 text-center">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Salary Structures</h3>
                        <p className="text-muted-foreground mb-4">Create your first salary structure to assign to employees</p>
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Create Structure
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editStructure ? "Edit Structure" : "Create Salary Structure"}</DialogTitle>
                        <DialogDescription>
                            Configure the salary components for this structure
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Structure Name *</Label>
                                <Input
                                    name="name"
                                    placeholder="e.g., Senior Teacher Grade"
                                    defaultValue={editStructure?.name}
                                    required
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    name="description"
                                    placeholder="Brief description..."
                                    defaultValue={editStructure?.description}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Basic Salary *</Label>
                                    <Input
                                        name="basicSalary"
                                        type="number"
                                        placeholder="25000"
                                        defaultValue={editStructure?.basicSalary}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>HRA %</Label>
                                    <Input
                                        name="hraPercent"
                                        type="number"
                                        placeholder="40"
                                        defaultValue={editStructure?.hraPercent || 40}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>DA %</Label>
                                    <Input
                                        name="daPercent"
                                        type="number"
                                        placeholder="0"
                                        defaultValue={editStructure?.daPercent || 0}
                                    />
                                </div>
                                <div>
                                    <Label>Transport Allowance</Label>
                                    <Input
                                        name="taAmount"
                                        type="number"
                                        placeholder="0"
                                        defaultValue={editStructure?.taAmount || 0}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Medical Allowance</Label>
                                    <Input
                                        name="medicalAllowance"
                                        type="number"
                                        placeholder="0"
                                        defaultValue={editStructure?.medicalAllowance || 0}
                                    />
                                </div>
                                <div>
                                    <Label>Special Allowance</Label>
                                    <Input
                                        name="specialAllowance"
                                        type="number"
                                        placeholder="0"
                                        defaultValue={editStructure?.specialAllowance || 0}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? "Saving..." : editStructure ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
