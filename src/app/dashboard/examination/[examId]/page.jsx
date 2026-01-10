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
import { Loader2, ArrowLeft, Calendar, Clock, Save, Trash2, Users, Armchair, UserCheck, FileCheck, Search, Lock, RefreshCw, Shield, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [marksStatus, setMarksStatus] = useState([]);

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Evaluator State
  const [evaluators, setEvaluators] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isEvaluatorDialogOpen, setIsEvaluatorDialogOpen] = useState(false);
  const [evaluatorForm, setEvaluatorForm] = useState({
    teacherId: '',
    subjectId: ''
  });
  const [assigningEvaluator, setAssigningEvaluator] = useState(false);

  // Invigilator State
  const [invigilators, setInvigilators] = useState([]);
  const [halls, setHalls] = useState([]);
  const [isInvigilatorDialogOpen, setIsInvigilatorDialogOpen] = useState(false);
  const [invigilatorForm, setInvigilatorForm] = useState({
    teacherId: '',
    hallId: '',
    date: '',
    startTime: '',
    endTime: '',
    role: 'PRIMARY',
    subjectId: ''
  });
  const [assigningInvigilator, setAssigningInvigilator] = useState(false);

  const [teacherSearch, setTeacherSearch] = useState('');

  // Filtered teachers based on search
  const filteredTeachers = teachers.filter(teacher => {
    if (!teacherSearch.trim()) return true;
    const search = teacherSearch.toLowerCase();
    return (
      teacher.name?.toLowerCase().includes(search) ||
      teacher.employeeId?.toLowerCase().includes(search) ||
      teacher.email?.toLowerCase().includes(search)
    );
  });

  // Pagination Logic for Seat Allocation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = allocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(allocations.length / itemsPerPage);

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
      fetchEvaluators();
      fetchTeachers();
      fetchMarksStatus();
      fetchInvigilators();
      fetchHalls();

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

  const fetchEvaluators = async () => {
    try {
      const res = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/evaluators`
      );
      setEvaluators(res.data.evaluators || []);
    } catch (error) {
      console.error("Error fetching evaluators:", error);
    }
  };



  const fetchMarksStatus = async () => {
    try {
      const res = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/marks-status`
      );
      setMarksStatus(res.data.statusData || []);
    } catch (error) {
      console.error("Error fetching marks status:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`/api/schools/${fullUser.schoolId}/teachers`);
      setTeachers(res.data.teachers || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleAssignEvaluator = async () => {
    if (!evaluatorForm.teacherId || !evaluatorForm.subjectId) {
      toast.error('Please select teacher and subject');
      return;
    }
    setAssigningEvaluator(true);
    try {
      let targetClasses = [];

      // Determine target classes
      if (evaluatorForm.classId && evaluatorForm.classId !== 'all') {
        const selectedCls = exam.classes.find(c => String(c.id) === evaluatorForm.classId);
        if (selectedCls) targetClasses = [selectedCls];
      } else {
        targetClasses = exam.classes || [];
      }

      if (targetClasses.length === 0) {
        toast.error('No classes found for assignment');
        return;
      }

      // Assign to target classes
      for (const cls of targetClasses) {
        await axios.post(
          `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/evaluators`,
          { teacherId: evaluatorForm.teacherId, subjectId: evaluatorForm.subjectId, classId: String(cls.id), assignedBy: fullUser.id }
        );
      }

      const message = targetClasses.length === 1
        ? `Evaluator assigned to Class ${targetClasses[0].className}`
        : 'Evaluator assigned to all classes';

      toast.success(message);
      setIsEvaluatorDialogOpen(false);
      setEvaluatorForm({ teacherId: '', subjectId: '', classId: 'all' }); // Reset form
      fetchEvaluators();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign evaluator');
    } finally {
      setAssigningEvaluator(false);
    }
  };

  const handleRemoveEvaluator = async (evaluatorId) => {
    try {
      await axios.delete(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/evaluators?id=${evaluatorId}&userId=${fullUser.id}`
      );
      toast.success('Evaluator removed');
      fetchEvaluators();
    } catch (error) {
      toast.error('Failed to remove evaluator');
    }
  };

  const fetchInvigilators = async () => {
    try {
      const res = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/invigilators`
      );
      setInvigilators(res.data.invigilators || []);
    } catch (error) {
      console.error("Error fetching invigilators:", error);
    }
  };

  const fetchHalls = async () => {
    try {
      const res = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/halls`
      );
      setHalls(res.data || []);
    } catch (error) {
      console.error("Error fetching halls:", error);
    }
  };

  const handleAssignInvigilator = async () => {
    const { teacherId, hallId, date, startTime, endTime, role, subjectId } = invigilatorForm;

    if (!teacherId || !hallId || !date || !startTime || !endTime) {
      toast.error('All fields (Hall, Date, Time, Teacher) are required');
      return;
    }

    setAssigningInvigilator(true);
    try {
      // Construct full ISO strings for start and end time
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      await axios.post(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/invigilators`,
        {
          teacherId,
          hallId,
          date: new Date(date).toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          role,
          assignedBy: fullUser.id
        }
      );

      toast.success('Invigilator assigned and notified');
      setIsInvigilatorDialogOpen(false);
      setInvigilatorForm({
        teacherId: '',
        hallId: '',
        date: '',
        startTime: '',
        endTime: '',
        role: 'PRIMARY',
        subjectId: ''
      });
      fetchInvigilators();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign invigilator');
    } finally {
      setAssigningInvigilator(false);
    }
  };

  const handleSubjectSelect = (subjectId) => {
    // Find subject in exam.subjects (which has includes for date/time)
    const subjectData = exam.subjects.find(s => s.subjectId === parseInt(subjectId));

    if (subjectData) {
      // Format time from "HH:mm" usually stored in ExamSubject or just use what data is there
      // Assuming ExamSubject has { date: DateTime, startTime: String "HH:mm", endTime: String "HH:mm" }

      let newForm = { ...invigilatorForm, subjectId };

      if (subjectData.date) {
        newForm.date = format(new Date(subjectData.date), 'yyyy-MM-dd');
      }
      if (subjectData.startTime) {
        newForm.startTime = subjectData.startTime;
      }
      if (subjectData.endTime) {
        newForm.endTime = subjectData.endTime;
      }
      setInvigilatorForm(newForm);
    } else {
      setInvigilatorForm({ ...invigilatorForm, subjectId });
    }
  };

  const handleRemoveInvigilator = async (id) => {
    try {
      await axios.delete(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}/invigilators?id=${id}`
      );
      toast.success('Invigilator removed');
      fetchInvigilators();
    } catch (error) {
      toast.error('Failed to remove invigilator');
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
        <TabsList className={'bg-[#eef1f3] dark:bg-muted border'}>
          <TabsTrigger value="schedule">Exam Schedule</TabsTrigger>
          <TabsTrigger value="seating">Seat Allocation</TabsTrigger>
          <TabsTrigger value="evaluators">Evaluators</TabsTrigger>
          <TabsTrigger value="invigilators">Invigilators</TabsTrigger>
          <TabsTrigger value="marks">Marks Status</TabsTrigger>
          <TabsTrigger value="students">Classes</TabsTrigger>
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

          <Card className="border-0 shadow-none border">
            <CardContent className="pt-6">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-background/50 bg-muted/50">
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
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No subjects scheduled yet</p>
                            <p className="text-sm text-muted-foreground/70">Click "Add Subject" to schedule exams</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      exam.subjects.map((item, index) => (
                        <TableRow key={item.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="text-xs">
                              {item.subject?.subjectName || `ID: ${item.subjectId}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.date ? format(new Date(item.date), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.startTime} - {item.endTime}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.duration} mins</TableCell>
                          <TableCell className="font-semibold">{item.maxMarks}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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

          <Card className="border-0 shadow-none border">
            <CardContent className="pt-6">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-background/50 bg-muted/50">
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
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Armchair className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No seats allocated</p>
                            <p className="text-sm text-muted-foreground/70">Click "Auto Allocate Seats" to generate seating plan</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((alloc, index) => (
                        <TableRow key={alloc.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                          <TableCell className="font-mono font-bold text-blue-600">{alloc.seatNumber}</TableCell>
                          <TableCell className="font-medium">{alloc.student?.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">{alloc.student?.rollNumber}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {alloc.student?.class?.className} - {alloc.student?.section?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{alloc.hall?.name}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* PAGINATION CONTROLS */}
              {allocations.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, allocations.length)} of {allocations.length} students
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center px-2 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVALUATORS TAB */}
        <TabsContent value="evaluators" className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">How Evaluation Works</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li><strong>Assign Teachers</strong>: Select a teacher and assign them to a Subject and Class.</li>
                  <li><strong>Teacher Access</strong>: Assigned teachers will see this exam in their portal (<code className="text-xs bg-blue-200/50 px-1 rounded">teacher.edubreezy.com</code>).</li>
                  <li><strong>Marks Entry</strong>: They can enter marks and save as "Draft".</li>
                  <li><strong>Submission</strong>: Once they "Submit", marks are locked for them. You can check the status in the "Marks Status" tab.</li>
                </ul>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-none border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    Evaluator Assignments ({evaluators.length})
                  </CardTitle>
                  <CardDescription>
                    Assign teachers to enter marks. They will be assigned to specific classes or all classes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchEvaluators} title="Refresh Evaluators">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Dialog open={isEvaluatorDialogOpen} onOpenChange={setIsEvaluatorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserCheck className="mr-2 h-4 w-4" /> Assign Evaluator
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Evaluator</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Teacher *</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name, ID, or email..."
                              value={teacherSearch}
                              onChange={(e) => setTeacherSearch(e.target.value)}
                              className="pl-9 mb-2"
                            />
                          </div>
                          <Select
                            value={evaluatorForm.teacherId}
                            onValueChange={(value) => setEvaluatorForm({ ...evaluatorForm, teacherId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {filteredTeachers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No teachers found
                                </div>
                              ) : (
                                filteredTeachers.map((teacher) => (
                                  <SelectItem key={teacher.userId} value={teacher.userId}>
                                    <div className="flex flex-col">
                                      <span>{teacher.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {teacher.employeeId} • {teacher.email}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Subject *</Label>
                          <Select
                            value={evaluatorForm.subjectId}
                            onValueChange={(value) => setEvaluatorForm({ ...evaluatorForm, subjectId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={String(subject.id)}>
                                  {subject.subjectName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Class Selection - Only show if multiple classes */}
                        {exam.classes && exam.classes.length > 1 && (
                          <div className="space-y-2">
                            <Label>Class *</Label>
                            <Select
                              value={evaluatorForm.classId || "all"}
                              onValueChange={(value) => setEvaluatorForm({ ...evaluatorForm, classId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Participating Classes</SelectItem>
                                {exam.classes.map((cls) => (
                                  <SelectItem key={cls.id} value={String(cls.id)}>
                                    {cls.className}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>How it works:</strong>
                            <br />
                            {exam.classes && exam.classes.length > 1 ? (
                              evaluatorForm.classId && evaluatorForm.classId !== "all" ? (
                                <>The selected teacher will be assigned to evaluate <strong>{subjects.find(s => String(s.id) === evaluatorForm.subjectId)?.subjectName || 'the subject'}</strong> for <strong>Class {exam.classes.find(c => String(c.id) === evaluatorForm.classId)?.className}</strong> only.</>
                              ) : (
                                <>The selected teacher will be assigned to evaluate <strong>{subjects.find(s => String(s.id) === evaluatorForm.subjectId)?.subjectName || 'the subject'}</strong> for <strong>ALL {exam.classes.length} participating classes</strong>.</>
                              )
                            ) : (
                              <>The selected teacher will be assigned to evaluate <strong>{subjects.find(s => String(s.id) === evaluatorForm.subjectId)?.subjectName || 'the subject'}</strong> for <strong>Class {exam.classes?.[0]?.className}</strong>.</>
                            )}
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEvaluatorDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAssignEvaluator} disabled={assigningEvaluator}>
                          {assigningEvaluator && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirm Assignment
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-background/50 bg-muted/50">
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Evaluator</TableHead>
                      <TableHead>Assigned On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <UserCheck className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No evaluators assigned yet</p>
                            <p className="text-sm text-muted-foreground/70">Click "Assign Evaluator" to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluators.map((ev, index) => (
                        <TableRow key={ev.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="text-xs">
                              {ev.subject?.subjectName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{ev.class?.className}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-sm">
                                {ev.teacher?.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{ev.teacher?.name}</p>
                                <p className="text-xs text-muted-foreground">{ev.teacher?.employeeId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ev.assignedAt ? format(new Date(ev.assignedAt), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => handleRemoveEvaluator(ev.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVIGILATORS TAB */}
        <TabsContent value="invigilators" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Invigilator Assignments</h2>
              <p className="text-sm text-muted-foreground">
                Assign teachers to exam halls as invigilators. Supports overlapping shifts.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchInvigilators} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={isInvigilatorDialogOpen} onOpenChange={setIsInvigilatorDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Shield className="mr-2 h-4 w-4" /> Assign Invigilator
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Assign Invigilator</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Hall *</Label>
                      <Select
                        value={invigilatorForm.hallId}
                        onValueChange={(val) => setInvigilatorForm({ ...invigilatorForm, hallId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select examination hall" />
                        </SelectTrigger>
                        <SelectContent>
                          {halls.map((hall) => (
                            <SelectItem key={hall.id} value={hall.id}>
                              {hall.name} ({hall.roomNumber || 'No Room No'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Subject (Optional)</Label>
                      <Select
                        value={invigilatorForm.subjectId}
                        onValueChange={handleSubjectSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-fill time from subject..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (General Duty)</SelectItem>
                          {exam?.subjects?.map((sub) => (
                            <SelectItem key={sub.subjectId} value={sub.subjectId.toString()}>
                              {sub.subject.subjectName} ({sub.date ? format(new Date(sub.date), 'dd MMM') : ''} {sub.startTime}-{sub.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">Selecting a subject auto-fills date & time.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={invigilatorForm.date || ''}
                        onChange={(e) => setInvigilatorForm({ ...invigilatorForm, date: e.target.value })}
                        min={exam ? format(new Date(exam.startDate), 'yyyy-MM-dd') : ''}
                        max={exam?.endDate ? format(new Date(exam.endDate), 'yyyy-MM-dd') : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={invigilatorForm.role || 'PRIMARY'}
                        onValueChange={(val) => setInvigilatorForm({ ...invigilatorForm, role: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRIMARY">Primary Invigilator</SelectItem>
                          <SelectItem value="ASSISTANT">Assistant Invigilator</SelectItem>
                          <SelectItem value="RELIEF">Relief / Substitute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Input
                        type="time"
                        value={invigilatorForm.startTime || ''}
                        onChange={(e) => setInvigilatorForm({ ...invigilatorForm, startTime: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Time *</Label>
                      <Input
                        type="time"
                        value={invigilatorForm.endTime || ''}
                        onChange={(e) => setInvigilatorForm({ ...invigilatorForm, endTime: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label>Teacher *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, ID, or email..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="pl-9 mb-2"
                        />
                      </div>
                      <Select
                        value={invigilatorForm.teacherId}
                        onValueChange={(val) => setInvigilatorForm({ ...invigilatorForm, teacherId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {filteredTeachers.length > 0 ? filteredTeachers.map((teacher) => (
                            <SelectItem key={teacher.userId} value={teacher.userId}>
                              {teacher.name} ({teacher.employeeId})
                            </SelectItem>
                          )) : <SelectItem disabled value="none">No teachers found</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInvigilatorDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAssignInvigilator} disabled={assigningInvigilator}>
                      {assigningInvigilator && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Assign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-0 shadow-none border">
            <CardContent className="pt-6">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-background/50 bg-muted/50">
                      <TableHead>Hall / Room</TableHead>
                      <TableHead>Invigilator</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invigilators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Shield className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No invigilators assigned</p>
                            <p className="text-sm text-muted-foreground/70">Assign teachers for shifts</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invigilators.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <div className="font-medium">{inv.hall.name}</div>
                            <div className="text-xs text-muted-foreground">Room: {inv.hall.roomNumber || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{inv.teacher.name}</div>
                            <div className="text-xs text-muted-foreground">{inv.teacher.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{inv.date ? format(new Date(inv.date), "MMM d, yyyy") : '-'}</div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {inv.startTime ? format(new Date(inv.startTime), "h:mm a") : ''} - {inv.endTime ? format(new Date(inv.endTime), "h:mm a") : ''}
                            </div>
                            {inv.subject && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {inv.subject.subjectName}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              inv.role === 'PRIMARY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                inv.role === 'ASSISTANT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                            }>
                              {inv.role || 'PRIMARY'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleRemoveInvigilator(inv.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MARKS STATUS TAB */}
        <TabsContent value="marks" className="space-y-4">
          <Card className="border-0 shadow-none border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    Marks Entry Status
                  </CardTitle>
                  <CardDescription>
                    Track marks submission progress by evaluators
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchMarksStatus} title="Refresh Status">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-background/50 bg-muted/50">
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marksStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <FileCheck className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No evaluators assigned yet</p>
                            <p className="text-sm text-muted-foreground/70">Assign evaluators first to enable marks entry</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      marksStatus.map((status, index) => (
                        <TableRow key={index} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                          <TableCell className="font-medium">
                            {status.subjectName}
                          </TableCell>
                          <TableCell>{status.className}</TableCell>
                          <TableCell>
                            {status.status === 'SUBMITTED' || status.status === 'PUBLISHED' ? (
                              <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-100">Submitted</Badge>
                            ) : status.status === 'DRAFT' ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-0">Draft</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground border-dashed">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {status.teacherName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {status.submittedAt ? format(new Date(status.submittedAt), "MMM d, yyyy h:mm a") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Actions like Unlock can be added here */}
                            {status.status === 'SUBMITTED' && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Unlock Marks">
                                <Lock className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STUDENTS TAB */}
        <TabsContent value="students">
          <Card className="border-0 shadow-none border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Participating Classes ({exam.classes.length})
              </CardTitle>
              <CardDescription>
                Classes included in this examination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {exam.classes.map(cls => (
                  <Badge key={cls.id} variant="secondary" className="text-base px-4 py-2 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
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
