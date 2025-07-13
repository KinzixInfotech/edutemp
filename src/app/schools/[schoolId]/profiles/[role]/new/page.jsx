"use client"
import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Label } from '@/components/ui/label';
import { Command, CommandInput, CommandItem, CommandGroup } from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
export default function NewProfilePage() {
    const { schoolId, role } = useParams()
    const [classes, setClasses] = useState([])
    useEffect(() => {
        const fetchClasses = async () => {
            if (!schoolId) return
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            const data = await res.json()
            setClasses(data || [])
        }
        fetchClasses()
    }, [schoolId])

    const router = useRouter()
    const baseForm = {
        name: "",
        email: "",
        dob: "", // consider using ISO format or Date object
        studentName: "",
        admissionNo: "",
        adhaarNo: "",
        bloodGroup: "",
        address: "",
        profilePhoto: "",
        class: "",
        password: '',
        certificates: [],
        mobile: "",
        guardianName: "",
        childId: "",
        busNumber: "",
        studentCount: "",
        location: "",
        role: "",
        labName: "",
        results: {},
        teacherId: "",
        parentIds: [],

        // Added based on the Student model:
        fatherName: "",
        motherName: "",
        fatherMobileNumber: "",
        motherMobileNumber: "",
        guardianRelation: "",
        guardianMobileNo: "",
        gender: "", // Expected to be: "MALE" | "FEMALE" | "OTHER" (based on enum Gender)
        session: "",
        classId: "",
        userId: "",
        schoolId,
        parentId: "",
    }

    const [form, setForm] = useState(baseForm)

    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/schools/${schoolId}/profiles/${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            })
            if (!res.ok) throw new Error("Failed to create profile")
            toast.success(`${role} profile created`)
            router.push(`/schools/${schoolId}/manage`)
        } catch {
            toast.error("Creation failed")
        } finally {
            setLoading(false)
        }
    }
    function renderFields(role) {
        switch (role?.toLowerCase()) {
            case "teachers":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input placeholder="Certificates (comma separated)" value={form.certificates.join(", ")} onChange={(e) => setForm({ ...form, certificates: e.target.value.split(",") })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                    </>
                )
            case "students":
                return (

                    <>
                        <Input
                            placeholder="Student Name"
                            value={form.studentName}
                            onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                        />
                        <Input
                            placeholder="Student Email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />

                        <Input
                            placeholder="Student Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        {/* ✅ Class Select Dropdown */}
                        <Select
                            value={form.classId}
                            onValueChange={(value) => setForm({ ...form, classId: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Admission Number"
                            value={form.admissionNo}
                            onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                        />

                        <Input
                            placeholder="Aadhaar Number"
                            value={form.adhaarNo}
                            onChange={(e) => setForm({ ...form, adhaarNo: e.target.value })}
                        />

                        <Input
                            placeholder="Father Name"
                            value={form.fatherName}
                            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                        />

                        <Input
                            placeholder="Mother Name"
                            value={form.motherName}
                            onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        />

                        <Input
                            placeholder="Father Mobile Number"
                            value={form.fatherMobileNumber}
                            onChange={(e) => setForm({ ...form, fatherMobileNumber: e.target.value })}
                        />

                        <Input
                            placeholder="Mother Mobile Number"
                            value={form.motherMobileNumber}
                            onChange={(e) => setForm({ ...form, motherMobileNumber: e.target.value })}
                        />

                        <Input
                            placeholder="Guardian Name"
                            value={form.guardianName}
                            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                        />

                        <Input
                            placeholder="Guardian Relation"
                            value={form.guardianRelation}
                            onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}
                        />

                        <Input
                            placeholder="Guardian Mobile Number"
                            value={form.guardianMobileNo}
                            onChange={(e) => setForm({ ...form, guardianMobileNo: e.target.value })}
                        />

                        {/* ✅ Profile Photo Upload */}
                        <Label htmlFor="profilePhoto">Upload Profile Photo</Label>
                        <Input
                            id="profilePhoto"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setForm({ ...form, profilePhoto: e.target.files?.[0] || null })
                            }
                        />

                        {/* ✅ ShadCN Calendar for DOB */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!form.dob && "text-muted-foreground"}`}
                                >
                                    {form.dob ? format(form.dob, "PPP") : "Select Date of Birth"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={form.dob}
                                    onSelect={(date) => setForm({ ...form, dob: date })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {/* ✅ Gender Select */}
                        <Select
                            value={form.gender}
                            onValueChange={(value) => setForm({ ...form, gender: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="Address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />

                        <Input
                            placeholder="Blood Group"
                            value={form.bloodGroup}
                            onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                        />
                    </>

                )
            case "parents":
                const [students, setStudents] = useState([])
                const [open, setOpen] = useState(false)

                useEffect(() => {
                    const fetchStudents = async () => {
                        if (!schoolId) return
                        const res = await fetch(`/api/schools/${schoolId}/students/search?q=`)
                        const data = await res.json()
                        setStudents(data.students || [])
                    }
                    fetchStudents()
                }, [schoolId])
                return (
                    <>
                        <Input placeholder="Guardian Name" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
                        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />


                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left">
                                    {form.childId
                                        ? students.find((s) => s.id === form.childId)?.name || "Unknown student"
                                        : "Select Student"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandInput placeholder="Search by name, email, or ID..." />
                                    <CommandGroup>
                                        {students.map((student) => (
                                            <CommandItem
                                                key={student.id}
                                                onSelect={() => {
                                                    setForm({ ...form, childId: student.id })
                                                    setOpen(false)
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium">{student.name}</p>
                                                    <p className="text-xs text-muted-foreground">{student.email}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </>
                )
            case "accountants":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                        <Input placeholder="Certificates (comma separated)" value={form.certificates.join(", ")} onChange={(e) => setForm({ ...form, certificates: e.target.value.split(",") })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                    </>
                )
            case "librarians":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </>
                )
            case "peons":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                    </>
                )
            case "labassistants":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Lab Name" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} />
                    </>
                )
            case "busdrivers":
                return (
                    <>
                        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Bus Number" value={form.busNumber} onChange={(e) => setForm({ ...form, busNumber: e.target.value })} />
                        <Input placeholder="Student Count" value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: e.target.value })} />
                    </>
                )
            default:
                return <p className="text-sm text-muted-foreground">Unsupported role: {role}</p>
        }
    }

    return (
        <div className="max-w-xl mx-auto p-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    {renderFields(role)}
                    <Button onClick={handleSubmit} disabled={loading} className="w-full text-white">
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
