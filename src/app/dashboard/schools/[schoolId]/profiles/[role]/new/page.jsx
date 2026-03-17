"use client"
import React, { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { format, differenceInYears } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandInput, CommandItem, CommandList, CommandGroup, CommandEmpty } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import FileUploadButton from '@/components/fileupload'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import CropImageDialog from "@/app/components/CropImageDialog"
import { uploadFilesToR2 } from '@/hooks/useR2Upload'
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Loader2, UserPlus, AlertCircle, X, Check, ChevronsUpDown,
    User, GraduationCap, Phone, Mail, Lock, MapPin, Calendar as CalIcon,
    Briefcase, Heart, Shield, Link2, ChevronRight, Save, RotateCcw,
    Users, BookOpen, Hash, Building2, Baby, FileText
} from "lucide-react"

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
}

// ─── Field wrapper with error ────────────────────────────────────────────────
const Field = ({ label, required, error, children, hint }) => (
    <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {children}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />{error}
            </p>
        )}
    </div>
)

// ─── Section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="col-span-full pt-2">
        <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
        </div>
        <Separator className="mt-2" />
    </div>
)

const ROLE_CONFIG = {
    teacher: { title: "Teacher", icon: GraduationCap, color: "blue" },
    students: { title: "Student", icon: BookOpen, color: "green" },
    parents: { title: "Parent", icon: Users, color: "purple" },
    "non-teaching": { title: "Non-Teaching Staff", icon: Building2, color: "orange" },
    staff: { title: "Staff", icon: Briefcase, color: "orange" },
    accountants: { title: "Accountant", icon: FileText, color: "teal" },
    librarians: { title: "Librarian", icon: BookOpen, color: "indigo" },
    labassistants: { title: "Lab Assistant", icon: Shield, color: "cyan" },
    busdrivers: { title: "Bus Driver", icon: Building2, color: "yellow" },
}

const EMPTY_FORM = {
    studentName: "", name: "", email: "", password: "", dob: null, gender: "",
    admissionNo: "", admissionDate: null, rollNumber: "", bloodGroup: "", adhaarNo: "",
    empployeeId: "", address: "", city: "", state: "", country: "", postalCode: "",
    classId: "", sectionId: "", userId: "", schoolId: "", parentId: "",
    fatherName: "", fatherMobileNumber: "", motherName: "", motherMobileNumber: "",
    guardianName: "", guardianRelation: "", guardianMobileNo: "", guardianType: "PARENTS",
    house: "", profilePicture: null, dateOfLeaving: null, certificates: [],
    mobile: "", contactNumber: "", busNumber: "", studentCount: "", location: "",
    district: "", labName: "", results: {}, teacherId: "", parentIds: [], designation: "",
    feeStatus: "PENDING", status: "ACTIVE", age: "", previousSchoolName: "",
    alternateNumber: "", occupation: "", qualification: "", annualIncome: "",
    emergencyContactName: "", emergencyContactNumber: "", emergencyContactRelation: ""
}

