'use client'

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function FeeStructuresTable() {
  const { fullUser } = useAuth();
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFees, setSelectedFees] = useState(null);

  useEffect(() => {
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
    if (fullUser?.schoolId) fetchFeeStructures();
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
