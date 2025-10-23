'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Trash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export default function TimetableBuilder() {
    const [classes, setClasses] = useState([])
    const [fetchingLoading, setFetchingLoading] = useState(false)

    const [selectedClass, setSelectedClass] = useState('')
    const [periods, setPeriods] = useState([
        { label: '1', time: '08:30-09:10' },
        { label: '2', time: '09:10-09:50' },
        { label: '3', time: '09:50-10:30' },
    ])
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const fetchClasses = async () => {
        if (!schoolId) return
        setFetchingLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            const data = await res.json()
            setClasses(Array.isArray(data) ? data : [])
        } catch {
            toast.error("Failed to load classes")
            setClasses([])
        } finally {
            setFetchingLoading(false)
        }
    }
    useEffect(() => {
        fetchClasses()
    }, [schoolId])

    const [breakIndex, setBreakIndex] = useState(null)
    const [timetable, setTimetable] = useState({})

    const addPeriod = () => {
        const newIndex = periods.length + 1
        setPeriods([...periods, { label: `${newIndex}`, time: '' }])
    }

    const handleChange = (day, periodIndex, field, value) => {
        setTimetable((prev) => {
            const updatedDay = prev[day] || []
            updatedDay[periodIndex] = { ...updatedDay[periodIndex], [field]: value }
            return { ...prev, [day]: updatedDay }
        })
    }

    const handleSave = () => {
        console.log({ class: selectedClass, periods, breakIndex, timetable })
    }

    return (
        <div className="space-y-6 px-4 py-6 max-w-full">
            {/* Class Select */}
            <Card className="">
                <CardContent className="pt-4 space-y-4">
                    <div>
                        <Label className="mb-3 block">Select Class</Label>
                        <Select onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-full bg-white  border" >
                                <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.className}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Period Settings */}
            <Card className="">
                <CardContent className="space-y-4 pt-4" >
                    <h2 className="text-xl font-semibold">Period Settings</h2>
                    {periods.map((p, idx) => (
                        <div key={idx} className="flex gap-2 bg-w items-center">
                            <Label className="w-10">{p.label}</Label>
                            <Input
                                placeholder="08:30-09:10"
                                value={p.time}
                                className='bg-white border'
                                onChange={(e) => {
                                    const updated = [...periods]
                                    updated[idx].time = e.target.value
                                    setPeriods(updated)
                                }}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPeriods(periods.filter((_, i) => i !== idx))}
                            >
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button className="w-full dark:text-white" onClick={addPeriod}>
                        <Plus className="w-4 h-4 mr-2" /> Add Period
                    </Button>
                    <div>
                        <Label className="block mt-4 mb-3">Lunch Break After Period</Label>
                        <Select onValueChange={(val) => setBreakIndex(Number(val))}>
                            <SelectTrigger className="w-full bg-white  border">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        After Period {i + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Timetable */}
            <Card className="">
                <CardContent className="pt-4">
                    <h2 className="text-xl font-semibold mb-4">Timetable</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-[700px]  bg-white dark:bg-muted  w-full border text-sm table-fixed">
                            <thead>
                                <tr>
                                    <th className="border px-2 py-1 w-[120px]">Day</th>
                                    {periods.map((p, idx) => (
                                        <th key={idx} className="border px-2 py-1 min-w-[140px]">
                                            {p.label}
                                            <br />
                                            <span className="text-xs text-muted-foreground">{p.time}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((day) => (
                                    <tr key={day}>
                                        <td className="border px-2 py-1 font-semibold whitespace-nowrap">{day}</td>
                                        {periods.map((_, pIdx) => {
                                            const entry = timetable[day]?.[pIdx] || {}
                                            return (
                                                <td
                                                    key={pIdx}
                                                    className={cn("border px-2 py-1 align-top min-w-[140px]", "bg-white dark:bg-muted")}
                                                >
                                                    <Input
                                                        className="mb-1 text-xs  border"
                                                        placeholder="Subject"
                                                        value={entry.subject || ''}
                                                        onChange={(e) => handleChange(day, pIdx, 'subject', e.target.value)}
                                                    />
                                                    <Select
                                                        value={entry.teacher || ''}
                                                        onValueChange={(value) => handleChange(day, pIdx, 'teacher', value)}
                                                    >
                                                        <SelectTrigger className="w-full text-xs  border">
                                                            <SelectValue placeholder="Select Teacher" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['Mr. Sharma', 'Ms. Gupta', 'Dr. Khan', 'Mrs. Verma'].map((teacher, index) => (
                                                                <SelectItem key={index} value={teacher}>
                                                                    {teacher}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button className="mt-6 w-full dark:text-white" onClick={handleSave}>
                        Save Timetable
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
