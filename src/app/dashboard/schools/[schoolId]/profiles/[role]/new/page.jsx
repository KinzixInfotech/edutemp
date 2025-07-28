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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    const [selectedClassId, setSelectedClassId] = useState("")
    const [selectedSectionId, setSelectedSectionId] = useState("")

    useEffect(() => {
        if (!schoolId) return
        setLoading(true)
        fetch(`/api/schools/${schoolId}/classes`)
            .then((res) => res.json())
            .then((data) => {
                const normalized = data.map((cls) => ({
                    ...cls,
                    sections: cls.sections || [],
                }))
                setClasses(normalized)
            })
            .catch(() => toast.error("Failed to load classes"))
            .finally(() => setLoading(false))
    }, [schoolId])

    const selectedClass = classes.find((cls) => cls.id.toString() === selectedClassId)
    const sections = selectedClass?.sections || []
    console.log("class:", classes)
    console.log("Selected Class:", selectedClass)
    console.log("Sections:", sections)
    const router = useRouter()
    const baseForm = {
        // Required for student creation
        name: "",
        studentName: "", // redundant with 'name' — choose one or unify
        email: "",
        password: "",
        dob: "", // should be ISO format or Date object
        gender: "", // "MALE" | "FEMALE" | "OTHER"
        admissionNo: "",
        admissionDate: "", // 📅 add this
        rollNumber: "", // 🆕
        academicYear: "", // 🆕
        bloodGroup: "",
        adhaarNo: "",
        address: "",
        city: "", // 🆕
        state: "", // 🆕
        country: "", // 🆕
        postalCode: "", // 🆕

        // Class & Section
        classId: "",
        sectionId: "", // 🆕

        // School & User (filled from context/backend usually)
        userId: "",
        schoolId: "", // ✅ assigned from parent component
        parentId: "",

        // Guardian and Parents Info
        fatherName: "",
        motherName: "",
        fatherMobileNumber: "",
        motherMobileNumber: "",
        guardianName: "",
        guardianRelation: "",
        guardianMobileNo: "",

        // Misc
        house: "", // 🆕
        profilePhoto: "", // file or URL
        dateOfLeaving: "", // optional
        certificates: [],

        // Optional fields (you had earlier)
        mobile: "", // can map to contactNumber
        session: "", // maybe rename to academicYear?
        busNumber: "",
        studentCount: "",
        location: "", // general school location or address?
        role: "", // likely fixed as "STUDENT"
        labName: "",
        results: {}, // may map to examResults
        teacherId: "",
        parentIds: [], // if multiple guardians

        // Optional tracking fields (backend-controlled)
        feeStatus: "PENDING", // optional; backend default usually
        status: "ACTIVE", // or "INACTIVE"
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

                        <Input placeholder="Academic Year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />

                        <Input
                            placeholder="Admission Number"
                            value={form.admissionNo}
                            onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!form.admissionDate && "text-muted-foreground"
                                        }`}
                                >
                                    {form.admissionDate ? format(form.admissionDate, "PPP") : "Select Admission Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={form.admissionDate}
                                    onSelect={(date) => setForm({ ...form, admissionDate: date })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Input
                            placeholder="Student Name"
                            value={form.studentName}
                            onChange={(e) => setForm({ ...form, studentName: e.target.value })}
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

                        {/* ✅ Class Select Dropdown */}
                        <Select
                            value={form.classId}
                            onValueChange={(value) => setForm({ ...form, classId: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name} {cls.section ? `- ${cls.section}` : ""}
                                    </SelectItem>
                                ))} */}
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={form.sectionId}
                            onValueChange={(value) => setForm({ ...form, sectionId: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Section" />
                            </SelectTrigger>
                            <SelectContent>
                                {sections.map((sec) => (
                                    <SelectItem key={sec.id} value={sec.id.toString()}>
                                        {sec.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>


                        <Input placeholder="Roll Number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />

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
                            placeholder="Blood Group"
                            value={form.bloodGroup}
                            onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                        />
                        <Input placeholder="Stundent Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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
                        <Input placeholder="House" value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} />
                        <Input placeholder="Previous School Name" value={form.previousSchoolName} onChange={(e) => setForm({ ...form, previousSchoolName: e.target.value })} />
                        <Input
                            placeholder="Aadhaar Number"
                            value={form.adhaarNo}
                            onChange={(e) => setForm({ ...form, adhaarNo: e.target.value })}
                        />
                        <Label className="mt-4">Select Guardian Type</Label>
                        <RadioGroup
                            value={form.guardianType}
                            onValueChange={(value) => setForm({ ...form, guardianType: value })}
                            className="flex flex-row space-y-2 "
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="PARENTS" id="r1" />
                                <Label htmlFor="r1">Father & Mother</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="GUARDIAN" id="r2" />
                                <Label htmlFor="r2">Guardian</Label>
                            </div>
                        </RadioGroup>

                        {/* Conditionally Render Fields */}
                        {form.guardianType === "PARENTS" && (
                            <>
                                <Input
                                    placeholder="Father Name"
                                    value={form.fatherName}
                                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                                />
                                <Input
                                    placeholder="Father Mobile Number"
                                    value={form.fatherMobileNumber}
                                    onChange={(e) => setForm({ ...form, fatherMobileNumber: e.target.value })}
                                />
                                <Input
                                    placeholder="Mother Name"
                                    value={form.motherName}
                                    onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                                />
                                <Input
                                    placeholder="Mother Mobile Number"
                                    value={form.motherMobileNumber}
                                    onChange={(e) => setForm({ ...form, motherMobileNumber: e.target.value })}
                                />
                            </>
                        )}

                        {form.guardianType === "GUARDIAN" && (
                            <>
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
                            </>
                        )}
                        {/* <Input
                            placeholder="Father Name"
                            value={form.fatherName}
                            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                        />

                        <Input
                            placeholder="Mother Name"
                            value={form.motherName}
                            onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        /> */}
                        {/* 
                        <Input
                            placeholder="Father Mobile Number"
                            value={form.fatherMobileNumber}
                            onChange={(e) => setForm({ ...form, fatherMobileNumber: e.target.value })}
                        /> */}

                        {/* <Input
                            placeholder="Mother Mobile Number"
                            value={form.motherMobileNumber}
                            onChange={(e) => setForm({ ...form, motherMobileNumber: e.target.value })}
                        /> */}

                        {/* <Input
                            placeholder="Guardian Name"
                            value={form.guardianName}
                            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                        />

                        <Input
                            placeholder="Guardian Relation"
                            value={form.guardianRelation}
                            onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}
                        /> */}

                        {/* <Input
                            placeholder="Guardian Mobile Number"
                            value={form.guardianMobileNo}
                            onChange={(e) => setForm({ ...form, guardianMobileNo: e.target.value })}
                        /> */}



                        <Input
                            placeholder="Address Line 1"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />



                        <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                        <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                        <Input placeholder="Postal Code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />

                        {/* Date of Leaving (Optional) */}
                        {/* <Label htmlFor="dateOfLeaving">Date of Leaving</Label>
                        <Calendar
                            mode="single"
                            selected={form.dateOfLeaving}
                            onSelect={(date) => setForm({ ...form, dateOfLeaving: date })}
                            initialFocus
                        /> */}
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
