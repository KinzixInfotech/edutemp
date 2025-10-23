'use client'

import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

export default function StudentFeesTable() {
  const { fullUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    async function fetchStudents() {
      if (!fullUser?.schoolId) return;

      try {
        const res = await fetch(`/api/schools/fee/payment/student/get?schoolId=${fullUser.schoolId}`);
        if (!res.ok) throw new Error("Failed to fetch students");
        const data = await res.json();
        setStudents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [fullUser?.schoolId]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Students Fee Overview</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted sticky top-0 z-10">
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Fees Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
              </TableRow>
            ) : students.length > 0 ? (
              students.map((student, index) => (
                <TableRow key={student.userId} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.classId ?? "N/A"}</TableCell>
                  <TableCell>{student.StudentFeeStructure.length}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>
                          View Fees
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Fee Details - {student.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {selectedStudent?.StudentFeeStructure.map((fs) => (
                            <div key={fs.id} className="border rounded-lg p-4">
                              <h3 className="font-medium mb-2">{fs.name} ({fs.mode})</h3>
                              <Table className="w-full">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Particular</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fs.feeParticulars.map((fp, idx) => (
                                    <TableRow key={fp.id} className={idx % 2 === 0 ? "bg-muted" : "bg-background"}>
                                      <TableCell>{idx + 1}</TableCell>
                                      <TableCell>{fp.globalParticular.name}</TableCell>
                                      <TableCell>₹{fp.amount.toFixed(2)}</TableCell>
                                      <TableCell>
                                        <span className={`px-2 py-1 rounded-sm text-sm font-medium ${fp.status === "PAID" ? "bg-green-100 text-green-800" :
                                            fp.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                              "bg-red-100 text-red-800"
                                          }`}>
                                          {fp.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">No students found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
