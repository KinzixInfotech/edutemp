"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AcademicYearsPage() {
    const [years, setYears] = useState([])
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "" })

    async function fetchYears() {
        const res = await fetch("/api/academic-years")
        const data = await res.json()
        setYears(data)
    }

    async function createYear() {
        await fetch("/api/academic-years", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        })
        setForm({ name: "", startDate: "", endDate: "" })
        fetchYears()
    }

    useEffect(() => {
        fetchYears()
    }, [])

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Academic Years</h1>

            <Dialog>
                <DialogTrigger asChild>
                    <Button>Add Academic Year</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Academic Year</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            placeholder="2024-25"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                        <Button onClick={createYear}>Save</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ul className="space-y-2">
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
            </ul>
        </div>
    )
}
