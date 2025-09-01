"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Check, ChevronsUpDown } from "lucide-react"
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
// import { Command, CommandInput, CommandGroup, CommandItem } from "@/components/ui/command"
import { Trash2 } from "lucide-react"
// import {
//   Popover,
//   PopoverTrigger,
//   PopoverContent,
// } from "@/components/ui/popover"
import { Command, CommandInput, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command"
// schema
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import LoaderPage from "@/components/loader-page"
import { toast } from "sonner"
const schema = z.object({
    classId: z.string().min(1),
    term: z.string().min(1),
    fees: z.array(
        z.object({
            title: z.string().min(1, "Fee title required"),
            amount: z.number().positive("Enter valid amount"),
        })
    ),
})

const classes = [
    { label: "All Classes", value: "all" },
    { label: "Class 1", value: "1" },
    { label: "Class 2", value: "2" },
]

const terms = [
    { label: "2025-2026", value: "t1" },
    { label: "2026-2027", value: "t2" },
]

const students = [
    { label: "John Doe", value: "uuid-1" },
    { label: "Jane Smith", value: "uuid-2" },
    { label: "Ali Khan", value: "uuid-3" },
]

export default function FeeStructureTableForm() {
    const [classes, setClasses] = useState([]);
    const { fullUser, loading } = useAuth();
    // if (loading) {
    //     return <p>Loading...</p>; // or a spinner/skeleton
    // }

    // if (!fullUser) {
    //     return <p>No user found</p>; // e.g. logged out
    // }
    const [fetchingLoading, setFetchingLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            classId: "",
            term: "",
            studentScope: "all", // default
            fees: [{ title: "", amount: 0 }],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "fees",
    })

    const total = form.watch("fees")?.reduce((sum, f) => sum + (f.amount || 0), 0)
    const onSubmit = (values) => {
        console.log("Submit:", values)
    }
    const fetchStudents = async () => {
        // setLoading(true)
        try {
            console.log('fetching students');

            // const res = await fetch(
            //     `/api/schools/${schoolId}/students?page=${page}&limit=${itemsPerPage}&classId=${classFilter === 'ALL' ? '' : classFilter}&sectionId=${sectionFilter === 'ALL' ? '' : sectionFilter}&search=${search}`
            // )
            // const classIdForApi = classFilter === 'ALL'
            //     ? ''
            //     : students.find(s => s.class?.className === classFilter)?.classId || '';

            // const sectionIdForApi = sectionFilter === 'ALL'
            //     ? ''
            //     : students.find(s => s.section?.name === sectionFilter)?.sectionId || '';
            const res = await fetch(
                `/api/schools/${fullUser?.schoolId}/students?page=1&limit=10`
            )
            const json = await res.json()
            // setStudents(json.students || [])
            console.log(json);

            // setTotal(json.total || 0)
        } catch (err) {
            console.error(err)
        } finally {
            // setLoading(false)
            console.log('fetched');

        }
    }
    const fetchClasses = async () => {
        setFetchingLoading(true)
        if (!fullUser?.schoolId) return
        try {
            const res = await fetch(`/api/schools/${fullUser?.schoolId}/classes`)
            const data = await res.json()
            console.log(data);

            // Flatten classes with sections
            const mapped = (Array.isArray(data) ? data : []).flatMap((cls) => {
                if (Array.isArray(cls.sections) && cls.sections.length > 0) {
                    return cls.sections.map((sec) => ({
                        label: `${cls.className}'${sec.name}`,
                        value: `${cls.id}-${sec.id}`, // composite key
                        classId: cls.id,
                        sectionId: sec.id,
                    }))
                }
                // fallback if no sections
                return {
                    label: `Class ${cls.className}`,
                    value: `${cls.id}`,
                    classId: cls.id,
                    sectionId: null,
                }
            })
            console.log(mapped);


            setClasses(mapped)
        } catch (err) {
            console.error(err)
            toast.error("Failed to load classes")
            setClasses([])
        }
        setFetchingLoading(false)
    }


    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchClasses();
            fetchStudents();
        }
    }, [fullUser?.schoolId]);

    return (
        <>
            <div className="p-6 flex justify-center">
                {fetchingLoading ? <LoaderPage showmsg={false} /> : (
                    <Card className="w-full max-w-4xl shadow-none rounded-xl bg-muted dark:bg-[#18181b] border-none">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                Create Fee Structure
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                    {/* Header filters: Select Class + Term */}
                                    <div className="flex gap-4 lg:flex-row flex-col">
                                        {/* Select Class Combobox */}
                                        <FormField
                                            control={form.control}
                                            name="classId"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Select Class</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className="w-full justify-between"
                                                                >
                                                                    {field.value
                                                                        ? classes.find((c) => c.value === field.value)?.label
                                                                        : "Select Class"}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[200px] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Search class..." />
                                                                <CommandGroup>
                                                                    {classes.map((c) => (
                                                                        <CommandItem
                                                                            key={c.value}
                                                                            onSelect={() => form.setValue("classId", c.value)}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    c.value === field.value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {c.label}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Select Term Combobox */}
                                        <FormField
                                            control={form.control}
                                            name="term"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Select Session</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className="w-full justify-between"
                                                                >
                                                                    {field.value
                                                                        ? terms.find((t) => t.value === field.value)?.label
                                                                        : "Select Session"}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[200px] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Search Session..." />
                                                                <CommandEmpty>No Session Found</CommandEmpty>
                                                                <CommandGroup>
                                                                    {terms.map((t) => (
                                                                        <CommandItem
                                                                            key={t.value}
                                                                            onSelect={() => form.setValue("term", t.value)}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    t.value === field.value ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {t.label}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* All / Specific Student Combobox */}
                                        <FormField
                                            control={form.control}
                                            name="studentScope"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Student Scope</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className="w-full justify-between"
                                                                >
                                                                    {field.value === "all"
                                                                        ? "All Students"
                                                                        : "Specific Student"}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[200px] p-0">
                                                            <Command>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        onSelect={() => form.setValue("studentScope", "all")}
                                                                    >
                                                                        All Students
                                                                    </CommandItem>
                                                                    <CommandItem
                                                                        onSelect={() => form.setValue("studentScope", "specific")}
                                                                    >
                                                                        Specific Student
                                                                    </CommandItem>
                                                                </CommandGroup>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Show Student Combobox ONLY if specific is chosen */}
                                        {form.watch("studentScope") === "specific" && (
                                            <FormField
                                                control={form.control}
                                                name="studentId"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Select Student</FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        className="w-full justify-between"
                                                                    >
                                                                        {field.value
                                                                            ? students.find((s) => s.value === field.value)?.label
                                                                            : "Choose Student"}
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[200px] p-0">
                                                                <Command>
                                                                    <CommandInput placeholder="Search student..." />
                                                                    <CommandEmpty>No Student Found</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {students.map((s) => (
                                                                            <CommandItem
                                                                                key={s.value}
                                                                                onSelect={() => form.setValue("studentId", s.value)}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        s.value === field.value ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                {s.label}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>

                                    {/* Table */}
                                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-transparent">
                                        <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 text-sm font-medium px-4 py-2">
                                            <div className="col-span-6">Fee Particulars</div>
                                            <div className="col-span-4 ">Amount</div>
                                            <div className="col-span-2 text-center">Actions</div>
                                        </div>
                                        {fields.map((field, index) => (
                                            <div
                                                key={field.id}
                                                className="grid grid-cols-12  gap-2.5 items-center px-4 py-2 border-t"
                                            >
                                                {/* Fee Title */}
                                                <div className="col-span-6">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fees.${index}.title`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input placeholder="Enter Fee Particulars" {...field} className='dark:bg-[#171717] bg-white' />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                {/* Amount */}
                                                <div className="col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fees.${index}.amount`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"                // allow decimals
                                                                        inputMode="decimal"        // better on mobile
                                                                        placeholder="0.00"
                                                                        {...field}
                                                                        onChange={(e) => {
                                                                            // keep it as string first, then convert safely
                                                                            const value = e.target.value
                                                                            field.onChange(value === "" ? "" : parseFloat(value))
                                                                        }}
                                                                        className="dark:bg-[#171717] bg-white"
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                </div>

                                                {/* Actions */}
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

                                    {/* Add Fee */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => append({ title: "", amount: 0 })}
                                    >
                                        + Add Fee
                                    </Button>

                                    {/* Total + Submit */}
                                    <div className="flex justify-between items-center pt-4">
                                        <span className="font-semibold text-lg">
                                            Total: ${total.toFixed(2)}
                                        </span>
                                        <Button type="submit" className="bg-blue-600 text-white">
                                            Save School Fees
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    )
}
