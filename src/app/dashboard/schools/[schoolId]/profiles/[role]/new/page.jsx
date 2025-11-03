"use client"
import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandInput, CommandItem, CommandGroup, CommandEmpty } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import FileUploadButton from '@/components/fileupload'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import CropImageDialog from "@/app/components/CropImageDialog"
import { uploadFiles } from "@/app/components/utils/uploadThing"
import { Loader2, UserPlus, AlertCircle } from "lucide-react"

export default function NewProfilePage() {
    const { schoolId, role } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [resetKey, setResetKey] = useState(0)
    const [previewUrl, setPreviewUrl] = useState("")
    const [uploading, setUploading] = useState(false)
    const [rawImage, setRawImage] = useState(null)
    const [cropDialogOpen, setCropDialogOpen] = useState(false)
    const [open, setOpen] = useState(false)
    const [errors, setErrors] = useState({})

    const baseForm = {
        studentName: "", name: "", email: "", password: "", dob: null, gender: "",
        admissionNo: "", admissionDate: null, rollNumber: "", bloodGroup: "", adhaarNo: "",
        empployeeId: "", address: "", city: "", state: "", country: "", postalCode: "",
        classId: "", sectionId: "", userId: "", schoolId: "", parentId: "",
        fatherName: "", fatherMobileNumber: "", motherName: "", motherMobileNumber: "",
        guardianName: "", guardianRelation: "", guardianMobileNo: "", guardianType: "PARENTS",
        house: "", profilePicture: null, dateOfLeaving: null, certificates: [],
        mobile: "", contactNumber: "", busNumber: "", studentCount: "", location: "",
        district: "", labName: "", results: {}, teacherId: "", parentIds: [], designation: "",
        feeStatus: "PENDING", status: "ACTIVE", age: "", previousSchoolName: "", childId: ""
    }

    const [form, setForm] = useState(baseForm)

    // Memoized form update handler
    const updateForm = useCallback((field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }, [])

    // Fetch classes
    const { data: classes = [], isLoading: classesLoading } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            if (!res.ok) throw new Error('Failed to load classes')
            const data = await res.json()
            return data.map((cls) => ({ ...cls, sections: cls.sections || [] }))
        },
        enabled: !!schoolId
    })

    // Fetch students for parent role
    const { data: students = [] } = useQuery({
        queryKey: ['students', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/students/search?q=`)
            if (!res.ok) throw new Error('Failed to load students')
            const data = await res.json()
            return data.students || []
        },
        enabled: !!schoolId && role === 'parents'
    })

    // Create profile mutation
    const createProfileMutation = useMutation({
        mutationFn: async (formData) => {
            const res = await fetch(`/api/schools/${schoolId}/profiles/${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to create profile")
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} Profile Created Successfully`)
            queryClient.invalidateQueries(['profiles', schoolId])
            setResetKey((prev) => prev + 1)
            setForm(baseForm)
            router.back()
        },
        onError: (error) => {
            toast.error(error.message || "Creation failed")
        }
    })

    const sections = form.classId === "ALL"
        ? classes.flatMap((cls) => cls.sections || [])
        : (classes.find((cls) => cls.id.toString() === form.classId)?.sections || [])

    // Validation
    const validateForm = () => {
        const newErrors = {}
        const roleType = role?.toLowerCase()

        if (!form.name && !form.studentName) newErrors.name = "Name is required"
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email format"

        if (roleType === "students") {
            if (!form.admissionNo) newErrors.admissionNo = "Admission number is required"
            if (!form.classId) newErrors.classId = "Class is required"
            if (!form.sectionId) newErrors.sectionId = "Section is required"
            if (!form.gender) newErrors.gender = "Gender is required"

            if (form.guardianType === "PARENTS") {
                if (!form.fatherName) newErrors.fatherName = "Father's name is required"
                if (!form.fatherMobileNumber) newErrors.fatherMobileNumber = "Father's mobile is required"
                else if (!/^\d{10}$/.test(form.fatherMobileNumber)) newErrors.fatherMobileNumber = "Invalid mobile number"
            }

            if (form.guardianType === "GUARDIAN") {
                if (!form.guardianName) newErrors.guardianName = "Guardian's name is required"
                if (!form.guardianMobileNo) newErrors.guardianMobileNo = "Guardian's mobile is required"
            }
        }

        if ((roleType === "teacher" || roleType === "staff") && form.contactNumber && !/^\d{10}$/.test(form.contactNumber)) {
            newErrors.contactNumber = "Invalid contact number"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error("Please fix the errors before submitting")
            return
        }

        const cleanForm = {
            ...form,
            dob: form.dob ? new Date(form.dob).toISOString() : null,
            admissionDate: form.admissionDate ? new Date(form.admissionDate).toISOString() : null,
            dateOfLeaving: form.dateOfLeaving ? new Date(form.dateOfLeaving).toISOString() : null,
            parentId: form.parentId || null,
            userId: form.userId || undefined,
            schoolId: schoolId,
        }

        createProfileMutation.mutate(cleanForm)
    }

    const handleImageUpload = (previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return
        setRawImage(previewUrl)
        setCropDialogOpen(true)
    }

    const getRoleTitle = () => {
        const titles = {
            teacher: "Teacher", students: "Student", parents: "Parent",
            accountants: "Accountant", librarians: "Librarian", staff: "Staff",
            labassistants: "Lab Assistant", busdrivers: "Bus Driver"
        }
        return titles[role?.toLowerCase()] || "Profile"
    }

    const roleType = role?.toLowerCase()

    return (
        <div className="w-full min-h-screen  p-4 md:p-6">
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => { if (!uploading) setCropDialogOpen(false) }}
                    uploading={uploading}
                    open={cropDialogOpen}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date()
                        const iso = now.toISOString().replace(/[:.]/g, "-")
                        const perf = Math.floor(performance.now() * 1000)
                        const timestamp = `${iso}-${perf}`
                        const filename = `${timestamp}.jpg`
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" })
                        try {
                            setUploading(true)
                            const res = await uploadFiles("profilePictureUploader", { files: [file] })
                            if (res && res[0]?.url) {
                                updateForm("profilePicture", res[0].ufsUrl)
                                setPreviewUrl(res[0].ufsUrl)
                                toast.success("Image uploaded!")
                            } else {
                                toast.error("Upload failed")
                            }
                        } catch (err) {
                            toast.error("Something went wrong during upload")
                            console.log(err)
                        } finally {
                            setUploading(false)
                            setCropDialogOpen(false)
                        }
                    }}
                />
            )}

            <div className="max-w-7xl mx-auto">
                <Card className="shadow-lg border-0">
                    <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <UserPlus className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">Create New {getRoleTitle()} Profile</CardTitle>
                                <CardDescription className="mt-1">
                                    Fill in the details below to create a new profile. Fields marked with * are required.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 pb-8">
                        {classesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">Loading...</span>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <Label className="text-sm font-medium mb-3 block">Profile Picture</Label>
                                    <FileUploadButton onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* TEACHER OR STAFF */}
                                    {(roleType === "teacher" || roleType === "staff") && (
                                        <>
                                            <div className="col-span-full"><h3 className="text-lg font-semibold mb-4">Basic Information</h3></div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">{roleType === "teacher" ? "Teacher" : "Staff"} Name *</Label>
                                                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder={`Enter ${roleType} name`} className={errors.name ? "border-red-500" : ""} />
                                                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Employee ID</Label>
                                                <Input value={form.empployeeId} onChange={(e) => updateForm("empployeeId", e.target.value)} placeholder="Enter employee ID" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Designation</Label>
                                                <Input value={form.designation} onChange={(e) => updateForm("designation", e.target.value)} placeholder="e.g., Senior Teacher, HOD" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Age</Label>
                                                <Input type="number" value={form.age} onChange={(e) => updateForm("age", e.target.value)} placeholder="Enter age" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email Address *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder={`${roleType}@example.com`} className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password *</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" className={errors.password ? "border-red-500" : ""} />
                                                {errors.password && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.password}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Contact Number *</Label>
                                                <Input value={form.contactNumber} onChange={(e) => updateForm("contactNumber", e.target.value)} placeholder="10-digit mobile number" className={errors.contactNumber ? "border-red-500" : ""} />
                                                {errors.contactNumber && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.contactNumber}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="col-span-full"><h3 className="text-lg font-semibold mb-4 mt-6">Address Details</h3></div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Address Line</Label>
                                                <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Street address" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">City</Label>
                                                <Input value={form.city} onChange={(e) => updateForm("city", e.target.value)} placeholder="City" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">District</Label>
                                                <Input value={form.district} onChange={(e) => updateForm("district", e.target.value)} placeholder="District" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">State</Label>
                                                <Input value={form.state} onChange={(e) => updateForm("state", e.target.value)} placeholder="State" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Country</Label>
                                                <Input value={form.country} onChange={(e) => updateForm("country", e.target.value)} placeholder="Country" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Postal Code</Label>
                                                <Input value={form.postalCode} onChange={(e) => updateForm("postalCode", e.target.value)} placeholder="PIN/ZIP code" />
                                            </div>
                                        </>
                                    )}

                                    {/* STUDENTS */}
                                    {roleType === "students" && (
                                        <>
                                            <div className="col-span-full"><h3 className="text-lg font-semibold mb-4">Student Information</h3></div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Admission Number *</Label>
                                                <Input value={form.admissionNo} onChange={(e) => updateForm("admissionNo", e.target.value)} placeholder="Enter admission number" className={errors.admissionNo ? "border-red-500" : ""} />
                                                {errors.admissionNo && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.admissionNo}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Admission Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${!form.admissionDate && "text-muted-foreground"}`}>
                                                            {form.admissionDate ? format(form.admissionDate, "PPP") : "Select admission date"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={form.admissionDate} onSelect={(date) => updateForm("admissionDate", date)} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Student Name *</Label>
                                                <Input value={form.studentName} onChange={(e) => updateForm("studentName", e.target.value)} placeholder="Enter student name" className={errors.studentName ? "border-red-500" : ""} />
                                                {errors.studentName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.studentName}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${!form.dob && "text-muted-foreground"}`}>
                                                            {form.dob ? format(form.dob, "PPP") : "Select date of birth"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={form.dob} onSelect={(date) => updateForm("dob", date)} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Class *</Label>
                                                <Select value={form.classId} onValueChange={(value) => { updateForm("classId", value); updateForm("sectionId", "") }}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All Classes</SelectItem>
                                                        {classes.map((cls) => <SelectItem key={cls.id} value={cls.id.toString()}>{cls.className}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                {errors.classId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.classId}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Section *</Label>
                                                <Select value={form.sectionId} onValueChange={(value) => updateForm("sectionId", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select section" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All Sections</SelectItem>
                                                        {sections.map((sec) => <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                {errors.sectionId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.sectionId}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Roll Number</Label>
                                                <Input value={form.rollNumber} onChange={(e) => updateForm("rollNumber", e.target.value)} placeholder="Enter roll number" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender *</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.gender && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.gender}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Contact Number</Label>
                                                <Input value={form.contactNumber} onChange={(e) => updateForm("contactNumber", e.target.value)} placeholder="10-digit mobile number" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email Address</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="student@example.com" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">House</Label>
                                                <Input value={form.house} onChange={(e) => updateForm("house", e.target.value)} placeholder="e.g., Red, Blue, Green" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Previous School</Label>
                                                <Input value={form.previousSchoolName} onChange={(e) => updateForm("previousSchoolName", e.target.value)} placeholder="Previous school name" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Aadhaar Number</Label>
                                                <Input value={form.adhaarNo} onChange={(e) => updateForm("adhaarNo", e.target.value)} placeholder="12-digit Aadhaar number" />
                                            </div>

                                            <div className="col-span-full">
                                                <h3 className="text-lg font-semibold mb-4 mt-6">Guardian Information</h3>
                                                <RadioGroup value={form.guardianType} onValueChange={(value) => updateForm("guardianType", value)} className="flex gap-6">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="PARENTS" id="r1" />
                                                        <Label htmlFor="r1" className="font-normal cursor-pointer">Parents</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="GUARDIAN" id="r2" />
                                                        <Label htmlFor="r2" className="font-normal cursor-pointer">Guardian</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            {form.guardianType === "PARENTS" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Father's Name *</Label>
                                                        <Input value={form.fatherName} onChange={(e) => updateForm("fatherName", e.target.value)} placeholder="Enter father's name" className={errors.fatherName ? "border-red-500" : ""} />
                                                        {errors.fatherName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.fatherName}</p>}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Father's Mobile *</Label>
                                                        <Input value={form.fatherMobileNumber} onChange={(e) => updateForm("fatherMobileNumber", e.target.value)} placeholder="10-digit mobile number" className={errors.fatherMobileNumber ? "border-red-500" : ""} />
                                                        {errors.fatherMobileNumber && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.fatherMobileNumber}</p>}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Mother's Name</Label>
                                                        <Input value={form.motherName} onChange={(e) => updateForm("motherName", e.target.value)} placeholder="Enter mother's name" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Mother's Mobile</Label>
                                                        <Input value={form.motherMobileNumber} onChange={(e) => updateForm("motherMobileNumber", e.target.value)} placeholder="10-digit mobile number" />
                                                    </div>
                                                </>
                                            )}

                                            {form.guardianType === "GUARDIAN" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Guardian's Name *</Label>
                                                        <Input value={form.guardianName} onChange={(e) => updateForm("guardianName", e.target.value)} placeholder="Enter guardian's name" className={errors.guardianName ? "border-red-500" : ""} />
                                                        {errors.guardianName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.guardianName}</p>}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Guardian's Relation</Label>
                                                        <Input value={form.guardianRelation} onChange={(e) => updateForm("guardianRelation", e.target.value)} placeholder="e.g., Uncle, Aunt, Grandparent" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Guardian's Mobile *</Label>
                                                        <Input value={form.guardianMobileNo} onChange={(e) => updateForm("guardianMobileNo", e.target.value)} placeholder="10-digit mobile number" className={errors.guardianMobileNo ? "border-red-500" : ""} />
                                                        {errors.guardianMobileNo && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.guardianMobileNo}</p>}
                                                    </div>
                                                </>
                                            )}

                                            <div className="col-span-full"><h3 className="text-lg font-semibold mb-4 mt-6">Address Details</h3></div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Address Line</Label>
                                                <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Street address" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">City</Label>
                                                <Input value={form.city} onChange={(e) => updateForm("city", e.target.value)} placeholder="City" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">State</Label>
                                                <Input value={form.state} onChange={(e) => updateForm("state", e.target.value)} placeholder="State" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Country</Label>
                                                <Input value={form.country} onChange={(e) => updateForm("country", e.target.value)} placeholder="Country" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Postal Code</Label>
                                                <Input value={form.postalCode} onChange={(e) => updateForm("postalCode", e.target.value)} placeholder="PIN/ZIP code" />
                                            </div>
                                        </>
                                    )}

                                    {/* PARENTS */}
                                    {roleType === "parents" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Guardian Name *</Label>
                                                <Input value={form.guardianName} onChange={(e) => updateForm("guardianName", e.target.value)} placeholder="Enter guardian name" className={errors.guardianName ? "border-red-500" : ""} />
                                                {errors.guardianName && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.guardianName}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email Address *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="parent@example.com" className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Select Student *</Label>
                                                <Popover open={open} onOpenChange={setOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                            {form.childId ? students.find((s) => s.id === form.childId)?.name || "Unknown student" : "Search and select student"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-full p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search by name, email, or ID..." />
                                                            <CommandEmpty>No student found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {students.map((student) => (
                                                                    <CommandItem key={student.id} onSelect={() => { updateForm("childId", student.id); setOpen(false) }}>
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
                                            </div>
                                        </>
                                    )}

                                    {/* ACCOUNTANTS */}
                                    {roleType === "accountants" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Name *</Label>
                                                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Enter name" className={errors.name ? "border-red-500" : ""} />
                                                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="email@example.com" className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Mobile</Label>
                                                <Input value={form.mobile} onChange={(e) => updateForm("mobile", e.target.value)} placeholder="10-digit mobile number" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Certificates</Label>
                                                <Input value={form.certificates.join(", ")} onChange={(e) => updateForm("certificates", e.target.value.split(",").map(c => c.trim()))} placeholder="Comma separated (e.g., CA, CPA)" />
                                            </div>
                                        </>
                                    )}

                                    {/* LIBRARIANS */}
                                    {roleType === "librarians" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Name *</Label>
                                                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Enter name" className={errors.name ? "border-red-500" : ""} />
                                                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="email@example.com" className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Library Location</Label>
                                                <Input value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="e.g., Main Building, 2nd Floor" />
                                            </div>
                                        </>
                                    )}

                                    {/* LAB ASSISTANTS */}
                                    {roleType === "labassistants" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Name *</Label>
                                                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Enter name" className={errors.name ? "border-red-500" : ""} />
                                                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="email@example.com" className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Address</Label>
                                                <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Enter address" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Lab Name</Label>
                                                <Input value={form.labName} onChange={(e) => updateForm("labName", e.target.value)} placeholder="e.g., Physics Lab, Chemistry Lab" />
                                            </div>
                                        </>
                                    )}

                                    {/* BUS DRIVERS */}
                                    {roleType === "busdrivers" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Name *</Label>
                                                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Enter name" className={errors.name ? "border-red-500" : ""} />
                                                {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Email *</Label>
                                                <Input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="email@example.com" className={errors.email ? "border-red-500" : ""} />
                                                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Password</Label>
                                                <Input type="password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Enter password" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Date of Birth</Label>
                                                <Input type="date" value={form.dob} onChange={(e) => updateForm("dob", e.target.value)} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Gender</Label>
                                                <Select value={form.gender} onValueChange={(value) => updateForm("gender", value)}>
                                                    <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Male</SelectItem>
                                                        <SelectItem value="FEMALE">Female</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Blood Group</Label>
                                                <Input value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)} placeholder="e.g., A+, B+, O+" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Address</Label>
                                                <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Enter address" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Bus Number</Label>
                                                <Input value={form.busNumber} onChange={(e) => updateForm("busNumber", e.target.value)} placeholder="e.g., BUS-001" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Student Capacity</Label>
                                                <Input type="number" value={form.studentCount} onChange={(e) => updateForm("studentCount", e.target.value)} placeholder="Number of students" />
                                            </div>
                                        </>
                                    )}

                                    <div className="col-span-full pt-4 border-t">
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={createProfileMutation.isPending}
                                            className="w-full md:w-auto min-w-[200px] h-11 text-base font-medium"
                                            size="lg"
                                        >
                                            {createProfileMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating Profile...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Create {getRoleTitle()} Profile
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}