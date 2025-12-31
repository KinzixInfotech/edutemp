"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2, CheckCircle, Power, Archive, Edit2, Layers } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import LoaderPage from "@/components/loader-page"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

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
    const [isEdit, setIsEdit] = useState(false)
    const [editId, setEditId] = useState(null)
    const [editIsActive, setEditIsActive] = useState(false)

    const [bulkOpen, setBulkOpen] = useState(false)
    const [bulkData, setBulkData] = useState({ startYear: new Date().getFullYear() + 1, endYear: new Date().getFullYear() + 5 })
    const [bulkLoading, setBulkLoading] = useState(false)

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

    async function handleSave() {
        try {
            const payload = {
                ...form,
                schoolId: form.schoolId || fullUser?.schoolId || fullUser?.school?.id
            }

            if (!payload.schoolId) {
                toast.error("School ID is missing");
                return;
            }

            if (isEdit) {
                const res = await fetch(`/api/schools/academic-years/${editId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error("Failed to update");
                toast.success('Academic Year Updated Successfully');
            } else {
                const res = await fetch("/api/schools/academic-years", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to create");
                }
                toast.success('Academic Year Created Successfully');
            }

            setForm({ name: "", startDate: "", endDate: "", schoolId: fullUser?.schoolId });
            setOpen(false)
            setIsEdit(false);
            setEditId(null);
            fetchYears()
        } catch (err) {
            toast.error(err.message || 'Operation Failed');
        }
    }

    async function handleBulkCreate() {
        try {
            const start = parseInt(bulkData.startYear);
            const end = parseInt(bulkData.endYear);

            if (start >= end) {
                toast.error("End year must be greater than start year");
                return;
            }
            if (end - start > 10) {
                toast.error("Cannot create more than 10 years at once");
                return;
            }

            setBulkLoading(true);

            const inputs = [];
            for (let y = start; y <= end; y++) {
                const nextYearSuffix = (y + 1).toString().slice(-2);
                inputs.push({
                    name: `${y}-${nextYearSuffix}`,
                    startDate: `${y}-04-01`,
                    endDate: `${y + 1}-03-31`,
                    schoolId: fullUser?.schoolId
                });
            }

            // Execute sequentially to generate unique constraints properly if needed, 
            // but parallel is faster. Prone to race conditions on 'name' check if API is slow? 
            // API handles unique check.
            let successCount = 0;
            let failCount = 0;

            for (const input of inputs) {
                try {
                    const res = await fetch("/api/schools/academic-years", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(input),
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (e) {
                    failCount++;
                }
            }

            toast.success(`Bulk Process Complete: ${successCount} Created, ${failCount} Failed (Duplicates/Error)`);
            setBulkOpen(false);
            fetchYears();

        } catch (err) {
            toast.error("Bulk Create Failed");
        } finally {
            setBulkLoading(false);
        }
    }

    function openCreate() {
        setForm({ name: "", startDate: "", endDate: "", schoolId: fullUser?.schoolId });
        setIsEdit(false);
        setEditIsActive(false);
        setEditId(null);
        setOpen(true);
    }

    function openEdit(year) {
        setForm({
            name: year.name,
            startDate: new Date(year.startDate).toISOString().split('T')[0],
            endDate: new Date(year.endDate).toISOString().split('T')[0],
            schoolId: fullUser?.schoolId
        });
        setIsEdit(true);
        setEditId(year.id);
        setEditIsActive(year.isActive);
        setOpen(true);
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



    const handleSetStatus = (isActive, id = null) => {
        const isSwitchingActive = isActive;
        const statusText = isActive ? "Active" : "Inactive";

        // Find the target year to check if it's pre-start
        const targetYear = id ? years.find(y => y.id === id) : null;
        const isPreStart = targetYear && new Date(targetYear.startDate) > new Date();
        const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        // Build description as JSX for better formatting
        let description;
        if (isSwitchingActive) {
            description = (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <p className="font-medium text-amber-700 dark:text-amber-400">Activating this academic year will:</p>
                        <ul className="space-y-1.5 ml-4 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Switch your entire dashboard context to this year</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Mark the previous year as <strong>READ-ONLY</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Require you to complete a setup process</span>
                            </li>
                        </ul>
                    </div>

                    {isPreStart && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-2.5">
                            <p className="text-blue-700 dark:text-blue-400 text-xs">
                                <span className="font-semibold">Note:</span> This year starts on <strong>{formatDate(targetYear.startDate)}</strong>.
                                You'll be in <strong>Configuration Mode</strong> — attendance and daily operations will be restricted until start date.
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground pt-1">Are you sure you want to proceed?</p>
                </div>
            );
        } else {
            description = (
                <div className="text-sm text-muted-foreground">
                    Are you sure you want to set this year to {statusText}? This year will become read-only.
                </div>
            );
        }

        setConfirmConfig({
            title: isSwitchingActive
                ? (isPreStart ? `Activate Pre-Start Year?` : `Activate Academic Year?`)
                : `Confirm Set ${statusText}`,
            description: description,
            confirmLabel: isSwitchingActive
                ? (isPreStart ? `Activate in Configuration Mode` : `Activate & Proceed to Setup`)
                : `Set ${statusText}`,
            onConfirm: async () => {
                if (id) {
                    await fetch(`/api/schools/academic-years/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isActive })
                    });
                    toast.success(`Academic Year Set To ${statusText} Successfully`);
                    // Full page reload to refresh all contexts with new academic year
                    if (isSwitchingActive) {
                        window.location.reload();
                    } else {
                        fetchYears();
                    }
                } else {
                    await setStatus(isActive);
                }
            },
        })
        setConfirmOpen(true)
    }

    useEffect(() => {
        if (fullUser) {
            fetchYears()
        }
    }, [fullUser])

    const activeYear = years.find(y => y.isActive);
    const totalYears = years.length;
    const archivedYears = years.filter(y => !y.isActive).length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Academic Years</h1>
                    <p className="text-muted-foreground">Manage your school's academic sessions and timelines</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setBulkOpen(true)} variant="outline">
                        <Layers className="mr-2 h-4 w-4" /> Bulk Create
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Create Academic Year
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalYears}</div>
                        <p className="text-xs text-muted-foreground">Recorded academic years</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Session</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeYear ? activeYear.name : 'None'}</div>
                        <p className="text-xs text-muted-foreground">Currently active academic year</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Archived</CardTitle>
                        <Archive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{archivedYears}</div>
                        <p className="text-xs text-muted-foreground">Past or inactive sessions</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Academic Years</CardTitle>
                            <CardDescription>
                                A list of all academic years. Use the actions to manage status.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {selected.length === 1 && (
                                <Button variant="outline" size="sm" onClick={() => handleSetStatus(true)}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Set Active
                                </Button>
                            )}
                            {selected.length > 0 && (
                                <Button variant="outline" size="sm" onClick={() => handleSetStatus(false)}>
                                    <Power className="mr-2 h-4 w-4" /> Set Inactive
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent className='dark:bg-[#171717] border-none'>
                            <DialogHeader>
                                <DialogTitle>{isEdit ? "Edit Academic Year" : "Create Academic Year"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label className='text-muted-foreground font-normal'>
                                        Name
                                    </Label>
                                    <Input
                                        placeholder="2024-25"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className='text-muted-foreground font-normal'>
                                        Start Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        disabled={isEdit && editIsActive}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className='text-muted-foreground font-normal'>
                                        End Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        disabled={isEdit && editIsActive}
                                    />
                                </div>
                                <Button onClick={handleSave} className='w-full'>
                                    {isEdit ? "Update Changes" : "Save Academic Year"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                        <DialogContent className='dark:bg-[#171717] border-none'>
                            <DialogHeader>
                                <DialogTitle>Bulk Create Academic Years</DialogTitle>
                                <CardDescription>Generates years (e.g. 2025-26) with standard April-March cycle.</CardDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Year</Label>
                                        <Input
                                            type="number"
                                            value={bulkData.startYear}
                                            onChange={(e) => setBulkData({ ...bulkData, startYear: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Year</Label>
                                        <Input
                                            type="number"
                                            value={bulkData.endYear}
                                            onChange={(e) => setBulkData({ ...bulkData, endYear: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleBulkCreate} disabled={bulkLoading}>
                                    {bulkLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
                                    {bulkLoading ? "Generating..." : "Generate Years"}
                                </Button>
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
                    <div className="overflow-x-auto rounded-md border">
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
                                                    new Date(year.startDate) > new Date() ? (
                                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-sm px-2 py-1 text-xs font-semibold border-blue-200">
                                                            ACTIVE (Pre-Start)
                                                        </Badge>
                                                    ) : new Date(year.endDate) < new Date() ? (
                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 rounded-sm px-2 py-1 text-xs font-semibold border-amber-200">
                                                            ACTIVE (Ended)
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-sm px-2 py-1 text-xs font-semibold border-green-200">
                                                            ACTIVE (Running)
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100 rounded-sm px-2 py-1 text-xs font-semibold">
                                                        ARCHIVED (Read-only)
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(year)}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-blue-500" />
                                                    </Button>

                                                    {!year.isActive && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSetStatus(true, year.id)}
                                                            title="Set as Active"
                                                        >
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                    )}
                                                </div>
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
                </CardContent>
            </Card>
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
        </div >
    )
}