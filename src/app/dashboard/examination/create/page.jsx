"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function CreateExamPage() {
  const { fullUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    type: "OFFLINE",
    academicYearId: "",
    startDate: "",
    endDate: "",
    classIds: [],
    isFinalExam: false,
    description: "",
  });

  useEffect(() => {
    if (fullUser?.schoolId) {
      fetchInitialData();
    }
  }, [fullUser?.schoolId]);

  const fetchInitialData = async () => {
    try {
      const [yearsRes, classesRes] = await Promise.all([
        axios.get(`/api/schools/${fullUser.schoolId}/academic-years`),
        axios.get(`/api/schools/${fullUser.schoolId}/classes`),
      ]);
      setAcademicYears(yearsRes.data);
      setClasses(classesRes.data);

      // Set default academic year if active exists
      const activeYear = yearsRes.data.find(y => y.isActive);
      if (activeYear) {
        setFormData(prev => ({ ...prev, academicYearId: activeYear.id }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load form data");
    } finally {
      setFetchingData(false);
    }
  };

  const handleClassToggle = (classId) => {
    setFormData((prev) => {
      const current = prev.classIds;
      if (current.includes(classId)) {
        return { ...prev, classIds: current.filter((id) => id !== classId) };
      } else {
        return { ...prev, classIds: [...current, classId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.academicYearId || formData.classIds.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `/api/schools/${fullUser.schoolId}/examination/exams`,
        formData
      );
      toast.success("Exam created successfully");

      if (formData.type === 'ONLINE') {
        router.push(`/dashboard/examination/builder/${res.data.id}`);
      } else {
        router.push("/dashboard/examination/manage");
      }
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error("Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/examination/manage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Exam</h1>
          <p className="text-muted-foreground">
            Set up a new examination for your school.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Mid-Term Examination 2024"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Exam Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({ ...formData, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFLINE">Offline (Paper-based)</SelectItem>
                    <SelectItem value="ONLINE">Online (CBT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select
                  value={formData.academicYearId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, academicYearId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFinalExam"
                  checked={formData.isFinalExam}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFinalExam: checked })
                  }
                />
                <Label
                  htmlFor="isFinalExam"
                  className="text-sm font-medium cursor-pointer"
                >
                  Mark as Final Exam
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Final exams are used for student promotion decisions.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional: Add exam description or instructions..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Participating Classes *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border p-4 rounded-md">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={formData.classIds.includes(cls.id)}
                      onCheckedChange={() => handleClassToggle(cls.id)}
                    />
                    <Label
                      htmlFor={`class-${cls.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {cls.className}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.classIds.length === 0 && (
                <p className="text-xs text-destructive">
                  Please select at least one class.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exam
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
