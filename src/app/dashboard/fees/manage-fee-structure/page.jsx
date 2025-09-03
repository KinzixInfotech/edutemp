"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import LoaderPage from "@/components/loader-page";
import { toast } from "sonner";
import Link from "next/link";

const FeeModes = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]; //enums

const schema = z.object({
    academicYearId: z.string().uuid({ message: "Academic year is required" }),
    name: z.string(),
    mode: z.enum(FeeModes), // <-- moved here
    fees: z.array(
        z.object({
            title: z.string().min(1, "Fee title required"),
            amount: z.number().positive("Enter valid amount"),
        })
    ),
});


export default function FeeStructureTableForm() {
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const { fullUser, loading } = useAuth();
    const [fetchingLoading, setFetchingLoading] = useState(false);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            academicYearId: "",
            mode: "MONTHLY", // default
            fees: [{ title: "", amount: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "fees",
    });

    const total = form.watch("fees")?.reduce((sum, f) => sum + (f.amount || 0), 0);

    const onSubmit = async (values) => {
        try {
            if (!fullUser?.schoolId) {
                toast.error("School not found");
                return;
            }

            setSubmitting(true);
            const payload = {
                name: values.name,
                schoolId: fullUser.schoolId,
                academicYearId: values.academicYearId,
                classId: null,
                mode: values.mode, // <-- top-level
                fees: values.fees.map(f => ({
                    name: f.title,
                    amount: f.amount,
                })),
            };

            console.log("Submitting payload:", payload);

            const res = await fetch(`/api/schools/fee/structures`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error("API error:", errText);
                toast.error("Failed to create fee structure");
                return;
            }

            const json = await res.json();
            console.log("API response:", json);
            toast.success("Fee Structure created successfully");

            form.reset();
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const fetchClasses = async () => {
        setFetchingLoading(true);
        if (!fullUser?.schoolId) return;
        try {
            const res = await fetch(`/api/schools/${fullUser?.schoolId}/classes`);
            const data = await res.json();
            const mapped = (Array.isArray(data) ? data : []).flatMap((cls) => {
                if (Array.isArray(cls.sections) && cls.sections.length > 0) {
                    return cls.sections.map((sec) => ({
                        label: `${cls.className}'${sec.name}`,
                        value: `${cls.id}-${sec.id}`,
                        classId: cls.id,
                        sectionId: sec.id,
                    }));
                }
                return {
                    label: `Class ${cls.className}`,
                    value: `${cls.id}`,
                    classId: cls.id,
                    sectionId: null,
                };
            });
            setClasses(mapped);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load classes");
            setClasses([]);
        }
        setFetchingLoading(false);
    };

    const fetchAcademicYears = async () => {
        if (!fullUser?.schoolId) return;
        try {
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser?.schoolId}`);
            const data = await res.json();
            setAcademicYears(data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load academic years");
            setAcademicYears([]);
        }
    };

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchClasses();
            fetchAcademicYears();
        }
    }, [fullUser?.schoolId]);

    return (
        <div className="p-6 flex justify-center">
            {fetchingLoading ? (
                <LoaderPage showmsg={false} />
            ) : (
                <Card className="w-full max-w-4xl shadow-none rounded-xl bg-muted dark:bg-[#18181b] border-none">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Create Fee Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="flex lg:flex-row flex-col gap-3.5 w-full justify-betweens">
                                    <FormField
                                        control={form.control}
                                        name={'name'}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fee Structure Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Name"
                                                        {...field}
                                                        className="bg-muted"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Academic Year Dropdown */}
                                    <FormField
                                        control={form.control}
                                        name="academicYearId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Academic Year</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className='w-full'>
                                                            <SelectValue placeholder="Select academic year" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {academicYears.length > 0 ? (
                                                            academicYears.map((year) => (
                                                                <SelectItem key={year.id} value={year.id}>
                                                                    {year.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="p-2  font-semibold">
                                                                {/* No academic years found.{" "} */}
                                                                <Link
                                                                    href="/dashboard/schools/academic-years"
                                                                    className="text-muted-foreground  flex flex-row items-center font-normal text-sm justify-center"
                                                                >
                                                                    Create <Plus size={14} />
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}

                                    />
                                    <FormField
                                        control={form.control}
                                        name="mode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fee Mode</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className='w-full'>
                                                            <SelectValue placeholder="Select Mode" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"].map((m) => (
                                                            <SelectItem key={m} value={m}>
                                                                {m}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Fee Particulars Table */}
                                <div className="border rounded-lg overflow-hidden bg-white dark:bg-transparent">
                                    <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 text-sm font-medium px-4 py-2">
                                        <div className="col-span-6">Fee Particulars</div>
                                        <div className="col-span-4">Amount</div>
                                        <div className="col-span-2 text-center">Actions</div>
                                    </div>
                                    {fields.map((field, index) => (
                                        <div
                                            key={field.id}
                                            className="grid grid-cols-12 gap-2.5 items-center px-4 py-2 border-t"
                                        >
                                            <div className="col-span-6">
                                                <FormField
                                                    control={form.control}
                                                    name={`fees.${index}.title`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Enter Fee Particulars"
                                                                    {...field}
                                                                    className="dark:bg-[#171717] bg-white"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`fees.${index}.amount`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    inputMode="decimal"
                                                                    placeholder="0.00"
                                                                    {...field}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        field.onChange(value === "" ? "" : parseFloat(value));
                                                                    }}
                                                                    className="dark:bg-[#171717] bg-white"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className='lg:w-fit w-full'
                                    onClick={() => append({ title: "", amount: 0 })}
                                >
                                    + Add Fee
                                </Button>

                                <div className="flex justify-between items-center pt-4">
                                    <span className="text-lg font-normal">
                                        Total: <span className="font-semibold"> ₹{total.toFixed(2)}</span>
                                    </span>
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 text-white"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save School Fees"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
