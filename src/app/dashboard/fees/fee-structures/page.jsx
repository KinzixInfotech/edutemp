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
  const [open, setopen] = useState(false)
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
  const fetchClasses = async () => {
    // setFetchingLoading(true);
    if (!fullUser?.schoolId) return;
    try {
      const res = await fetch(`/api/schools/${fullUser?.schoolId}/classes`);


      const data = await res.json();
      console.log(data);

      const mapped = (Array.isArray(data) ? data : []).flatMap((cls) => {
        if (Array.isArray(cls.sections) && cls.sections.length > 0) {
          return cls.sections.map((sec) => ({
            label: `${cls.className}'${sec.name}`,
            value: `${cls.id}-${sec.id}`,
            classId: cls.id,
            sectionId: sec.id,
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
              <TableHead>Name</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Academic Year</TableHead>
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
            ) : feeStructures.length > 0 ? (
              feeStructures.map((fee, index) => (
                <TableRow
                  key={fee.id}
                  className={index % 2 === 0 ? "bg-muted" : "bg-background"}
                >
                  <TableCell className="py-4 text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="py-4">{fee.name}</TableCell>
                  <TableCell className="py-4">{fee.mode}</TableCell>
                  <TableCell className="py-4">{new Date(fee.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell className="py-4">{fee.AcademicYear?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant={fee.assigned ? "default" : "secondary"}
                      className="py-1.5 w-32 break-words text-center"
                    >
                      {fee.assigned ? `Assigned (${fee.assignedCount} students)` : "Not Assigned"}
                    </Badge>
                  </TableCell>

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
                  <TableCell className="py-4">
                    <div className="flex gap-2">
                      {/* Assign Fee Structure */}
                      <Dialog open={open} onOpenChange={setopen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-green-600 text-white">
                            Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg dark:bg-[#171717] bg-white w-full">
                          <DialogHeader>
                            <DialogTitle>Assign Fee Structure</DialogTitle>
                          </DialogHeader>
                          <form
                            className="space-y-4"
                            onSubmit={async (e) => {
                              e.preventDefault();

                              const body = {
                                feeStructureId: fee.id,
                                academicYearId: selectedYear,
                                classId: selectedClass, // array of ids like ["1-2", "3"]
                                applyToAllStudents: applyAll, // ✅ direct from state
                              };

                              try {
                                const res = await fetch("/api/schools/fee/structures/assign", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(body),
                                });

                                const data = await res.json();
                                if (data.success === true) {
                                  toast.success(`Fee structure assigned to ${data.count} students successfully!`)
                                  await fetchClasses();       // refresh classes
                                  setopen(false)
                                } else {
                                  toast.error(data.error || "Failed to assign fee structure")
                                  setopen(false)

                                }
                              } catch (err) {
                                console.error(err);
                                setopen(false)

                                toast.error("Server error while assigning")
                              }
                            }}
                          >
                            {/* Academic Year */}
                            <div>
                              <label className="block text-sm mb-1">Session (Academic Year)</label>
                              <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select academic year" />
                                </SelectTrigger>
                                <SelectContent>
                                  {academicYears.length > 0 ? (
                                    academicYears.map((year) => (
                                      <SelectItem key={year.id} value={year.id}>
                                        {year.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 font-semibold">
                                      <Link
                                        href="/dashboard/schools/manage-fee-structure"
                                        className="text-muted-foreground flex flex-row items-center font-normal text-sm justify-center"
                                      >
                                        Create <Plus size={14} />
                                      </Link>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Class */}
                            {
                              selectedYear.length > 0 && !applyAll && (
                                <div>
                                  <label className="block text-sm mb-1">Class</label>
                                  {/* <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {classes.length > 0 ? (
                                        classes.map((cls) => (
                                          <SelectItem key={cls.value} value={cls.value}>
                                            {cls.label}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="p-2 font-semibold">
                                          <Link
                                            href="/dashboard/schools/create-classes"
                                            className="text-muted-foreground flex flex-row items-center font-normal text-sm justify-center"
                                          >
                                            Create Classes <Plus size={14} />
                                          </Link>
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select> */}
                                  <Popover >
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-between">
                                        {selectedClass.length > 0
                                          ? `${selectedClass.length} classes selected`
                                          : "Select classes"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                      <Command>
                                        <CommandGroup>
                                          {classes.map((cls) => (
                                            <CommandItem
                                              key={cls.id}
                                              onSelect={() => toggleClass(cls.classId)}
                                              className="flex items-center space-x-2"
                                            >
                                              <Checkbox checked={selectedClass.includes(cls.classId)} />
                                              <span>{cls.label}</span>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                              )
                            }

                            {/* Checkbox */}
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="applyAll"
                                checked={applyAll}
                                onCheckedChange={(checked) => setApplyAll(!!checked)}
                              />
                              <label
                                htmlFor="applyAll"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Apply to all students in class
                              </label>
                            </div>

                            <Button type="submit" className="w-full">
                              Assign
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedFees(fee.feeParticulars)}
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg dark:bg-[#171717] bg-white w-full">
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
                    </div>

                  </TableCell>
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
