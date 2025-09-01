'use client'
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const StatusBadge = ({ status }) => {
  const statusStyles = {
    PENDING: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    PAID: "bg-green-100 text-green-800 border border-green-300",
    UNPAID: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span className={`px-2 py-1 rounded-sm text-sm font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

export default function OrdersTable() {
  const { fullUser } = useAuth();
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeeStructures() {
      try {
        const res = await fetch(
          `/api/schools/fee/structures/get?schoolId=${fullUser.schoolId}`
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setFeeStructures(data);
      } catch (error) {
        console.error("Error fetching fee structures:", error);
      } finally {
        setLoading(false);
      }
    }
    if (fullUser?.schoolId) {
      fetchFeeStructures();
    }
  }, [fullUser]);

  return (
    <div className="p-6">
      <div className="flex justify-between px-3.5 py-4 items-center mb-4 rounded-lg bg-muted">
        <Input placeholder="Search by Name..." className="dark:bg-[#171717] bg-white border lg:w-[180px] rounded-lg" />
        <div className="flex gap-1.5">
          <Link href="./manage-fee-structure">
            <Button >Add Fee Structure
            </Button>
          </Link>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[800px] !border-none">
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Academic Year</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : feeStructures.length > 0 ? (
              feeStructures.map((fee, index) => (
                <TableRow key={fee.id}>
                  <TableCell className='py-4 text-muted-foreground'>{index + 1}</TableCell>
                  <TableCell className='py-4'>{fee.name}</TableCell>
                  <TableCell className='py-4'>${fee.amount.toFixed(2)}</TableCell>
                  <TableCell className='py-4'>{fee.mode}</TableCell>
                  <TableCell className='py-4'>{new Date(fee.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell className='py-4'>{fee.academicYear?.name ?? "N/A"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
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
