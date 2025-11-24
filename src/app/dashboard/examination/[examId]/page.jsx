"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Calendar, Clock, Save, Trash2, Users, Armchair } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";

export default function ExamDetailsPage() {
  const { fullUser } = useAuth();
  const params = useParams();
  const examId = params.examId;
  const router = useRouter();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]); // All available subjects for the classes

  // Schedule Form State
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    subjectId: "",
    date: "",
    startTime: "",
    endTime: "",
    duration: "180",
    maxMarks: "100",
    passingMarks: "33",
  });

  // Seat Allocation State
  const [allocatingSeats, setAllocatingSeats] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);

  useEffect(() => {
    if (fullUser?.schoolId && examId) {
      fetchExamDetails();
    }
  }, [fullUser?.schoolId, examId]);

  const fetchExamDetails = async () => {
    try {
      const response = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}`
      );
      setExam(response.data);

      // Fetch available subjects for the school
      try {
        const subjectsRes = await axios.get(
          `/api/schools/${fullUser.schoolId}/subjects`
        );
        setSubjects(subjectsRes.data);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }

      fetchAllocations();

    } catch (error) {
      console.error("Error fetching exam:", error);
      toast.error("Failed to fetch exam details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const res = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/seat-allocation`
      );
      setAllocations(res.data);
    } catch (error) {
      console.error("Error fetching allocations:", error);
    }
  };

  const handleScheduleSubmit = async () => {
    try {
      await axios.post(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/schedule`,
        scheduleForm
      );
      toast.success("Schedule updated");
      setIsScheduleDialogOpen(false);
      fetchExamDetails();
    } catch (error) {
      console.error("Error scheduling:", error);
      toast.error("Failed to update schedule");
    }
  };

  const confirmAutoAllocate = useCallback(() => {
    setAllocatingSeats(true);
    setShowAllocateConfirm(false);

    axios.post(
      `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/seat-allocation`
    )
      .then((res) => {
        toast.success(res.data.message);
        return fetchAllocations();
      })
      .catch((error) => {
        console.error("Error allocating:", error);
        toast.error(error.response?.data?.error || "Failed to allocate seats");
      })
      .finally(() => {
        setAllocatingSeats(false);
      });
  }, [fullUser?.schoolId, examId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!exam) return <div>Exam not found</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/examination/manage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="outline">{exam.type}</Badge>
            <span>•</span>
            <span>{exam.academicYear?.name}</span>
            <span>•</span>
            <span>
              {exam.startDate ? format(new Date(exam.startDate), "MMM d") : "No Date"}
              {" - "}
              {exam.endDate ? format(new Date(exam.endDate), "MMM d, yyyy") : "No Date"}
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant={exam.status === 'PUBLISHED' ? "default" : "outline"}>
            {exam.status}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Exam Schedule</TabsTrigger>
          <TabsTrigger value="seating">Seat Allocation</TabsTrigger>
          <TabsTrigger value="students">Participating Students</TabsTrigger>
        </TabsList>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Subject Schedule</h2>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="mr-2 h-4 w-4" /> Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Subject</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Subject</Label>
                    <div className="col-span-3">
                      {subjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No subjects available. Please create subjects first.
                        </p>
                      ) : (
                        <Select
                          value={scheduleForm.subjectId}
                          onValueChange={(val) => setScheduleForm({ ...scheduleForm, subjectId: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id.toString()}>
                                {subject.subjectName} ({subject.class?.className})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Date</Label>
                    <Input
                      type="date"
                      className="col-span-3"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Time</Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        type="time"
                        placeholder="Start"
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                      />
                      <Input
                        type="time"
                        placeholder="End"
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Max Marks</Label>
                    <Input
                      type="number"
                      className="col-span-3"
                      value={scheduleForm.maxMarks}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, maxMarks: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleScheduleSubmit}>Save Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Max Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exam.subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No subjects scheduled yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exam.subjects.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.subject?.subjectName || `ID: ${item.subjectId}`}
                        </TableCell>
                        <TableCell>
                          {item.date ? format(new Date(item.date), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {item.startTime} - {item.endTime}
                        </TableCell>
                        <TableCell>{item.duration} mins</TableCell>
                        <TableCell>{item.maxMarks}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEATING TAB */}
        <TabsContent value="seating" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Seat Allocation</h2>
              <p className="text-sm text-muted-foreground">
                Allocated: {allocations.length} students
              </p>
            </div>
            <Button onClick={() => setShowAllocateConfirm(true)} disabled={allocatingSeats}>
              {allocatingSeats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Armchair className="mr-2 h-4 w-4" />}
              Auto Allocate Seats
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Hall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No seats allocated. Click "Auto Allocate" to generate seating plan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-mono font-bold">{alloc.seatNumber}</TableCell>
                        <TableCell>{alloc.student?.name}</TableCell>
                        <TableCell>{alloc.student?.rollNumber}</TableCell>
                        <TableCell>
                          {alloc.student?.class?.className} - {alloc.student?.section?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{alloc.hall?.name}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STUDENTS TAB */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Participating Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {exam.classes.map(cls => (
                  <Badge key={cls.id} className="text-base px-3 py-1">
                    {cls.className}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Confirmation Dialog for Auto Allocate */}
      <AlertDialog open={showAllocateConfirm} onOpenChange={setShowAllocateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto Allocate Seats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear any existing seat allocations and automatically re-allocate seats
              based on available halls and enrolled students. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoAllocate}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
