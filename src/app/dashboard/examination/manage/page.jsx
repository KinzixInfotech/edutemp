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
import { Loader2, Plus, Calendar, FileText, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";

export default function ExamListPage() {
  const { fullUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

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
                      <Badge
                        variant={
                          exam.status === "PUBLISHED"
                            ? "default"
                            : exam.status === "COMPLETED"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {exam.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/examination/${exam.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteExam(exam.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
