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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import CropImageDialog from "@/app/components/CropImageDialog";
import { uploadFiles } from "@/app/components/utils/uploadThing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandInput, CommandItem, CommandGroup } from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import FileUploadButton from '@/components/fileupload'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

export default function NewProfilePage() {
    const { schoolId, role } = useParams()
    const [classes, setClasses] = useState([])
    const [resetKey, setResetKey] = useState(0);

    const [selectedClassId, setSelectedClassId] = useState("")
    const [selectedSectionId, setSelectedSectionId] = useState("")
    const [previewUrl, setPreviewUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [errorUpload, setErrorupload] = useState(false);

    const [rawImage, setRawImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);


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


    const router = useRouter()
    const baseForm = {
        // Required fields for student creation
        studentName: "", // this maps to 'name' in DB
        name: "",        // optionally unify with studentName if not used separately
        email: "",
        password: "",
        dob: null, // ✅ Date object or null
        gender: "", // "MALE" | "FEMALE" | "OTHER"

        admissionNo: "",
        admissionDate: null, // ✅ Date object
        rollNumber: "",
        academicYear: "",
        bloodGroup: "",
        adhaarNo: "",
        empployeeId: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",

        // Class & Section
        classId: "",
        sectionId: "",

        // School & User context
        userId: "",     // auto-filled by backend usually
        schoolId: "",   // passed from URL or context
        parentId: "",   // optional

        // Guardian and Parent Info
        fatherName: "",
        fatherMobileNumber: "",
        motherName: "",
        motherMobileNumber: "",
        guardianName: "",
        guardianRelation: "",
        guardianMobileNo: "",
        guardianType: "PARENTS", // or "GUARDIAN"

        // Optional student metadata
        house: "",
        profilePicture: null, // File object
        dateOfLeaving: null, // ✅ Date object or null
        certificates: [],

        // Optional/Extra
        mobile: "",             // use this for contactNumber
        contactNumber: "",      // maps to contactNumber in DB
        session: "",            // may duplicate academicYear
        busNumber: "",
        studentCount: "",
        location: "",
        role: "",
        district: "",
        labName: "",
        results: {},            // optional exam results object
        teacherId: "",
        parentIds: [],          // if multiple guardians
        designation: "",
        // Backend-tracked fields
        feeStatus: "PENDING",   // "PENDING" | "PAID" | etc.
        status: "ACTIVE",       // "ACTIVE" | "INACTIVE"
    }

    const [form, setForm] = useState(baseForm);

    // Derived value (depends on `classes` and `form`)
    const sections = form.classId === "ALL"
        ? classes.flatMap((cls) => cls.sections || [])
        : (classes.find((cls) => cls.id.toString() === form.classId)?.sections || []);
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        try {
            setLoading(true)
            const cleanForm = {
                ...form,
                dob: form.dob ? new Date(form.dob).toISOString() : null,
                admissionDate: form.admissionDate ? new Date(form.admissionDate).toISOString() : null,
                dateOfLeaving: form.dateOfLeaving ? new Date(form.dateOfLeaving).toISOString() : null,
                parentId: form.parentId || null,
                userId: form.userId || undefined,
                schoolId: schoolId,
            };
            const res = await fetch(`/api/schools/${schoolId}/profiles/${role}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleanForm)
            })
            if (!res.ok) throw new Error("Failed to create profile")
            toast.success(`${role} profile created`)
            setResetKey((prev) => prev + 1)
            router.push(`/dashboard/schools/${schoolId}/manage`)
        } catch {
            toast.error("Creation failed")
        } finally {
            setLoading(false)
        }
    }
    const handleImageUpload = (previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    }
    function renderFields(role) {
        switch (role?.toLowerCase()) {
            case "teacher":
                return (
                    <>
                        <FileUploadButton field="Teacher" onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
                        <Input placeholder="Teacher Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Teacher Employee Id " value={form.empployeeId} onChange={(e) => setForm({ ...form, empployeeId: e.target.value })} />
                        <Input placeholder="Teacher Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Teacher Age" />
                        <Input placeholder="Teacher Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input type="password" placeholder="Teacher Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Teacher Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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
                        <Input placeholder="Teacher Address Line 1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Input placeholder="Teacher City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        <Input placeholder="Teacher District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                        <Input placeholder="Teacher Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                        <Input placeholder="Teacher Postal Code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                        <Input placeholder="Teacher State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
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
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!form.dob ? "text-muted-foreground" : ""}`}
                                >
                                    {form.dob ? format(form.dob, "PPP") : "DOB"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={form.admissionDate}
                                    onSelect={(date) => setForm({ ...form, dob: date })}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>


                        <Select
                            value={form.classId}
                            onValueChange={(value) => {
                                setForm({ ...form, classId: value, sectionId: "" });
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Classes</SelectItem>
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
                                <SelectItem value="ALL">All Sections</SelectItem>
                                {sections.map((sec) => (
                                    <SelectItem key={sec.id} value={sec.id.toString()}>
                                        {sec.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input placeholder="Roll Number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />

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
                        <div>
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
                      </div>
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
                  
                        <Input
                            placeholder="Address Line 1"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                        <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                        <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                        <Input placeholder="Postal Code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
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
            case "staff":
                return (
                    <>
                        <FileUploadButton field="Staff" onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
                        <Input placeholder="Staff Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <Input placeholder="Staff Employee Id " value={form.empployeeId} onChange={(e) => setForm({ ...form, empployeeId: e.target.value })} />
                        <Input placeholder="Staff Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                        <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
                        <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Staff Age" />
                        <Input placeholder="Staff Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <Input type="password" placeholder="Staff Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <Input placeholder="Blood Group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
                        <Input placeholder="Staff Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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
                        <Input placeholder="Staff Address Line 1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <Input placeholder="Staff City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        <Input placeholder="Staff District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                        <Input placeholder="Staff Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                        <Input placeholder="Staff Postal Code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                        <Input placeholder="Staff State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
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
        <div className="w-full h-full p-6">
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => {
                        if (!uploading) {
                            setCropDialogOpen(false);
                        }
                    }}
                    uploading={uploading}

                    open={cropDialogOpen}
                    // onClose={() => setCropDialogOpen(false)}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date();
                        const iso = now.toISOString().replace(/[:.]/g, "-");
                        const perf = Math.floor(performance.now() * 1000); // microseconds (approximate nanos)
                        const timestamp = `${iso}-${perf}`;
                        const filename = `${timestamp}.jpg`;
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" });
                        setTempImage(file);
                        try {
                            setUploading(true)

                            const res = await uploadFiles("profilePictureUploader", {
                                files: [file],
                                input: {
                                    profileId: crypto.randomUUID(),
                                    username: form.name || "User",
                                },
                            });
                            if (res && res[0]?.url) {
                                setForm({ ...form, profilePicture: res[0].ufsUrl });
                                setPreviewUrl(res[0].ufsUrl);
                                toast.success("Image uploaded!")
                                setErrorupload(false);
                            } else {
                                toast.error("Upload failed");
                                setErrorupload(true);
                            }
                        } catch (err) {
                            toast.error("Something went wrong during upload");
                            console.error(err);

                            setErrorupload(true);
                        } finally {
                            setUploading(false)
                            setCropDialogOpen(false);
                        }

                    }}
                />
            )}
            <Card className='shadow-lg'>
                <CardContent className="pt-6">
                    {/* Grid wrapper — responsive: 1 col mobile, 2 cols md, 3 cols lg */}
                    <FileUploadButton onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
                    <div className="grid mt-3.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* renderFields will output many inputs; they become grid children */}
                        {renderFields(role)}

                        {/* Create button — span full width of grid */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <Button onClick={handleSubmit} disabled={loading} className="w-full text-white">
                                {loading ? "Creating..." : "Create"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
