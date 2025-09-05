'use client'

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
export default function FeeStructuresTable() {
    const { fullUser } = useAuth();
    const [feeStructures, setFeeStructures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFees, setSelectedFees] = useState(null);
    const [applyAll, setApplyAll] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedYear, setSelectedYear] = useState(""); // ✅ manage year selection
    const [selectedClass, setSelectedClass] = useState([]);
    const [feeStaus, setFeeStatus] = useState([]);
    useEffect(() => {
        console.log(selectedClass);

    }, [selectedClass])

    const toggleClass = (id) => {
        setSelectedClass((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        )
    }
    useEffect(() => {


        // const fetchStatusApi = async () => {
        //   try {
        //     const res = await fetch(`/api/schools/fee/structures/status?schoolId=${schoolId}`);
        //     if (!res.ok) throw new Error("Failed to fetch");
        //     const data = await res.json();
        //     setFeeStatus(data);
        //   } catch (err) {
        //     console.error(err);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        const fetchClasses = async () => {
            // setFetchingLoading(true);
            if (!fullUser?.schoolId) return;
            try {
                const res = await fetch(`/api/schools/${fullUser?.schoolId}/classes?getAcademicYear=true&academicYearId=ee6dddaa-e44a-4648-9aa2-c93ad5e481a2`);


                const data = await res.json();
                console.log(data);

                const mapped = (Array.isArray(data) ? data : []).flatMap((cls) => {
                    if (Array.isArray(cls.sections) && cls.sections.length > 0) {
                        return cls.sections.map((sec) => ({
                            label: `${cls.className}'${sec.name}`,
                            value: `${cls.id}-${sec.id}`,
                            classId: cls.id,
                            sectionId: sec.id,
                            acyearName: cls.AcademicYear?.name || null,
                            totalStudent: cls._count.students,
                            assigned: cls.isStructureAssigned,
                        }));
                    }

                    return {
                        label: `Class ${cls.className}`,
                        value: `${cls.id}`,
                        classId: cls.id,
                        sectionId: null,
                    };
                });

                console.log(mapped, 'mappeddata'); //  log after mapping
                setClasses(mapped);  //  then update your state
            } catch (err) {
                console.error(err);
                toast.error("Failed to load classes");
                setClasses([]);
            }
            // setFetchingLoading(false);
        };


        const fetchAcademicYears = async () => {
            if (!fullUser?.schoolId) return;
            try {
                const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser?.schoolId}`);
                const data = await res.json();
                setAcademicYears(data || []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load academic years");
                setAcademicYears([]);
            }
        };

        async function fetchFeeStructures() {
            try {
                const res = await fetch(`/api/schools/fee/structures/get?schoolId=${fullUser.schoolId}`);
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setFeeStructures(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (fullUser?.schoolId) {
            fetchFeeStructures();
            fetchClasses();
            fetchAcademicYears();
        }
    }, [fullUser]);

    return (
        <div className="p-6">
            <div className="flex justify-between px-3.5 py-4 items-center mb-4  gap-5 rounded-lg bg-muted lg:flex-row flex-col">
                <Input placeholder="Search by Name..." className="dark:bg-[#171717] bg-white border lg:w-[180px] rounded-lg" />
                <div className="flex gap-1.5 lg:flex-row flex-col lg:w-fit w-full">
                    <Link href="./manage-fee-structure">
                        <Button className='lg:w-fit w-full'>Add Fee Structure</Button>
                    </Link>
                    <Button variant="outline" className='lg:w-fit w-full'>Export</Button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px] !border-none">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>ClassName</TableHead>
                            {/* <TableHead>Class</TableHead> */}
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Total Student</TableHead>
                            <TableHead>Structure Assigned</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : classes.length > 0 ? (
                            classes.map((cls, index) => (
                                <TableRow
                                    key={cls.id}
                                    className={index % 2 === 0 ? "bg-muted" : "bg-background"}
                                >
                                    <TableCell className="py-4 text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="py-4">{cls.label}</TableCell>
                                    <TableCell className="py-4">{cls.acyearName}</TableCell>
                                    <TableCell className="py-4">{cls.totalStudent}</TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={cls.assigned ? "default" : "secondary"}
                                            className="py-1.5 w-32 break-words text-center"
                                        >
                                            {cls.assigned ? `Assigned` : "Not Assigned"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">            <Button
                                        size="sm"
                                        variant="outline"
                                    // onClick={}
                                    >
                                        View
                                    </Button></TableCell>

                                    {/* <TableCell className="py-4">{cls.label}</TableCell> */}

                                    {/* <TableCell className="py-4">{new Date(fee.issueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="py-4">{fee.AcademicYear?.name ?? "N/A"}</TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant={fee.assigned ? "default" : "secondary"}
                                            className="py-1.5 w-32 break-words text-center"
                                        >
                                            {fee.assigned ? `Assigned (${fee.assignedCount} students)` : "Not Assigned"}
                                        </Badge>
                                    </TableCell>  */}

                                    {/* <TableCell className="py-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedFees(fee.feeParticulars)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg   dark:bg-[#171717] bg-white w-full">
                        <DialogHeader>
                          <DialogTitle>{fee.name} - Fee Particulars</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {selectedFees && selectedFees.length > 0 ? (
                            selectedFees.map((f) => (
                              <Card key={f.id} className="border bg-muted">
                                <CardHeader>
                                  <CardTitle className="text-sm font-medium">{f.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  Amount: ₹{f.defaultAmount.toFixed(2)}
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <p>No particulars found</p>
                          )}
                        </div>
                        <DialogClose asChild>
                          <Button className="mt-4 w-full">Close</Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  </TableCell> */}

                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">
                                    No fee structures found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
