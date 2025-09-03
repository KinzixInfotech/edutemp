"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import LoaderPage from "@/components/loader-page"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

export default function AcademicYearsPage() {
    const [years, setYears] = useState([])
    const [selected, setSelected] = useState([])
    const [open, setOpen] = useState(false)
    const [loading, setloading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [confirmConfig, setConfirmConfig] = useState({
        title: "Are you sure?",
        description: "This action cannot be undone.",
        confirmLabel: "Confirm",
        onConfirm: async () => { },
    })
    const { fullUser } = useAuth();
    // if (!fullUser) {

    //     return <LoaderPage showmsg={false} />
    // }
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "", schoolId: "" })
    useEffect(() => {
        if (fullUser?.schoolId) {
            setForm(prev => ({ ...prev, schoolId: fullUser.schoolId }))
        }
    }, [fullUser])


    async function fetchYears() {
        try {
            setloading(true);
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser?.schoolId}`);
            const data = await res.json()
            setYears(data)

        } catch (err) {
            toast.error('Failed To Load Academic Year', err);
        } finally {
            setloading(false);
        }
    }

    async function createYear() {
        try {
            await fetch("/api/schools/academic-years", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            toast.success('Academic Year Created Successfuly');
            setForm({ name: "", startDate: "", endDate: "" });
            setOpen(false)
            fetchYears()
        } catch (err) {
            toast.error('Failed To Create Academic Year', err.error);
        }
    }

    async function remove(id) {
        try {
            const res = await fetch(`/api/schools/academic-years/${id}`, { method: "DELETE" })
            if (!res.ok) {
                throw new Error(await res.text())
            }
            toast.success('Academic Year Deleted Successfully');
            fetchYears()
        } catch (err) {
            toast.error('Failed To Delete Academic Year', { description: err.message });
        }
    }

    async function bulkDelete() {
        try {
            await Promise.all(selected.map(id => fetch(`/api/schools/academic-years/${id}`, { method: "DELETE" })))
            toast.success('Selected Academic Years Deleted Successfully');
            setSelected([])
            fetchYears()
        } catch (err) {
            toast.error('Failed To Delete Selected Academic Years');
        }
    }

    async function setStatus(isActive) {
        try {
            await Promise.all(selected.map(id => fetch(`/api/schools/academic-years/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive })
            })))
            toast.success(`Academic Year(s) Set To ${isActive ? 'Active' : 'Inactive'} Successfully`);
            setSelected([])
            fetchYears()
        } catch (err) {
            toast.error('Failed To Update Status');
        }
    }

    const handleDelete = (id) => {
        setConfirmConfig({
            title: "Confirm Deletion",
            description: "Are you sure you want to delete this academic year? This action cannot be undone.",
            confirmLabel: "Delete",
            onConfirm: async () => {
                await remove(id)
            },
        })
        setConfirmOpen(true)
    }

    const handleBulkDelete = () => {
        setConfirmConfig({
            title: "Confirm Bulk Deletion",
            description: `Are you sure you want to delete ${selected.length} selected academic years? This action cannot be undone.`,
            confirmLabel: "Delete",
            onConfirm: async () => {
                await bulkDelete()
            },
        })
        setConfirmOpen(true)
    }

    const handleSetStatus = (isActive) => {
        const statusText = isActive ? "Active" : "Inactive"
        setConfirmConfig({
            title: `Confirm Set ${statusText}`,
            description: `Are you sure you want to set the selected academic year(s) to ${statusText}?`,
            confirmLabel: `Set ${statusText}`,
            onConfirm: async () => {
                await setStatus(isActive)
            },
        })
        setConfirmOpen(true)
    }

    useEffect(() => {
        if (fullUser) {
            fetchYears()
        }
    }, [fullUser])

    return (
        <div className="p-6 space-y-4">
            {/* <h1 className="text-2xl font-bold">Academic Years</h1> */}

            <div className="flex items-center justify-between">
                <Button className='text-white inline-flex cursor-pointer' onClick={() => setOpen(true)}>Add Academic Year <Plus strokeWidth={2} /></Button>
                <div className="flex gap-2">
                    {selected.length > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selected.length})
                        </Button>
                    )}
                    {selected.length === 1 && (
                        <Button variant="outline" onClick={() => handleSetStatus(true)}>
                            Set Active
                        </Button>
                    )}
                    {selected.length > 0 && (
                        <Button variant="outline" onClick={() => handleSetStatus(false)}>
                            Set Inactive
                        </Button>
                    )}
                </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>



                <DialogContent className='dark:bg-[#171717]  border-none'>
                    <DialogHeader>
                        <DialogTitle>Create Academic Year</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className='text-muted-foreground font-normal'>
                            Name
                        </Label>
                        <Input
                            placeholder="2024-25"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <Label className='text-muted-foreground font-normal'>
                            Start Date
                        </Label>
                        <Input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                        <Label className='text-muted-foreground font-normal'>
                            End Date
                        </Label>
                        <Input
                            type="date"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                        <Button onClick={createYear} className='w-full'>Save</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* <ul className="space-y-2">
                {years.map((year) => (
                    <li key={year.id}>
                        <a
                            href={`/academic-years/${year.id}`}
                            className="text-blue-600 hover:underline"
                        >
                            {year.name} ({new Date(year.startDate).toLocaleDateString()} -{" "}
                            {new Date(year.endDate).toLocaleDateString()})
                        </a>
                    </li>
                ))}
            </ul> */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={selected.length === years.length && years.length > 0}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelected(years.map(year => year.id))
                                        } else {
                                            setSelected([])
                                        }
                                    }}
                                />
                            </TableHead>
                            <TableHead className="w-12">
                                #
                            </TableHead>
                            {/* <TableHead>Photo</TableHead> */}
                            <TableHead>Name</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead ></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading...</p>
                                </TableCell>
                            </TableRow>
                        ) : years.length > 0 ? (
                            years.map((year, index) => (
                                <TableRow key={year.id}

                                    className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selected.includes(year.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelected([...selected, year.id])
                                                } else {
                                                    setSelected(selected.filter(id => id !== year.id))
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>{year.name}</TableCell>
                                    <TableCell>
                                        {new Date(year.startDate).toLocaleDateString("en-GB")}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(year.endDate).toLocaleDateString("en-GB")}
                                    </TableCell>
                                    <TableCell>
                                        {year.isActive ? (
                                            <Badge className="bg-green-100 text-green-700 rounded-sm px-2 py-1 text-xs font-semibold">
                                                ACTIVE
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 rounded-sm px-2 py-1 text-xs font-semibold">
                                                INACTIVE
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(year.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                    No academic year found. Please create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmConfig.title}
                description={confirmConfig.description}
                confirmLabel={confirmConfig.confirmLabel}
                onConfirm={async () => {
                    setConfirmLoading(true)
                    try {
                        await confirmConfig.onConfirm()
                    } finally {
                        setConfirmLoading(false)
                        setConfirmOpen(false)
                    }
                }}
                loading={confirmLoading}
            />
        </div>
    )
}