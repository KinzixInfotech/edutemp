"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export function BulkAddDialog({
    open,
    onOpenChange,
    availableStaff,
    structures,
    loadingStaff,
    onSubmit,
    isPending
}) {
    const [selections, setSelections] = useState({ teaching: [], nonTeaching: [] });
    const [employmentType, setEmploymentType] = useState("PERMANENT");
    const [salaryStructureId, setSalaryStructureId] = useState("_none");
    const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState("teaching");

    const resetForm = () => {
        setSelections({ teaching: [], nonTeaching: [] });
        setEmploymentType("PERMANENT");
        setSalaryStructureId("_none");
        setJoiningDate(new Date().toISOString().split('T')[0]);
    };

    const handleClose = (isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    const toggleSelectAll = (type) => {
        const staff = type === "teaching" ? availableStaff?.teaching : availableStaff?.nonTeaching;
        if (!staff) return;

        setSelections(prev => ({
            ...prev,
            [type]: prev[type].length === staff.length ? [] : [...staff]
        }));
    };

    const toggleStaff = (staff, type) => {
        setSelections(prev => {
            const isSelected = prev[type].some(s => s.userId === staff.userId);
            return {
                ...prev,
                [type]: isSelected
                    ? prev[type].filter(s => s.userId !== staff.userId)
                    : [...prev[type], staff]
            };
        });
    };

    const handleSubmit = () => {
        const staffList = [
            ...selections.teaching.map(s => ({ ...s, type: "TEACHING" })),
            ...selections.nonTeaching.map(s => ({ ...s, type: "NON_TEACHING" }))
        ];

        if (staffList.length === 0) return;

        onSubmit({
            staffList,
            employmentType,
            joiningDate,
            salaryStructureId: salaryStructureId === "_none" ? null : salaryStructureId
        });
    };

    const totalSelected = selections.teaching.length + selections.nonTeaching.length;
    const teachingStaff = availableStaff?.teaching || [];
    const nonTeachingStaff = availableStaff?.nonTeaching || [];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add All Staff to Payroll</DialogTitle>
                    <DialogDescription>
                        Select staff members to add to payroll in bulk.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    {/* Tab buttons */}
                    <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <button
                            type="button"
                            onClick={() => setActiveTab("teaching")}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "teaching"
                                    ? "bg-background shadow-sm"
                                    : "hover:bg-background/50"
                                }`}
                        >
                            Teaching ({teachingStaff.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("nonTeaching")}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === "nonTeaching"
                                    ? "bg-background shadow-sm"
                                    : "hover:bg-background/50"
                                }`}
                        >
                            Non-Teaching ({nonTeachingStaff.length})
                        </button>
                    </div>

                    {/* Staff list */}
                    {loadingStaff ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <div className="border rounded-lg">
                            {activeTab === "teaching" ? (
                                teachingStaff.length > 0 ? (
                                    <>
                                        <div className="p-3 bg-muted flex items-center justify-between border-b">
                                            <span className="font-medium text-sm">Teaching Staff</span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleSelectAll("teaching")}>
                                                {selections.teaching.length === teachingStaff.length ? "Deselect All" : "Select All"}
                                            </Button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto divide-y">
                                            {teachingStaff.map(staff => {
                                                const isChecked = selections.teaching.some(s => s.userId === staff.userId);
                                                return (
                                                    <div
                                                        key={staff.userId}
                                                        className="p-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
                                                        onClick={() => toggleStaff(staff, "teaching")}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => { }}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{staff.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {staff.employeeId} • {staff.designation || "Teacher"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="p-6 text-center text-muted-foreground">No teaching staff available</p>
                                )
                            ) : (
                                nonTeachingStaff.length > 0 ? (
                                    <>
                                        <div className="p-3 bg-muted flex items-center justify-between border-b">
                                            <span className="font-medium text-sm">Non-Teaching Staff</span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleSelectAll("nonTeaching")}>
                                                {selections.nonTeaching.length === nonTeachingStaff.length ? "Deselect All" : "Select All"}
                                            </Button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto divide-y">
                                            {nonTeachingStaff.map(staff => {
                                                const isChecked = selections.nonTeaching.some(s => s.userId === staff.userId);
                                                return (
                                                    <div
                                                        key={staff.userId}
                                                        className="p-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
                                                        onClick={() => toggleStaff(staff, "nonTeaching")}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => { }}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{staff.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {staff.employeeId} • {staff.designation || "Staff"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="p-6 text-center text-muted-foreground">No non-teaching staff available</p>
                                )
                            )}
                        </div>
                    )}

                    {/* Selected count */}
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">
                            Selected: {totalSelected} staff
                            {selections.teaching.length > 0 && ` (${selections.teaching.length} teaching)`}
                            {selections.nonTeaching.length > 0 && ` (${selections.nonTeaching.length} non-teaching)`}
                        </p>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Employment Type</Label>
                            <Select value={employmentType} onValueChange={setEmploymentType}>
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
                            <Input
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Salary Structure (optional)</Label>
                        <Select value={salaryStructureId} onValueChange={setSalaryStructureId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Assign later individually" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none">None - Assign later</SelectItem>
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
                    <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending || totalSelected === 0}
                    >
                        {isPending ? "Adding..." : `Add ${totalSelected} Employees`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
