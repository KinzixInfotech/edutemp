'use client'

import { useEffect, useState, useCallback } from "react";
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
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { numberToWordsIndian } from "@/lib/utils";

// Schema for editing fee structure
const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
  feeParticulars: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Name is required"),
        amount: z.number().positive("Amount must be positive"),
      })
    )
    .min(1, "At least one particular is required"),
});

export default function FeeStructuresTable() {
  const { fullUser } = useAuth();
  const [feeStructures, setFeeStructures] = useState([]);
  const [filteredFeeStructures, setFilteredFeeStructures] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFees, setSelectedFees] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      mode: "MONTHLY",
      feeParticulars: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "feeParticulars",
  });

  // Fetch fee structures
  // const fetchFeeStructures = useCallback(async () => {
  //   if (!fullUser?.schoolId) return;
  //   setLoading(true);
  //   try {
  //     const res = await fetch(`/api/schools/fee/structures?schoolId=${fullUser.schoolId}`, {
  //       method: "GET",
  //     }
  //     );

  //     if (!res.ok) throw new Error("Failed to fetch fee structures");
  //     const data = await res.json();
  //     setFeeStructures(data);
  //     setFilteredFeeStructures(data);
  //   } catch (err) {
  //     console.error(err);
  //     toast.error(err.message || "Failed to load fee structures");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [fullUser]);

  const fetchFeeStructures = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/schools/fee/structures?schoolId=${fullUser.schoolId}`
      );
      if (!res.ok) throw new Error("Failed to fetch fee structures");
      const data = await res.json();
      setFeeStructures(data);
      setFilteredFeeStructures(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!fullUser?.schoolId) return; // don't fetch until fullUser is ready
    fetchFeeStructures();
  }, [fullUser?.schoolId]);


  // Handle search
  useEffect(() => {
    setFilteredFeeStructures(
      feeStructures.filter((fee) =>
        fee.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, feeStructures]);

  const openEditDialog = (fee) => {
    form.reset({
      name: fee.name.split('-')[0], // Remove mode and year suffix
      mode: fee.mode,
      feeParticulars: fee.feeParticulars.map((p) => ({
        id: p.id,
        name: p.name,
        amount: Number(p.defaultAmount), // Ensure number
      })),
    });
    setSelectedFeeStructure(fee);
    setEditOpen(true);
  };

  const handleEditSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/fee/structures`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedFeeStructure.id, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update fee structure");
      }
      toast.success("Fee structure updated successfully");
      setEditOpen(false);
      form.reset();
      await fetchFeeStructures();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/schools/fee/structures?id=${selectedFeeStructure.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete fee structure");
      }
      toast.success("Fee structure deleted successfully");
      setDeleteOpen(false);
      await fetchFeeStructures();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between px-3.5 py-4 items-center mb-4 gap-5 rounded-lg bg-muted lg:flex-row flex-col">
        <Input
          placeholder="Search by Name..."
          className="dark:bg-[#171717] bg-white border lg:w-[180px] rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search fee structures"
        />
        <div className="flex gap-1.5 lg:flex-row flex-col lg:w-fit w-full">
          <Link href="./manage-fee-structure">
            <Button className="lg:w-fit w-full">Add Fee Structure</Button>
          </Link>
          <Button variant="outline" className="lg:w-fit w-full">Export</Button>
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
              <TableHead className="text-left">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredFeeStructures.length > 0 ? (
              filteredFeeStructures.map((fee, index) => (
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
                  <TableCell className="py-4 flex flex-row gap-2.5">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedFees(fee.feeParticulars)}
                          aria-label={`View particulars for ${fee.name}`}
                        >
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg dark:bg-[#171717] bg-white w-full overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>{fee.name} - Fee Particulars</DialogTitle>
                        </DialogHeader>
                        {/* <div className="space-y-2">
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
                        </div> */}
                        <div className="space-y-4">
                          {selectedFees && selectedFees.length > 0 ? (

                            <div className="border rounded-lg p-4">
                              {/* <h3 className="font-medium mb-2">{fs.name} ({fs.mode})</h3> */}
                              <Table className="w-full">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Particular</TableHead>
                                    <TableHead>Amount</TableHead>

                                  </TableRow>
                                </TableHeader>
                                <TableBody>

                                  {selectedFees.map((f, idx) => (
                                    <TableRow
                                      key={f.id}
                                      className={idx % 2 === 0 ? "bg-muted" : "bg-background"}
                                    >
                                      <TableCell>{idx + 1}</TableCell>
                                      <TableCell>{f.name}</TableCell>
                                      <TableCell>₹{f.defaultAmount.toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}

                                  {/* Total Row */}
                                  <TableRow className="font-semibold">
                                    <TableCell colSpan={2} className="text-right">
                                      Total
                                    </TableCell>

                                    <TableCell>

                                      <div
                                        className="text-xs text-muted-foreground mt-1 whitespace-normal break-words p-1 "
                                        style={{ maxWidth: "200px" }}
                                      >
                                        {numberToWordsIndian(
                                          selectedFees.reduce((sum, f) => sum + (f.defaultAmount || 0), 0)
                                        )}

                                      </div>
                                      ₹{
                                        selectedFees
                                          .reduce((sum, f) => sum + (f.defaultAmount || 0), 0)
                                          .toLocaleString("en-IN", { maximumFractionDigits: 20 })
                                      }
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p>No particulars found</p>
                          )}
                        </div>
                        <DialogClose asChild>
                          <Button className="mt-4 w-full" aria-label="Close dialog">
                            Close
                          </Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(fee)}
                      aria-label={`Edit ${fee.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedFeeStructure(fee);
                        setDeleteOpen(true);
                      }}
                      aria-label={`Delete ${fee.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No fee structures found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl dark:bg-[#171717] bg-white w-full">
          <DialogHeader>
            <DialogTitle>Edit Fee Structure - {selectedFeeStructure?.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter fee structure name" {...field} aria-label="Fee structure name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} aria-label="Select fee mode">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                        <SelectItem value="QUARTERLY">QUARTERLY</SelectItem>
                        <SelectItem value="HALF_YEARLY">HALF_YEARLY</SelectItem>
                        <SelectItem value="YEARLY">YEARLY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>Fee Particulars</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name={`feeParticulars.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Particular name" {...field} aria-label={`Fee particular ${index + 1} name`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`feeParticulars.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                              aria-label={`Fee particular ${index + 1} amount`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => remove(index)}
                      aria-label={`Remove fee particular ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => append({ name: "", amount: "" })}
                  aria-label="Add fee particular"
                >
                  Add Particular
                </Button>
              </div>
              <Button type="submit" disabled={submitting} aria-label="Save fee structure changes">
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {selectedFeeStructure?.name}?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} aria-label="Cancel deletion">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              aria-label="Confirm deletion"
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}