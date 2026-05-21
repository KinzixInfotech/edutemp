"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, GitMerge, History, Loader2, MoreVertical, Search, UserPlus, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const LIFECYCLE_STATUSES = ["ALL", "ACTIVE", "ALUMNI", "TC", "LEFT", "DROPPED", "ARCHIVED"];

export default function StudentRegistryPage() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("ALL");
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("ARCHIVE");

  // Re-enroll dialog state
  const [reEnrollDialogOpen, setReEnrollDialogOpen] = useState(false);
  const [reEnrollTarget, setReEnrollTarget] = useState(null); // { studentId, name }
  const [reEnrollClassId, setReEnrollClassId] = useState("");
  const [reEnrollSectionId, setReEnrollSectionId] = useState("");
  const [reEnrollRollNumber, setReEnrollRollNumber] = useState("");
  const [reEnrollJoinedAt, setReEnrollJoinedAt] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [assignedRollNumbers, setAssignedRollNumbers] = useState([]);
  const [rollNumbersLoading, setRollNumbersLoading] = useState(false);

  // TC confirmation dialog state
  const [tcDialogOpen, setTcDialogOpen] = useState(false);
  const [tcTarget, setTcTarget] = useState(null); // { studentId, name }
  const [tcNumber, setTcNumber] = useState("");
  const [tcReason, setTcReason] = useState("");

  const { data = {}, isLoading, isFetching } = useQuery({
    queryKey: ["student-registry", schoolId, search, lifecycleStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", lifecycleStatus });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/schools/${schoolId}/students/registry?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load student registry");
      return json;
    },
    enabled: !!schoolId,
    staleTime: 20 * 1000,
  });

  const registryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/students/registry`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selected,
          action: bulkAction,
          actorId: fullUser?.id || fullUser?.userId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registry update failed");
      return json;
    },
    onSuccess: (result) => {
      toast.success(`${result.updated || 0} student(s) updated`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["student-registry", schoolId] });
    },
    onError: (error) => toast.error(error.message || "Registry update failed"),
  });

  const reEnrollMutation = useMutation({
    mutationFn: async ({ studentId, classId, sectionId, rollNumber, joinedAt }) => {
      const res = await fetch(`/api/schools/${schoolId}/students/registry/re-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          classId,
          sectionId,
          rollNumber,
          joinedAt,
          actorId: fullUser?.id || fullUser?.userId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Re-enroll failed");
      return json;
    },
    onSuccess: () => {
      toast.success("Student re-enrolled");
      setReEnrollDialogOpen(false);
      setReEnrollTarget(null);
      setReEnrollClassId("");
      setReEnrollSectionId("");
      setReEnrollRollNumber("");
      setReEnrollJoinedAt("");
      queryClient.invalidateQueries({ queryKey: ["student-registry", schoolId] });
    },
    onError: (error) => toast.error(error.message || "Re-enroll failed"),
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryStudentId, duplicateStudentId, reason }) => {
      const res = await fetch(`/api/schools/${schoolId}/students/registry/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryStudentId,
          duplicateStudentId,
          reason,
          actorId: fullUser?.id || fullUser?.userId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Merge failed");
      return json;
    },
    onSuccess: (json) => {
      toast.success(`Merged duplicate. ${json.report?.movedEnrollments || 0} enrollment(s) moved.`);
      queryClient.invalidateQueries({ queryKey: ["student-registry", schoolId] });
    },
    onError: (error) => toast.error(error.message || "Merge failed"),
  });

  const tcMutation = useMutation({
    mutationFn: async ({ studentId, tcNumber, reason }) => {
      const res = await fetch(`/api/schools/${schoolId}/students/${studentId}/tc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tcNumber,
          reason,
          actorId: fullUser?.id || fullUser?.userId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "TC issue failed");
      return json;
    },
    onSuccess: () => {
      toast.success("TC issued and student moved out of operational sessions");
      setTcDialogOpen(false);
      setTcTarget(null);
      setTcNumber("");
      setTcReason("");
      queryClient.invalidateQueries({ queryKey: ["student-registry", schoolId] });
    },
    onError: (error) => toast.error(error.message || "TC issue failed"),
  });

  const students = data.students || [];
  const allVisibleSelected = students.length > 0 && students.every((student) => selected.includes(student.userId));
  const toggleStudent = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };
  const openReEnrollDialog = async (studentId, studentName) => {
    setReEnrollTarget({ studentId, name: studentName });
    setReEnrollClassId("");
    setReEnrollSectionId("");
    setReEnrollRollNumber("");
    setReEnrollJoinedAt("");
    setReEnrollDialogOpen(true);
    // Fetch classes for this school
    setClassesLoading(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/classes`);
      const json = await res.json();
      setAvailableClasses(Array.isArray(json) ? json : json.data || []);
    } catch {
      setAvailableClasses([]);
      toast.error("Failed to load classes");
    } finally {
      setClassesLoading(false);
    }
  };
  const confirmReEnroll = () => {
    if (!reEnrollTarget || !reEnrollClassId || !reEnrollSectionId) return;
    reEnrollMutation.mutate({
      studentId: reEnrollTarget.studentId,
      classId: reEnrollClassId,
      sectionId: reEnrollSectionId,
      rollNumber: reEnrollRollNumber,
      joinedAt: reEnrollJoinedAt,
    });
  };
  const selectedClassObj = availableClasses.find((c) => c.id === reEnrollClassId);
  const availableSections = selectedClassObj?.sections || [];

  useEffect(() => {
    async function fetchRollNumbers() {
      if (!reEnrollSectionId || !schoolId) {
        setAssignedRollNumbers([]);
        setReEnrollRollNumber("");
        return;
      }
      setRollNumbersLoading(true);
      try {
        const res = await fetch(`/api/schools/${schoolId}/sections/${reEnrollSectionId}/roll-numbers`);
        const json = await res.json();
        if (res.ok) {
          setAssignedRollNumbers(json.assignedRollNumbers || []);
          if (json.nextRollNumber && !reEnrollRollNumber) {
            setReEnrollRollNumber(json.nextRollNumber);
          }
        }
      } catch (err) {
        console.error("Failed to fetch roll numbers", err);
      } finally {
        setRollNumbersLoading(false);
      }
    }
    fetchRollNumbers();
  }, [reEnrollSectionId, schoolId]);

  // Generate roll number options based on assigned ones
  const numericAssigned = assignedRollNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
  const maxAssigned = numericAssigned.length > 0 ? Math.max(...numericAssigned) : 0;
  const rollNumberOptions = Array.from({ length: Math.max(50, maxAssigned + 10) }, (_, i) => String(i + 1));

  const promptMerge = (duplicateStudentId) => {
    const primaryStudentId = window.prompt("Primary student ID to keep");
    if (!primaryStudentId) return;
    const reason = window.prompt("Merge reason (optional)") || "";
    mergeMutation.mutate({ primaryStudentId, duplicateStudentId, reason });
  };
  const openTcDialog = (studentId, studentName) => {
    setTcTarget({ studentId, name: studentName });
    setTcNumber("");
    setTcReason("");
    setTcDialogOpen(true);
  };
  const confirmTc = () => {
    if (!tcTarget) return;
    tcMutation.mutate({ studentId: tcTarget.studentId, tcNumber, reason: tcReason });
  };

  if (!schoolId) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Student Registry</h1>
          <p className="text-sm text-muted-foreground">
            Every student ever known to the school, separate from current-session operations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/schools/manage-student">Current Session Students</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {LIFECYCLE_STATUSES.filter((status) => status !== "ALL").map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardDescription>{status}</CardDescription>
              <CardTitle className="text-2xl">{data.summary?.[status] || 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students
          </CardTitle>
          <CardDescription>No attendance, fee, or transport operations are run from this registry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, admission number"
                className="pl-9"
              />
            </div>
            <Select value={lifecycleStatus} onValueChange={setLifecycleStatus}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium">{selected.length} selected</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARCHIVE">Archive</SelectItem>
                    <SelectItem value="REACTIVATE">Reactivate</SelectItem>
                    <SelectItem value="MARK_ALUMNI">Mark Alumni</SelectItem>
                    <SelectItem value="MARK_TC">Mark TC</SelectItem>
                    <SelectItem value="MARK_DROPPED">Mark Dropped</SelectItem>
                    <SelectItem value="MARK_LEFT">Mark Left</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => registryMutation.mutate()} disabled={registryMutation.isPending}>
                  {registryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Apply
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => setSelected(event.target.checked ? students.map((student) => student.userId) : [])}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Latest Session</TableHead>
                  <TableHead>Latest Class</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading registry...
                    </TableCell>
                  </TableRow>
                ) : (data.students || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : students.map((student) => (
                  <TableRow key={student.userId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.includes(student.userId)}
                        onChange={() => toggleStudent(student.userId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={student.user?.profilePicture} />
                          <AvatarFallback>{student.name?.[0]?.toUpperCase() || "S"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.admissionNo || "No admission no"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{student.lifecycleStatus}</Badge></TableCell>
                    <TableCell>{student.latestEnrollment?.academicYear?.name || "-"}</TableCell>
                    <TableCell>
                      {(student.latestEnrollment?.class?.className || "-")} / {(student.latestEnrollment?.section?.name || "-")}
                    </TableCell>
                    <TableCell>{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/schools/profiles/students/${student.userId}`}>
                                <Users className="mr-2 h-4 w-4" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/schools/students/${student.userId}/timeline`}>
                                <History className="mr-2 h-4 w-4" />
                                Timeline
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openReEnrollDialog(student.userId, student.name)}
                              disabled={reEnrollMutation.isPending}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Re-enroll
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => promptMerge(student.userId)}
                              disabled={mergeMutation.isPending}
                            >
                              <GitMerge className="mr-2 h-4 w-4" />
                              Merge Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openTcDialog(student.userId, student.name)}
                              disabled={tcMutation.isPending || student.lifecycleStatus === "TC"}
                              className="text-destructive focus:text-destructive"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Issue TC
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Re-enroll Dialog */}
      <AlertDialog open={reEnrollDialogOpen} onOpenChange={setReEnrollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-enroll Student</AlertDialogTitle>
            <AlertDialogDescription>
              Re-enroll <strong>{reEnrollTarget?.name}</strong> into a class and section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Class</label>
              {classesLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading classes...
                </div>
              ) : (
                <Select value={reEnrollClassId} onValueChange={(val) => { setReEnrollClassId(val); setReEnrollSectionId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {reEnrollClassId && (
              <div>
                <label className="text-sm font-medium">Section</label>
                {availableSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-1">No sections found for this class.</p>
                ) : (
                  <Select value={reEnrollSectionId} onValueChange={setReEnrollSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Roll Number (optional)</label>
              <div className="flex flex-col gap-2">
                {rollNumbersLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading roll numbers...
                  </div>
                ) : (
                  <Select value={reEnrollRollNumber} onValueChange={setReEnrollRollNumber}>
                    <SelectTrigger disabled={!reEnrollSectionId}>
                      <SelectValue placeholder={!reEnrollSectionId ? "Select a section first" : "Select a free roll number"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {rollNumberOptions.map((num) => {
                        const isAssigned = assignedRollNumbers.includes(num);
                        return (
                          <SelectItem key={num} value={num} disabled={isAssigned}>
                            {num} {isAssigned ? "(Already Assigned)" : "(Free)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                {assignedRollNumbers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Assigned: {assignedRollNumbers.sort((a, b) => a - b).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Joining Date (optional)</label>
              <Input
                type="date"
                value={reEnrollJoinedAt}
                onChange={(e) => setReEnrollJoinedAt(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setReEnrollTarget(null);
                setReEnrollClassId("");
                setReEnrollSectionId("");
                setReEnrollRollNumber("");
                setReEnrollJoinedAt("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReEnroll}
              disabled={reEnrollMutation.isPending || !reEnrollClassId || !reEnrollSectionId}
            >
              {reEnrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Re-enroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TC Confirmation Dialog */}
      <AlertDialog open={tcDialogOpen} onOpenChange={setTcDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Transfer Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to issue a TC for <strong>{tcTarget?.name}</strong>. This will remove the student from all active sessions and mark them as transferred. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">TC Number (optional)</label>
              <Input
                value={tcNumber}
                onChange={(e) => setTcNumber(e.target.value)}
                placeholder="e.g. TC-2026-0042"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={tcReason}
                onChange={(e) => setTcReason(e.target.value)}
                placeholder="e.g. Parent request, relocation"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setTcTarget(null);
                setTcNumber("");
                setTcReason("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTc}
              disabled={tcMutation.isPending}
              className="bg-destructive text-white!  cursor-pointer hover:bg-transparent! border hover:broder-2 hover:text-red-600! transition-all "
            >
              {tcMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm &amp; Issue TC
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