export default function NewProfilePage() {
    const { schoolId, role } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const roleType = role?.toLowerCase()
    const config = ROLE_CONFIG[roleType] || { title: "Profile", icon: User, color: "gray" }

    const [resetKey, setResetKey] = useState(0)
    const [previewUrl, setPreviewUrl] = useState("")
    const [uploading, setUploading] = useState(false)
    const [rawImage, setRawImage] = useState(null)
    const [cropDialogOpen, setCropDialogOpen] = useState(false)
    const [errors, setErrors] = useState({})
    const [emailToCheck, setEmailToCheck] = useState("")
    const [phoneToCheck, setPhoneToCheck] = useState("")
    const [studentSearchOpen, setStudentSearchOpen] = useState(false)
    const [studentSearchQuery, setStudentSearchQuery] = useState("")
    const [parentSearchOpen, setParentSearchOpen] = useState(false)
    const [parentSearchQuery, setParentSearchQuery] = useState("")
    const [selectedStudents, setSelectedStudents] = useState([])
    const [selectedParents, setSelectedParents] = useState([])
    const [generatingId, setGeneratingId] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const isDirtyRef = useRef(false)
    const DRAFT_KEY = `edubreezy_profile_draft_${schoolId}_${role}`

    const debouncedStudentSearch = useDebounce(studentSearchQuery, 500)
    const debouncedParentSearch = useDebounce(parentSearchQuery, 500)
    const debouncedEmail = useDebounce(emailToCheck, 600)
    const debouncedPhone = useDebounce(phoneToCheck, 600)

    // Draft restore
    useEffect(() => {
        try {
            const saved = localStorage.getItem(DRAFT_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed && typeof parsed === "object") {
                    const confirmed = window.confirm("You have an unsaved draft. Restore it?")
                    if (confirmed) {
                        setForm(prev => ({ ...prev, ...parsed }))
                        if (parsed.profilePicture) setPreviewUrl(parsed.profilePicture)
                        toast.info("Draft restored")
                    } else {
                        localStorage.removeItem(DRAFT_KEY)
                    }
                }
            }
        } catch { }
    }, [])

    const debouncedForm = useDebounce(form, 1500)
    useEffect(() => {
        if (!isDirtyRef.current) return
        try {
            const { password, ...safeForm } = debouncedForm
            localStorage.setItem(DRAFT_KEY, JSON.stringify(safeForm))
        } catch { }
    }, [debouncedForm, DRAFT_KEY])

    useEffect(() => {
        const handler = (e) => { if (!isDirtyRef.current) return; e.preventDefault(); e.returnValue = "" }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [])

    const updateForm = useCallback((field, value) => {
        isDirtyRef.current = true
        setForm(prev => ({ ...prev, [field]: value }))
        // Clear error when user fixes a field
        if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    }, [errors])

    // Auto-calculate age from DOB
    useEffect(() => {
        if (form.dob) {
            const age = differenceInYears(new Date(), new Date(form.dob))
            setForm(prev => ({ ...prev, age: age.toString() }))
        }
    }, [form.dob])

    // Queries
    const { data: classes = [], isLoading: classesLoading } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            return data.map(cls => ({ ...cls, sections: cls.sections || [] }))
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })

    const sections = form.classId === "ALL"
        ? classes.flatMap(c => c.sections || [])
        : (classes.find(c => c.id.toString() === form.classId)?.sections || [])

    const { data: studentsData, isLoading: studentsSearchLoading } = useQuery({
        queryKey: ['students-search', schoolId, debouncedStudentSearch],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/students/search?q=${encodeURIComponent(debouncedStudentSearch)}`)
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        enabled: !!schoolId && roleType === 'parents' && studentSearchOpen,
        staleTime: 30000,
        refetchOnWindowFocus: false,
    })

    const { data: parentsData, isLoading: parentsSearchLoading } = useQuery({
        queryKey: ['parents-search', schoolId, debouncedParentSearch],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/parents/search?q=${encodeURIComponent(debouncedParentSearch)}`)
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        enabled: !!schoolId && roleType === 'students' && parentSearchOpen,
        staleTime: 30000,
        refetchOnWindowFocus: false,
    })

    const { data: duplicateData } = useQuery({
        queryKey: ['check-duplicate', schoolId, debouncedEmail, debouncedPhone, role],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (debouncedEmail) params.set('email', debouncedEmail)
            if (debouncedPhone) params.set('phone', debouncedPhone)
            if (role) params.set('role', role)
            const res = await fetch(`/api/schools/${schoolId}/profiles/check-duplicate?${params}`)
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        enabled: !!schoolId && (!!debouncedEmail || !!debouncedPhone),
        staleTime: 10000,
        refetchOnWindowFocus: false,
    })

    const searchedStudents = studentsData?.students || []
    const searchedParents = parentsData?.parents || []

    const generateId = async (type) => {
        try {
            setGeneratingId(true)
            const res = await fetch(`/api/schools/${schoolId}/settings/next-id?type=${type}`)
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            if (type === 'student') updateForm("admissionNo", data.nextId)
            else updateForm("empployeeId", data.nextId)
            toast.success("ID generated")
        } catch { toast.error("Could not generate ID") }
        finally { setGeneratingId(false) }
    }

    const createMutation = useMutation({
        mutationFn: async (formData) => {
            const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession()
            const token = session?.access_token
            if (!token) throw new Error("Not authenticated")
            const res = await fetch(`/api/schools/${schoolId}/profiles/${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(formData)
            })
            if (!res.ok) {
                const err = await res.json()
                const e = new Error(err.message || err.error || "Failed")
                e.fieldErrors = err.fieldErrors || null
                e.status = res.status
                throw e
            }
            return res.json()
        },
        onSuccess: async () => {
            try { localStorage.removeItem(DRAFT_KEY) } catch { }
            isDirtyRef.current = false
            toast.success(`${config.title} profile created successfully`)

            const roleQueryKeyMap = {
                'teacher': 'teaching-staff',
                'students': 'students',
                'non-teaching': 'non-teaching-staff',
                'parents': 'parents',
            }
            const listKey = roleQueryKeyMap[roleType] || roleType
            queryClient.removeQueries({ queryKey: [listKey] })
            queryClient.removeQueries({ queryKey: ['profiles', schoolId] })
            if (listKey === 'teaching-staff') {
                queryClient.removeQueries({ queryKey: ['teaching-staff-designations'] })
            }
            if (listKey === 'non-teaching-staff') {
                queryClient.removeQueries({ queryKey: ['non-teaching-staff-designations'] })
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: [listKey] }),
                queryClient.invalidateQueries({ queryKey: ['profiles', schoolId] }),
            ])

            setResetKey(p => p + 1)
            setForm(EMPTY_FORM)
            setSelectedStudents([])
            setSelectedParents([])
            setPreviewUrl("")

            const listUrlMap = {
                'teacher': '/dashboard/schools/manage-teaching-staff',
                'students': '/dashboard/schools/manage-student',
                'non-teaching': '/dashboard/schools/manage-non-teaching-staff',
                'parents': '/dashboard/schools/manage-parent',
            }
            router.push(listUrlMap[roleType] || `/dashboard/schools/${schoolId}/profiles/${role}`)
        },
        onError: (error) => {
            if (error.fieldErrors) {
                setErrors(prev => ({ ...prev, ...error.fieldErrors }))
                Object.entries(error.fieldErrors).forEach(([field, msg]) => toast.error(`${field}: ${msg}`))
            } else {
                toast.error(error.message || "Creation failed")
            }
        }
    })

    const validateForm = () => {
        const newErrors = {}
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email format"
        if (duplicateData?.emailExists) newErrors.email = "This email is already registered"
        if (duplicateData?.phoneExists) newErrors.contactNumber = "This phone number is already registered"
        if (form.adhaarNo && !/^\d{12}$/.test(form.adhaarNo)) newErrors.adhaarNo = "Must be 12 digits"
        if (form.postalCode && !/^\d{6}$/.test(form.postalCode)) newErrors.postalCode = "Must be 6 digits"
        if (form.dob) {
            const dobDate = new Date(form.dob)
            if (dobDate > new Date()) newErrors.dob = "Cannot be in the future"
            else {
                const age = differenceInYears(new Date(), dobDate)
                if (roleType === "students" && age < 3) newErrors.dob = "Student must be at least 3 years old"
                else if (["teacher", "staff", "non-teaching"].includes(roleType) && age < 18) newErrors.dob = "Staff must be at least 18 years old"
                else if (age > 100) newErrors.dob = "Please enter a valid date of birth"
            }
        }
        if (roleType === "students") {
            if (!form.studentName) newErrors.studentName = "Student name is required"
            if (!form.admissionNo) newErrors.admissionNo = "Admission number is required"
            if (!form.classId) newErrors.classId = "Class is required"
            if (!form.sectionId) newErrors.sectionId = "Section is required"
            if (!form.gender) newErrors.gender = "Gender is required"
            if (form.guardianType === "PARENTS") {
                if (!form.fatherName) newErrors.fatherName = "Father's name is required"
                if (!form.fatherMobileNumber) newErrors.fatherMobileNumber = "Father's mobile is required"
                else if (!/^\d{10}$/.test(form.fatherMobileNumber)) newErrors.fatherMobileNumber = "Must be 10 digits"
            }
            if (form.guardianType === "GUARDIAN") {
                if (!form.guardianName) newErrors.guardianName = "Guardian's name is required"
                if (!form.guardianMobileNo) newErrors.guardianMobileNo = "Guardian's mobile is required"
                else if (!/^\d{10}$/.test(form.guardianMobileNo)) newErrors.guardianMobileNo = "Must be 10 digits"
            }
        }
        if (roleType === "parents") {
            if (!form.guardianName) newErrors.guardianName = "Name is required"
            if (!form.email) newErrors.email = newErrors.email || "Email is required"
            if (!form.contactNumber) newErrors.contactNumber = newErrors.contactNumber || "Contact is required"
            else if (!/^\d{10}$/.test(form.contactNumber)) newErrors.contactNumber = "Must be 10 digits"
            if (!form.gender) newErrors.gender = "Gender is required"
            if (!form.password) newErrors.password = "Password is required"
            else if (form.password.length < 6) newErrors.password = "At least 6 characters"
            if (form.alternateNumber && !/^\d{10}$/.test(form.alternateNumber)) newErrors.alternateNumber = "Must be 10 digits"
        }
        if (roleType === "students") {
            if (form.motherMobileNumber && !/^\d{10}$/.test(form.motherMobileNumber)) newErrors.motherMobileNumber = "Must be 10 digits"
            if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber)) newErrors.contactNumber = "Must be 10 digits"
        }
        if (["teacher", "staff", "non-teaching"].includes(roleType)) {
            if (!form.name) newErrors.name = "Name is required"
            if (!form.email) newErrors.email = newErrors.email || "Email is required"
            if (!form.password) newErrors.password = "Password is required"
            else if (form.password.length < 6) newErrors.password = "At least 6 characters"
            if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber)) newErrors.contactNumber = "Must be 10 digits"
        }
        if (["accountants", "librarians", "labassistants", "busdrivers"].includes(roleType)) {
            if (!form.name) newErrors.name = "Name is required"
            if (!form.email) newErrors.email = newErrors.email || "Email is required"
            if (!form.password) newErrors.password = "Password is required"
            else if (form.password.length < 6) newErrors.password = "At least 6 characters"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validateForm()) { toast.error("Please fix the errors before submitting"); return }
        const cleanForm = {
            ...form,
            dob: form.dob ? new Date(form.dob).toISOString() : null,
            admissionDate: form.admissionDate ? new Date(form.admissionDate).toISOString() : null,
            dateOfLeaving: form.dateOfLeaving ? new Date(form.dateOfLeaving).toISOString() : null,
            parentId: form.parentId || null,
            userId: form.userId || undefined,
            schoolId,
            linkedStudentIds: selectedStudents.map(s => s.userId || s.id),
            linkedParentIds: selectedParents.map(p => p.id),
        }
        createMutation.mutate(cleanForm)
    }

    const handleImageUpload = (url) => {
        if (!url || url === rawImage) return
        setRawImage(url)
        setCropDialogOpen(true)
    }

    const isStaff = ["teacher", "staff", "non-teaching", "accountants", "librarians", "labassistants", "busdrivers"].includes(roleType)
    const isPending = createMutation.isPending
    const hasErrors = duplicateData?.emailExists || duplicateData?.phoneExists

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 lg:p-8">
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => { if (!uploading) setCropDialogOpen(false) }}
                    uploading={uploading}
                    open={cropDialogOpen}
                    onCropComplete={async (croppedBlob) => {
                        const filename = `profile-${Date.now()}.jpg`
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" })
                        try {
                            setUploading(true)
                            const res = await uploadFilesToR2('profiles', { files: [file] })
                            if (res?.[0]?.url) {
                                updateForm("profilePicture", res[0].url)
                                setPreviewUrl(res[0].url)
                                toast.success("Photo uploaded")
                            } else toast.error("Upload failed")
                        } catch { toast.error("Upload error") }
                        finally { setUploading(false); setCropDialogOpen(false) }
                    }}
                />
            )}

            <div className="max-w-5xl mx-auto space-y-6">
                {/* Page Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <config.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Add New {config.title}</h1>
                        <p className="text-sm text-muted-foreground">Fill in the details below. Fields marked <span className="text-red-500">*</span> are required.</p>
                    </div>
                </div>

                {/* Profile Picture Card */}
                <Card className="border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                        <User className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium mb-1">Profile Picture</p>
                                <p className="text-xs text-muted-foreground mb-3">Recommended: square image, min 200×200px</p>
                                <FileUploadButton onChange={handleImageUpload} resetKey={resetKey} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading state for classes */}
                {classesLoading && roleType === "students" && (
                    <Card><CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><span className="text-muted-foreground text-sm">Loading classes...</span>
                    </CardContent></Card>
                )}

                {/* ── STUDENT FORM ──────────────────────────────────────────── */}
                {roleType === "students" && !classesLoading && (
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Student Information</CardTitle>
                            <CardDescription>Academic and personal details for the student</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <SectionHeader icon={BookOpen} title="Academic Details" />

                                <Field label="Admission Number" required error={errors.admissionNo}>
                                    <div className="flex gap-2">
                                        <Input value={form.admissionNo} onChange={e => updateForm("admissionNo", e.target.value)} placeholder="e.g., STU-2024-001" className={errors.admissionNo ? "border-red-500" : ""} />
                                        <Button type="button" variant="outline" size="sm" onClick={() => generateId('student')} disabled={generatingId} className="shrink-0">
                                            {generatingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto"}
                                        </Button>
                                    </div>
                                </Field>

                                <Field label="Admission Date">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!form.admissionDate && "text-muted-foreground"}`}>
                                                <CalIcon className="mr-2 h-4 w-4" />
                                                {form.admissionDate ? format(form.admissionDate, "dd MMM yyyy") : "Select date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.admissionDate} onSelect={d => updateForm("admissionDate", d)} initialFocus /></PopoverContent>
                                    </Popover>
                                </Field>

                                <Field label="Student Name" required error={errors.studentName}>
                                    <Input value={form.studentName} onChange={e => updateForm("studentName", e.target.value)} placeholder="Full name" className={errors.studentName ? "border-red-500" : ""} />
                                </Field>

                                <Field label="Class" required error={errors.classId}>
                                    <Select value={form.classId} onValueChange={v => { updateForm("classId", v); updateForm("sectionId", "") }}>
                                        <SelectTrigger className={errors.classId ? "border-red-500" : ""}><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Section" required error={errors.sectionId}>
                                    <Select value={form.sectionId} onValueChange={v => updateForm("sectionId", v)} disabled={!form.classId}>
                                        <SelectTrigger className={errors.sectionId ? "border-red-500" : ""}><SelectValue placeholder={form.classId ? "Select section" : "Select class first"} /></SelectTrigger>
                                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Roll Number">
                                    <Input value={form.rollNumber} onChange={e => updateForm("rollNumber", e.target.value)} placeholder="e.g., 42" />
                                </Field>

                                <Field label="House">
                                    <Input value={form.house} onChange={e => updateForm("house", e.target.value)} placeholder="e.g., Red, Blue" />
                                </Field>

                                <Field label="Previous School">
                                    <Input value={form.previousSchoolName} onChange={e => updateForm("previousSchoolName", e.target.value)} placeholder="Previous school name" />
                                </Field>

                                <SectionHeader icon={User} title="Personal Details" />

                                <Field label="Date of Birth" error={errors.dob}>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={`w-full justify-start text-left font-normal ${!form.dob && "text-muted-foreground"} ${errors.dob ? "border-red-500" : ""}`}>
                                                <CalIcon className="mr-2 h-4 w-4" />
                                                {form.dob ? format(form.dob, "dd MMM yyyy") : "Select date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.dob} onSelect={d => updateForm("dob", d)} initialFocus /></PopoverContent>
                                    </Popover>
                                </Field>

                                <Field label="Age" hint="Auto-calculated from DOB">
                                    <Input value={form.age} readOnly className="bg-muted cursor-not-allowed" placeholder="Calculated from DOB" />
                                </Field>

                                <Field label="Gender" required error={errors.gender}>
                                    <Select value={form.gender} onValueChange={v => updateForm("gender", v)}>
                                        <SelectTrigger className={errors.gender ? "border-red-500" : ""}><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MALE">Male</SelectItem>
                                            <SelectItem value="FEMALE">Female</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Blood Group">
                                    <Select value={form.bloodGroup} onValueChange={v => updateForm("bloodGroup", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Aadhaar Number" error={errors.adhaarNo} hint="12 digits">
                                    <Input value={form.adhaarNo} onChange={e => updateForm("adhaarNo", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit Aadhaar" maxLength={12} className={errors.adhaarNo ? "border-red-500" : ""} />
                                </Field>

                                <Field label="Contact Number" error={errors.contactNumber}>
                                    <Input value={form.contactNumber} onChange={e => updateForm("contactNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" maxLength={10} />
                                </Field>

                                <Field label="Email Address" error={errors.email}>
                                    <Input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} onBlur={e => setEmailToCheck(e.target.value)} placeholder="student@email.com" className={errors.email ? "border-red-500" : ""} />
                                </Field>

                                <Field label="Password">
                                    <Input type="password" value={form.password} onChange={e => updateForm("password", e.target.value)} placeholder="Set login password" />
                                </Field>

                                <SectionHeader icon={MapPin} title="Address" />
                                <Field label="Address Line">
                                    <Input value={form.address} onChange={e => updateForm("address", e.target.value)} placeholder="Street address" />
                                </Field>
                                <Field label="City"><Input value={form.city} onChange={e => updateForm("city", e.target.value)} placeholder="City" /></Field>
                                <Field label="State"><Input value={form.state} onChange={e => updateForm("state", e.target.value)} placeholder="State" /></Field>
                                <Field label="Country"><Input value={form.country} onChange={e => updateForm("country", e.target.value)} placeholder="Country" /></Field>
                                <Field label="Postal Code" error={errors.postalCode}>
                                    <Input value={form.postalCode} onChange={e => updateForm("postalCode", e.target.value)} placeholder="6-digit PIN" maxLength={6} className={errors.postalCode ? "border-red-500" : ""} />
                                </Field>

                                {/* Link Parents */}
                                <SectionHeader icon={Link2} title="Link Parents" description="Optional — search and link existing parent accounts" />
                                <div className="col-span-full space-y-3">
                                    <Popover open={parentSearchOpen} onOpenChange={setParentSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between">
                                                {selectedParents.length > 0 ? `${selectedParents.length} parent(s) selected` : "Search and select parents"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput placeholder="Search by name, email, phone..." value={parentSearchQuery} onValueChange={setParentSearchQuery} />
                                                <CommandList>
                                                    <CommandEmpty>{parentsSearchLoading ? "Searching..." : "No parents found"}</CommandEmpty>
                                                    <CommandGroup>
                                                        {searchedParents.map(p => {
                                                            const sel = selectedParents.some(x => x.id === p.id)
                                                            return (
                                                                <CommandItem key={p.id} onSelect={() => {
                                                                    setSelectedParents(prev => sel ? prev.filter(x => x.id !== p.id) : [...prev, p])
                                                                }} className="cursor-pointer">
                                                                    <div className={`h-4 w-4 border rounded flex items-center justify-center mr-2 flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                                                        {sel && <Check className="h-3 w-3 text-white" />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-sm">{p.name}</p>
                                                                        <p className="text-xs text-muted-foreground">{p.email} · {p.contactNumber}</p>
                                                                    </div>
                                                                </CommandItem>
                                                            )
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {selectedParents.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedParents.map(p => (
                                                <Badge key={p.id} variant="secondary" className="gap-1.5 pr-1.5">
                                                    {p.name}
                                                    <button onClick={() => setSelectedParents(prev => prev.filter(x => x.id !== p.id))} className="rounded-full hover:bg-muted p-0.5">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Guardian */}
                                <SectionHeader icon={Heart} title="Guardian Information" />
                                <div className="col-span-full">
                                    <RadioGroup value={form.guardianType} onValueChange={v => updateForm("guardianType", v)} className="flex gap-6">
                                        <div className="flex items-center gap-2"><RadioGroupItem value="PARENTS" id="gp" /><Label htmlFor="gp" className="cursor-pointer font-normal">Parents</Label></div>
                                        <div className="flex items-center gap-2"><RadioGroupItem value="GUARDIAN" id="gg" /><Label htmlFor="gg" className="cursor-pointer font-normal">Guardian</Label></div>
                                    </RadioGroup>
                                </div>
                                {form.guardianType === "PARENTS" ? (
                                    <>
                                        <Field label="Father's Name" required error={errors.fatherName}>
                                            <Input value={form.fatherName} onChange={e => updateForm("fatherName", e.target.value)} placeholder="Father's full name" className={errors.fatherName ? "border-red-500" : ""} />
                                        </Field>
                                        <Field label="Father's Mobile" required error={errors.fatherMobileNumber}>
                                            <Input value={form.fatherMobileNumber} onChange={e => updateForm("fatherMobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" maxLength={10} className={errors.fatherMobileNumber ? "border-red-500" : ""} />
                                        </Field>
                                        <Field label="Mother's Name">
                                            <Input value={form.motherName} onChange={e => updateForm("motherName", e.target.value)} placeholder="Mother's full name" />
                                        </Field>
                                        <Field label="Mother's Mobile">
                                            <Input value={form.motherMobileNumber} onChange={e => updateForm("motherMobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" maxLength={10} />
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <Field label="Guardian's Name" required error={errors.guardianName}>
                                            <Input value={form.guardianName} onChange={e => updateForm("guardianName", e.target.value)} placeholder="Guardian's full name" className={errors.guardianName ? "border-red-500" : ""} />
                                        </Field>
                                        <Field label="Relation">
                                            <Input value={form.guardianRelation} onChange={e => updateForm("guardianRelation", e.target.value)} placeholder="e.g., Uncle, Aunt" />
                                        </Field>
                                        <Field label="Guardian's Mobile" required error={errors.guardianMobileNo}>
                                            <Input value={form.guardianMobileNo} onChange={e => updateForm("guardianMobileNo", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" maxLength={10} className={errors.guardianMobileNo ? "border-red-500" : ""} />
                                        </Field>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── PARENT FORM ──────────────────────────────────────────── */}
                {roleType === "parents" && (
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Parent / Guardian Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <SectionHeader icon={User} title="Basic Details" />
                                <Field label="Full Name" required error={errors.guardianName}>
                                    <Input value={form.guardianName} onChange={e => updateForm("guardianName", e.target.value)} placeholder="Parent's full name" className={errors.guardianName ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Gender" required error={errors.gender}>
                                    <Select value={form.gender} onValueChange={v => updateForm("gender", v)}>
                                        <SelectTrigger className={errors.gender ? "border-red-500" : ""}><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MALE">Male</SelectItem>
                                            <SelectItem value="FEMALE">Female</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Blood Group">
                                    <Select value={form.bloodGroup} onValueChange={v => updateForm("bloodGroup", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Occupation">
                                    <Input value={form.occupation} onChange={e => updateForm("occupation", e.target.value)} placeholder="e.g., Engineer, Doctor" />
                                </Field>
                                <Field label="Qualification">
                                    <Select value={form.qualification} onValueChange={v => updateForm("qualification", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {["10th", "12th", "Graduate", "Post Graduate", "PhD", "Diploma", "Other"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Annual Income">
                                    <Select value={form.annualIncome} onValueChange={v => updateForm("annualIncome", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                                        <SelectContent>
                                            {["Below 2L", "2L-5L", "5L-10L", "10L-20L", "Above 20L"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <SectionHeader icon={Lock} title="Account Credentials" />
                                <Field label="Email Address" required error={errors.email}>
                                    <Input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} onBlur={e => setEmailToCheck(e.target.value)} placeholder="parent@email.com" className={errors.email ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Password" required error={errors.password}>
                                    <Input type="password" value={form.password} onChange={e => updateForm("password", e.target.value)} placeholder="Min 6 characters" className={errors.password ? "border-red-500" : ""} />
                                </Field>

                                <SectionHeader icon={Phone} title="Contact Details" />
                                <Field label="Contact Number" required error={errors.contactNumber}>
                                    <Input value={form.contactNumber} onChange={e => updateForm("contactNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={e => setPhoneToCheck(e.target.value)} placeholder="10-digit" maxLength={10} className={errors.contactNumber ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Alternate Number" error={errors.alternateNumber}>
                                    <Input value={form.alternateNumber} onChange={e => updateForm("alternateNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit (optional)" maxLength={10} className={errors.alternateNumber ? "border-red-500" : ""} />
                                </Field>

                                <SectionHeader icon={MapPin} title="Address" />
                                <Field label="Address"><Input value={form.address} onChange={e => updateForm("address", e.target.value)} placeholder="Street address" /></Field>
                                <Field label="City"><Input value={form.city} onChange={e => updateForm("city", e.target.value)} placeholder="City" /></Field>
                                <Field label="State"><Input value={form.state} onChange={e => updateForm("state", e.target.value)} placeholder="State" /></Field>
                                <Field label="Country"><Input value={form.country} onChange={e => updateForm("country", e.target.value)} placeholder="Country" /></Field>
                                <Field label="Postal Code" error={errors.postalCode}>
                                    <Input value={form.postalCode} onChange={e => updateForm("postalCode", e.target.value)} placeholder="6-digit PIN" maxLength={6} className={errors.postalCode ? "border-red-500" : ""} />
                                </Field>

                                <SectionHeader icon={Shield} title="Emergency Contact" description="Optional" />
                                <Field label="Name"><Input value={form.emergencyContactName} onChange={e => updateForm("emergencyContactName", e.target.value)} placeholder="Emergency contact name" /></Field>
                                <Field label="Number" error={errors.emergencyContactNumber}>
                                    <Input value={form.emergencyContactNumber} onChange={e => updateForm("emergencyContactNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" maxLength={10} className={errors.emergencyContactNumber ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Relation"><Input value={form.emergencyContactRelation} onChange={e => updateForm("emergencyContactRelation", e.target.value)} placeholder="e.g., Uncle" /></Field>

                                {/* Link Students */}
                                <SectionHeader icon={Link2} title="Link Students" description="Optional — link existing students to this parent" />
                                <div className="col-span-full space-y-3">
                                    <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between">
                                                {selectedStudents.length > 0 ? `${selectedStudents.length} student(s) linked` : "Search and select students"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput placeholder="Search by name or admission no..." value={studentSearchQuery} onValueChange={setStudentSearchQuery} />
                                                <CommandList>
                                                    <CommandEmpty>{studentsSearchLoading ? "Searching..." : "No students found"}</CommandEmpty>
                                                    <CommandGroup>
                                                        {searchedStudents.map(s => {
                                                            const sid = s.userId || s.id
                                                            const sel = selectedStudents.some(x => (x.userId || x.id) === sid)
                                                            return (
                                                                <CommandItem key={sid} onSelect={() => {
                                                                    setSelectedStudents(prev => sel ? prev.filter(x => (x.userId || x.id) !== sid) : [...prev, s])
                                                                }} className="cursor-pointer">
                                                                    <div className={`h-4 w-4 border rounded flex items-center justify-center mr-2 flex-shrink-0 ${sel ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                                                        {sel && <Check className="h-3 w-3 text-white" />}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-sm">{s.name}</p>
                                                                        <p className="text-xs text-muted-foreground">Adm: {s.admissionNo} · {s.email}</p>
                                                                    </div>
                                                                </CommandItem>
                                                            )
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {selectedStudents.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedStudents.map(s => {
                                                const sid = s.userId || s.id
                                                return (
                                                    <Badge key={sid} variant="secondary" className="gap-1.5 pr-1.5">
                                                        {s.name}
                                                        <button onClick={() => setSelectedStudents(prev => prev.filter(x => (x.userId || x.id) !== sid))} className="rounded-full hover:bg-muted p-0.5">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── STAFF / TEACHER FORM ──────────────────────────────────── */}
                {isStaff && (
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">{config.title} Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <SectionHeader icon={Briefcase} title="Professional Details" />
                                <Field label="Full Name" required error={errors.name}>
                                    <Input value={form.name} onChange={e => updateForm("name", e.target.value)} placeholder="Full name" className={errors.name ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Employee ID">
                                    <div className="flex gap-2">
                                        <Input value={form.empployeeId} onChange={e => updateForm("empployeeId", e.target.value)} placeholder="e.g., EMP-001" />
                                        <Button type="button" variant="outline" size="sm" onClick={() => generateId('employee')} disabled={generatingId} className="shrink-0">
                                            {generatingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto"}
                                        </Button>
                                    </div>
                                </Field>
                                <Field label="Designation">
                                    <Input value={form.designation} onChange={e => updateForm("designation", e.target.value)} placeholder="e.g., Senior Teacher, HOD" />
                                </Field>
                                {roleType === "labassistants" && (
                                    <Field label="Lab Name">
                                        <Input value={form.labName} onChange={e => updateForm("labName", e.target.value)} placeholder="e.g., Physics Lab" />
                                    </Field>
                                )}
                                {roleType === "accountants" && (
                                    <Field label="Certificates" hint="Comma separated">
                                        <Input
                                            value={Array.isArray(form.certificates) ? form.certificates.join(", ") : ""}
                                            onChange={e => updateForm("certificates", e.target.value.split(",").map(c => c.trim()).filter(Boolean))}
                                            placeholder="e.g., CA, CPA, CFA"
                                        />
                                    </Field>
                                )}
                                {roleType === "librarians" && (
                                    <Field label="Library Location">
                                        <Input value={form.location} onChange={e => updateForm("location", e.target.value)} placeholder="e.g., Main Building, 2nd Floor" />
                                    </Field>
                                )}
                                {roleType === "busdrivers" && (
                                    <>
                                        <Field label="Bus Number"><Input value={form.busNumber} onChange={e => updateForm("busNumber", e.target.value)} placeholder="e.g., BUS-001" /></Field>
                                        <Field label="Student Capacity"><Input type="number" value={form.studentCount} onChange={e => updateForm("studentCount", e.target.value)} placeholder="Max students" /></Field>
                                    </>
                                )}

                                <SectionHeader icon={User} title="Personal Details" />
                                <Field label="Date of Birth" error={errors.dob}>
                                    <Input type="date" value={form.dob || ""} onChange={e => updateForm("dob", e.target.value)} className={errors.dob ? "border-red-500" : ""} />
                                </Field>
                                <Field label="Age" hint="Auto-calculated from DOB">
                                    <Input value={form.age} readOnly className="bg-muted cursor-not-allowed" placeholder="Calculated from DOB" />
                                </Field>
                                <Field label="Gender">
                                    <Select value={form.gender} onValueChange={v => updateForm("gender", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MALE">Male</SelectItem>
                                            <SelectItem value="FEMALE">Female</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Blood Group">
                                    <Select value={form.bloodGroup} onValueChange={v => updateForm("bloodGroup", v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>

                                <SectionHeader icon={Lock} title="Account Credentials" />
                                <Field label="Email Address" required error={errors.email}>
                                    <Input type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} onBlur={e => setEmailToCheck(e.target.value)} placeholder="staff@email.com" className={errors.email ? "border-red-500" : ""} />
                                    {!errors.email && duplicateData?.emailExists && (
                                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />Already registered</p>
                                    )}
                                </Field>
                                <Field label="Password" required error={errors.password}>
                                    <Input type="password" value={form.password} onChange={e => updateForm("password", e.target.value)} placeholder="Min 6 characters" className={errors.password ? "border-red-500" : ""} />
                                </Field>

                                <SectionHeader icon={Phone} title="Contact" />
                                <Field label="Contact Number" error={errors.contactNumber}>
                                    <Input value={form.contactNumber} onChange={e => updateForm("contactNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={e => setPhoneToCheck(e.target.value)} placeholder="10-digit" maxLength={10} className={errors.contactNumber ? "border-red-500" : ""} />
                                    {!errors.contactNumber && duplicateData?.phoneExists && (
                                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />Already registered</p>
                                    )}
                                </Field>
                                {roleType === "accountants" && (
                                    <Field label="Mobile" hint="Alternate mobile number">
                                        <Input value={form.mobile} onChange={e => updateForm("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" maxLength={10} />
                                    </Field>
                                )}

                                <SectionHeader icon={MapPin} title="Address" />
                                <Field label="Address"><Input value={form.address} onChange={e => updateForm("address", e.target.value)} placeholder="Street address" /></Field>
                                <Field label="City"><Input value={form.city} onChange={e => updateForm("city", e.target.value)} placeholder="City" /></Field>
                                <Field label="District"><Input value={form.district} onChange={e => updateForm("district", e.target.value)} placeholder="District" /></Field>
                                <Field label="State"><Input value={form.state} onChange={e => updateForm("state", e.target.value)} placeholder="State" /></Field>
                                <Field label="Country"><Input value={form.country} onChange={e => updateForm("country", e.target.value)} placeholder="Country" /></Field>
                                <Field label="Postal Code" error={errors.postalCode}>
                                    <Input value={form.postalCode} onChange={e => updateForm("postalCode", e.target.value)} placeholder="6-digit PIN" maxLength={6} className={errors.postalCode ? "border-red-500" : ""} />
                                </Field>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Submit Footer */}
                <Card className="border shadow-sm sticky bottom-4">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground">
                                {Object.keys(errors).length > 0 && (
                                    <span className="text-red-500 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        {Object.keys(errors).length} error(s) to fix
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (window.confirm("Reset form? Unsaved changes will be lost.")) {
                                            setForm(EMPTY_FORM)
                                            setErrors({})
                                            setSelectedStudents([])
                                            setSelectedParents([])
                                            setPreviewUrl("")
                                            setResetKey(p => p + 1)
                                            isDirtyRef.current = false
                                            try { localStorage.removeItem(DRAFT_KEY) } catch { }
                                        }
                                    }}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />Reset
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isPending || hasErrors}
                                    size="lg"
                                    className="min-w-[180px]"
                                >
                                    {isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" />Create {config.title}</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}