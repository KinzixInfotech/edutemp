'use client'

import { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { numberToWordsIndian } from "@/lib/utils";

// Schema for assigning custom fee structure
const assignSchema = z.object({
    name: z.string().min(1, "Name is required"),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
    academicYearId: z.string().uuid("Invalid academic year ID"),
    particulars: z
        .array(
            z.object({
                name: z.string().min(1, "Particular name is required"),
                amount: z.number().positive("Amount must be positive"),
            })
        )
        .min(1, "At least one particular is required"),
});

export default function FeeStructuresTable() {
    const { fullUser } = useAuth();
    const [students, setStudents] = useState([]);
    const [loadingFee, setloadingFee] = useState(false)
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [feeStructures, setFeeStructures] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [viewFeesOpen, setViewFeesOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedFees, setSelectedFees] = useState(null);
    const [search, setSearch] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

    const form = useForm({
        resolver: zodResolver(assignSchema),
        defaultValues: {
            name: "",
            mode: "MONTHLY",
            academicYearId: "",
            particulars: [{ name: "", amount: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "particulars",
    });

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!fullUser?.schoolId) return;
        setLoading(true);
        try {
            const [studentsRes, classesRes, yearsRes, feeStructuresRes] = await Promise.all([
                fetch(`/api/students?schoolId=${fullUser.schoolId}`),
                fetch(`/api/schools/${fullUser.schoolId}/classes`),
                fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`),
                fetch(`/api/schools/fee/structures/get?schoolId=${fullUser.schoolId}`),
            ]);

            if (!studentsRes.ok) throw new Error("Failed to fetch students");
            if (!classesRes.ok) throw new Error("Failed to fetch classes");
            if (!yearsRes.ok) throw new Error("Failed to fetch academic years");
            if (!feeStructuresRes.ok) throw new Error("Failed to fetch fee structures");

            const [studentsData, classesData, yearsData, feeStructuresData] = await Promise.all([
                studentsRes.json(),
                classesRes.json(),
                yearsRes.json(),
                feeStructuresRes.json(),
            ]);

            console.log(studentsData);

            setStudents(studentsData);
            setFilteredStudents(studentsData);

            const mappedClasses = (Array.isArray(classesData) ? classesData : []).flatMap((cls) => {
                const sections = Array.isArray(cls.sections) ? cls.sections : [];
                return sections.length > 0
                    ? sections.map((sec) => ({
                        label: `${cls.className}'${sec.name}`,
                        value: `${cls.id}-${sec.id}`,
                        classId: cls.id,
                        sectionId: sec.id,
                    }))
                    : [{ label: `Class ${cls.className}`, value: `${cls.id}`, classId: cls.id, sectionId: null }];
            });

            setClasses(mappedClasses);

            setAcademicYears(yearsData || []);
            setFeeStructures(feeStructuresData || []);
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter students based on search, class, and section
    useEffect(() => {
        let filtered = students;
        if (search) {
            filtered = filtered.filter((student) =>
                student.admissionNumber?.toLowerCase().includes(search.toLowerCase()) ||
                student.User?.name?.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (selectedClass) {
            filtered = filtered.filter((student) => student.classId === parseInt(selectedClass));
        }
        if (selectedSection) {
            filtered = filtered.filter((student) => student.sectionId === selectedSection);
        }
        setFilteredStudents(filtered);
    }, [search, selectedClass, selectedSection, students]);

    // Handle view fee structures
    const handleViewFees = async (student) => {
        try {
            setloadingFee(true)
            const res = await fetch(`/api/students/${student.userId}/fee-structures`);
            if (!res.ok) throw new Error("Failed to fetch fee structures");
            const data = await res.json();
            setSelectedFees(data);
            console.log(data);

            setSelectedStudent(student);
            setViewFeesOpen(true);
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to load fee structures");
        } finally {
            setloadingFee(false)
        }
    };

    // Handle assign fee structure
    const openAssignDialog = (student) => {
        setSelectedStudent(student);
        const activeYear = academicYears.find((year) => year.isActive);
        form.reset({
            name: `Custom Fee for ${student.User?.name || student.admissionNumber}`,
            mode: "MONTHLY",
            academicYearId: activeYear?.id || "",
            particulars: [{ name: "", amount: 0 }],
        });
        setAssignOpen(true);
    };

    // Populate form with global fee structure
    const handleSelectGlobalFeeStructure = (feeStructureId) => {
        const feeStructure = feeStructures.find((fs) => fs.id === feeStructureId);
        if (feeStructure) {
            form.reset({
                name: feeStructure.name.split('-')[0],
                mode: feeStructure.mode,
                academicYearId: form.getValues("academicYearId") || academicYears.find((y) => y.isActive)?.id || "",
                particulars: feeStructure.feeParticulars.map((p) => ({
                    name: p.name,
                    amount: Number(p.defaultAmount),
                })),
            });
        }
    };

    // Handle assign submit
    const handleAssignSubmit = async (values) => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/students/${selectedStudent.userId}/assign-custom-fee-structure`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to assign fee structure");
            toast.success("Custom fee structure assigned successfully");
            setAssignOpen(false);
            form.reset();
            await fetchData(); // Refresh students to update assigned status
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to assign fee structure");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between px-3.5 py-4 items-center mb-4 gap-5 rounded-lg bg-muted lg:flex-row flex-col">
                <Input
                    placeholder="Search by Name or Admission Number..."
                    className="dark:bg-[#171717] bg-white border lg:w-[180px] rounded-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search students"
                />
                <div className="flex gap-1.5 lg:flex-row flex-col lg:w-fit w-full">
                    <Select value={selectedClass} onValueChange={setSelectedClass} aria-label="Select class">
                        <SelectTrigger className="lg:w-[180px] w-full">
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Classes</SelectItem>
                            {classes.map((cls) => (
                                <SelectItem key={cls.value} value={cls.classId.toString()}>
                                    {cls.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedSection} onValueChange={setSelectedSection} aria-label="Select section">
                        <SelectTrigger className="lg:w-[180px] w-full">
                            <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Sections</SelectItem>
                            {classes
                                .filter((cls) => !selectedClass || cls.classId === parseInt(selectedClass))
                                .map((cls) => (
                                    cls.sectionId && (
                                        <SelectItem key={cls.value} value={cls.sectionId}>
                                            {cls.label}
                                        </SelectItem>
                                    )
                                ))}
                        </SelectContent>
                    </Select>
                    <Link href="./manage-fee-structure">
                        <Button className="lg:w-fit w-full">Add Fee Structure</Button>
                    </Link>
                    <Button variant="outline" className="lg:w-fit w-full">Export</Button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px] !border-none">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Admission Number</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Fee Structure</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredStudents.length > 0 ? (
                            filteredStudents.map((student, index) => (
                                <TableRow
                                    key={student.userId}
                                    className={index % 2 === 0 ? "bg-muted" : "bg-background"}
                                >
                                    <TableCell className="py-4 text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="py-4">{student?.name || "N/A"}</TableCell>
                                    <TableCell className="py-4">{student.admissionNo || "N/A"}</TableCell>
                                    <TableCell className="py-4">{student.class?.className || "N/A"}</TableCell>
                                    <TableCell className="py-4">{student.class.sections[0].name || "N/A"}</TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={
                                                student.StudentFeeStructure?.length > 0
                                                    ? "default"
                                                    : "secondary"
                                            }
                                            className="py-1.5 w-32 break-words text-center"
                                        >
                                            {student.StudentFeeStructure?.length > 0
                                                ? "Assigned"
                                                : "Not Assigned"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 flex flex-row gap-2.5">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleViewFees(student)}
                                                    aria-label={`View fee structures for ${student?.name || student?.admissionNo}`}
                                                >
                                                    View
                                                </Button>
                                            </DialogTrigger>
                                            {loadingFee ? (
                                                <DialogContent>
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Loader2 className="animate-spin" size={35} />
                                                    </div>
                                                </DialogContent>) : (
                                                <DialogContent className="sm:max-w-lg max-h-96 overflow-y-auto dark:bg-[#171717] bg-white w-full">
                                                    {/* <DialogHeader>
                                                    <DialogTitle>
                                                     
                                                    </DialogTitle>
                                                </DialogHeader> */}


                                                    <div className="space-y-2">
                                                        <span className="border-b border-muted-foreground">{selectedStudent?.name || selectedStudent?.admissionNo}'s Fee Structure</span>
                                                        {selectedFees && selectedFees.length > 0 ? (
                                                            selectedFees.map((sfs) => (
                                                                <div>

                                                                    <div className="text-sm "><span className="border-b border-muted-foreground ">Fee Structure Name:</span> <span className="font-medium">{sfs.feeStructure.name}</span></div>

                                                                    <div className="flex flex-row gap-2 mb-2.5">
                                                                        <p>Mode: {sfs.feeStructure.mode}</p>
                                                                        <p>Academic Year: {sfs.feeStructure.AcademicYear?.name || "N/A"}</p>
                                                                    </div>
                                                                    {/* <div className="mt-2">
                                                                        <p className="font-medium">Particulars:</p>
                                                                        {sfs.feeStructure.feeParticulars.map((p) => (
                                                                            <div key={p.id} className="ml-2">
                                                                                {p.name}: ₹{p.effectiveAmount.toFixed(2)}
                                                                            </div>
                                                                        ))}
                                                                    </div> */}
                                                                    <div className="border rounded-lg p-4">
                                                                        <Table className="w-full">
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead>#</TableHead>
                                                                                    <TableHead>Particular</TableHead>
                                                                                    <TableHead>Amount</TableHead>

                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>

                                                                                {sfs.feeStructure.feeParticulars.map((f, idx) => (
                                                                                    <TableRow
                                                                                        key={f.id}
                                                                                        className={idx % 2 === 0 ? "bg-muted" : "bg-background"}
                                                                                    >
                                                                                        <TableCell>{idx + 1}</TableCell>
                                                                                        <TableCell>{f.name}</TableCell>
                                                                                        <TableCell>₹{f.defaultAmount.toFixed(2)}</TableCell>
                                                                                    </TableRow>
                                                                                ))}

                                                                                {/* Total Row */}
                                                                                <TableRow className="font-semibold">
                                                                                    <TableCell colSpan={2} className="text-right">
                                                                                        Total
                                                                                    </TableCell>

                                                                                    <TableCell>

                                                                                        <div
                                                                                            className="text-xs text-muted-foreground mt-1 whitespace-normal break-words p-1 "
                                                                                            style={{ maxWidth: "200px" }}
                                                                                        >
                                                                                            {numberToWordsIndian(
                                                                                                sfs.feeStructure.feeParticulars.reduce((sum, f) => sum + (f.defaultAmount || 0), 0)
                                                                                            )}

                                                                                        </div>
                                                                                        ₹{
                                                                                            sfs.feeStructure.feeParticulars
                                                                                                .reduce((sum, f) => sum + (f.defaultAmount || 0), 0)
                                                                                                .toLocaleString("en-IN", { maximumFractionDigits: 20 })
                                                                                        }
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>

                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p>No fee structures assigned</p>
                                                        )}
                                                    </div>

                                                    <DialogClose asChild>
                                                        <Button className="mt-4 w-full" aria-label="Close dialog">
                                                            Close
                                                        </Button>
                                                    </DialogClose>
                                                </DialogContent>
                                            )}
                                        </Dialog>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openAssignDialog(student)}
                                            aria-label={`Assign fee structure to ${student.User?.name || student.admissionNumber}`}
                                        >
                                            Assign Custom
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Assign Custom Fee Structure Dialog */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="sm:max-w-2xl dark:bg-[#171717] max-h-96 overflow-y-auto bg-white w-full">
                    <DialogHeader>
                        <DialogTitle>
                            Assign Custom Fee Structure for {selectedStudent?.name || selectedStudent?.admissionNo}
                        </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAssignSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fee Structure Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter fee structure name" {...field} aria-label="Fee structure name" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} aria-label="Select fee mode">
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                                                <SelectItem value="QUARTERLY">QUARTERLY</SelectItem>
                                                <SelectItem value="HALF_YEARLY">HALF_YEARLY</SelectItem>
                                                <SelectItem value="YEARLY">YEARLY</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="academicYearId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Academic Year</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} aria-label="Select academic year">
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select academic year" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {academicYears.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name} {year.isActive ? "(Active)" : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormItem>
                                <FormLabel>Base on Global Fee Structure (Optional)</FormLabel>
                                <Select onValueChange={handleSelectGlobalFeeStructure} aria-label="Select global fee structure">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a global fee structure" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {feeStructures.map((fs) => (
                                            <SelectItem key={fs.id} value={fs.id}>
                                                {fs.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                            <div>
                                <FormLabel>Fee Particulars</FormLabel>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 mt-2">
                                        <FormField
                                            control={form.control}
                                            name={`particulars.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input placeholder="Particular name" {...field} aria-label={`Fee particular ${index + 1} name`} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`particulars.${index}.amount`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="Amount"
                                                            value={field.value || ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                                            aria-label={`Fee particular ${index + 1} amount`}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => remove(index)}
                                            aria-label={`Remove fee particular ${index + 1}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-2"
                                    onClick={() => append({ name: "", amount: 0 })}
                                    aria-label="Add fee particular"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Particular
                                </Button>
                            </div>
                            <Button type="submit" disabled={submitting} aria-label="Assign fee structure">
                                {submitting ? "Assigning..." : "Assign Fee Structure"}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}