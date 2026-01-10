"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, FileText, Trash2, Edit, Copy, Link2, Check, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ExamListPage() {
  const { fullUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  // Share Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [previewData, setPreviewData] = useState(null);



  const handleSharePreview = (exam) => {
    const url = `${window.location.origin}/exam/${exam.id}`;
    const startDate = exam.startDate ? format(new Date(exam.startDate), "dd MMM yyyy") : "TBD";

    let scheduleSection = "";
    if (exam.subjects && exam.subjects.length > 0) {
      const subjectDetails = exam.subjects.map(s => {
        const dateStr = s.date ? format(new Date(s.date), "dd MMM") : "TBD";
        const timeStr = s.startTime ? `${s.startTime} - ${s.endTime}` : "TBD";
        return `• ${s.subject?.subjectName || "Subject"}: ${dateStr} (${timeStr})`;
      }).join('\n');
      scheduleSection = `\n*📝 Exam Schedule:*\n${subjectDetails}\n`;
    } else {
      scheduleSection = "\n*📝 Exam Schedule:*\nNo specific subjects scheduled.\n";
    }

    const text = `Dear Student/Parent,\n\nThe online exam *"${exam.title}"* has been scheduled starting from ${startDate}\n🔗 *Exam Link:* ${url}\n\nPlease ensure you are ready before the start time.\n\nBest Regards,\nSchool Administration`;

    setShareText(text);
    setShareUrl(url);
    setPreviewData(exam);
    setPreviewOpen(true);
  };

  useEffect(() => {
    if (fullUser?.schoolId) {
      fetchExams();
    }
  }, [fullUser?.schoolId]);

  const fetchExams = async () => {
    try {
      const response = await axios.get(
        `/api/schools/${fullUser.schoolId}/examination/exams`
      );
      setExams(response.data);
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (examId) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      await axios.delete(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}`
      );
      toast.success("Exam deleted successfully");
      fetchExams();
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    }
  };

  const openDeleteDialog = (exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;

    try {
      await axios.delete(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examToDelete.id}`
      );
      toast.success("Exam deleted successfully");
      fetchExams();
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    }
  };

  const copyExamUrl = (examId) => {
    const url = `${window.location.origin}/exam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(examId);
    toast.success("Exam URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateExamStatus = async (examId, newStatus) => {
    try {
      await axios.put(
        `/api/schools/${fullUser.schoolId}/examination/exams/${examId}`,
        { status: newStatus }
      );
      toast.success(`Exam status updated to ${newStatus}`);
      fetchExams();
    } catch (error) {
      console.error("Error updating exam status:", error);
      toast.error("Failed to update exam status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam Management</h1>
          <p className="text-muted-foreground">
            Manage and schedule exams for your school.
          </p>
        </div>
        <Link href="/dashboard/examination/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create New Exam
          </Button>
        </Link>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Preview</DialogTitle>
            <DialogDescription>
              Preview the message before sharing on WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-[#E5DDD5] dark:bg-[#121b22] p-4 rounded-lg max-h-[400px] overflow-y-auto">
              <div className="bg-white dark:bg-[#202c33] p-3 rounded-md shadow-sm border-none relative text-sm dark:text-[#d1d7db]">
                <p>Dear Student/Parent,</p>
                <br />
                <p>
                  The online exam <strong>"{previewData?.title}"</strong> has been scheduled starting from{" "}
                  <strong>
                    {previewData?.startDate
                      ? format(new Date(previewData.startDate), "dd MMM yyyy")
                      : "TBD"}
                  </strong>
                  .
                </p>
                <br />
                <p>
                  🔗 <strong>Exam Link:</strong>
                </p>
                <p className="text-blue-500 break-all">{shareUrl}</p>
                <br />
                <p>Please ensure you are ready before the start time.</p>
                <br />
                <p>Best Regards,</p>
                <p>School Administration</p>

                {/* Time stamp simulation */}
                <div className="text-[10px] text-gray-500 text-right mt-1">
                  {format(new Date(), "hh:mm a")}
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-2">
              This message will be sent via WhatsApp.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                window.open(whatsappUrl, '_blank');
                setPreviewOpen(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No exams found. Create your first exam to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{exam.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {exam._count?.subjects || 0} Subjects
                        </span>
                        {exam.type === 'ONLINE' && (
                          <div className="flex items-center gap-1 mt-1">
                            <Link2 className="h-3 w-3 text-primary" />
                            <span className="text-xs text-primary font-mono">
                              /exam/{exam.id}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.type}</Badge>
                    </TableCell>
                    <TableCell>{exam.academicYear?.name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {exam.classes.slice(0, 3).map((cls) => (
                          <Badge key={cls.id} variant="secondary" className="text-xs">
                            {cls.className}
                          </Badge>
                        ))}
                        {exam.classes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{exam.classes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {exam.startDate
                        ? format(new Date(exam.startDate), "MMM d, yyyy")
                        : "Not set"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={exam.status}
                        onValueChange={(newStatus) => updateExamStatus(exam.id, newStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">DRAFT</SelectItem>
                          <SelectItem value="PUBLISHED">PUBLISHED</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {exam.type === 'ONLINE' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSharePreview(exam)}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyExamUrl(exam.id)}
                            >
                              {copiedId === exam.id ? (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy URL
                                </>
                              )}
                            </Button>
                            <Link href={`/dashboard/examination/builder/${exam.id}`}>
                              <Button variant="outline" size="sm">
                                <FileText className="mr-2 h-4 w-4" />
                                Builder
                              </Button>
                            </Link>
                          </>
                        )}
                        <Link href={`/dashboard/examination/${exam.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(exam)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{examToDelete?.title}</strong>?
              <br />
              This action cannot be undone and will permanently remove the exam and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
