"use client"
import { useAuth } from '@/context/AuthContext';
import React, { useEffect, useRef, useState } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar"
// import { Camera, CheckCircle, MinusCircle, XCircle } from "lucide-react";
import { CheckCircle, MinusCircle, XCircle, Sun, Moon, TrendingUp, TrendingDown, Minus, Loader2, Camera, CircleUserRoundIcon, XIcon, Router, MonitorCog } from 'lucide-react';
// import {  } from "lucide-react"
// import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Bell, Check, Globe, Home, Keyboard, Link, Lock, Menu, MessageCircle,
    Paintbrush, Settings, Video
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSettingsDialog } from "@/context/Settingsdialog-context"
import { ModeToggle } from './toggle';
import { useTheme } from 'next-themes';
import { useFileUpload } from '@/lib/useFileupload';
import { Input } from './ui/input';
import axios from 'axios';
import { Fi } from 'zod/v4/locales';
import CropImageDialog from "@/app/components/CropImageDialog";
import { uploadFiles } from "@/app/components/utils/uploadThing";
import { useRouter } from 'next/navigation';
import { Calendar } from './ui/calendar';
import { ChartRadialShape } from './chart-radial';
import Heatmap from './Heatmap';
import { format, formatISO } from 'date-fns';

const data = {
    nav: [
        { name: "Profile", icon: Home },
        { name: "Attendance", icon: MonitorCog },

    ],
}

const roleMap = {
    students: "STUDENT",
    teacher: "TEACHING_STAFF",
    parents: "PARENT",
    staff: "NON_TEACHING_STAFF",
    labassistants: "NON_TEACHING_STAFF",
    librarians: "NON_TEACHING_STAFF",
    accountants: "NON_TEACHING_STAFF",
    busdrivers: "NON_TEACHING_STAFF",
    admin: "ADMIN",
};

const DynamicGoogleMap = ({ locationQuery }) => {
    const encodedQuery = encodeURIComponent(locationQuery);
    const src = `https://www.google.com/maps?q=${encodedQuery}&t=k&output=embed`;
    return (
        <div className="max-w-full rounded-full h-72 px-1 pt-2.5">
            <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                className='rounded-lg'
                referrerPolicy="no-referrer-when-downgrade"
                src={src}
            />
        </div>
    );
};

function ProfileItem({ label, value, onChange, name }) {
    return (
        <div>
            <p className="text-muted-foreground mb-2.5">{label}</p>
            <Input value={value || ''} onChange={(e) => onChange(name, e.target.value)} readOnly={!onChange} />
        </div>
    );
}
async function markAttendance(schoolId, userId, date, status) {
    try {
        const response = await fetch('/api/attendance/single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                schoolId: schoolId,
                userId: userId,
                date: date, // ISO 8601 format, e.g., "2025-08-27T00:00:00Z"
                status: status, // "PRESENT", "ABSENT", "LATE", or "HOLIDAY"
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to mark attendance');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error marking attendance:', error.message);
        throw error;
    }
}
function FileUploadAvatar({ field, onChange, resetKey, defValue }) {
    const maxSizeMB = 2
    const maxSize = maxSizeMB * 1024 * 1024 // 2MB

    const [
        { files, isDragging, errors },
        {
            handleDragEnter,
            handleDragLeave,
            handleDragOver,
            handleDrop,
            openFileDialog,
            removeFile,
            getInputProps,
            clearFiles, // ✅ this is already exposed
        },
    ] = useFileUpload({
        accept: "image/,image/png,image/jpeg,image/jpg,image/gif",
        maxSize,
    })


    const previewUrl = files[0]?.preview;

    // Send previewUrl to parent only when changed
    const previousUrlRef = useRef(null)
    useEffect(() => {
        if (onChange && previewUrl && previewUrl !== previousUrlRef.current) {
            previousUrlRef.current = previewUrl
            onChange(previewUrl)
        }
    }, [previewUrl, onChange])

    // Clear preview when resetKey changes
    useEffect(() => {
        if (clearFiles) {
            clearFiles()
            previousUrlRef.current = null // ensures onChange works again with same file
        }
    }, [resetKey])
    const fileName = files[0]?.file.name || null
    return (
        <div >
            <div className="relative">
                <div className='relative'>
                    <button
                        className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none"
                        onClick={openFileDialog}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        data-dragging={isDragging || undefined}
                        aria-label={previewUrl ? "Change image" : "Upload image"}
                    >
                        {previewUrl && previewUrl.trim() !== "" ? (
                            <img
                                className="size-full object-cover"
                                src={previewUrl}
                                alt={files[0]?.file?.name || "Uploaded image"}
                                width={64}
                                height={64}
                                style={{ objectFit: "cover" }}
                            />
                        ) : defValue && defValue.trim() !== "" ? (
                            <div className="relative w-16 h-16 group cursor-pointer">
                                <img
                                    className="size-full object-cover"
                                    src={defValue}
                                    alt={files[0]?.file?.name || "Uploaded image"}
                                    width={64}
                                    height={64}
                                    style={{ objectFit: "cover" }}
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-white text-xs font-semibold">
                                    <Camera className="mb-1" size={20} />
                                    Change Image
                                </div>
                            </div>
                        ) : (
                            <div aria-hidden="true" className="size-4 opacity-60">
                                <CircleUserRoundIcon />
                            </div>
                        )}
                    </button>
                    {previewUrl && (
                        <Button
                            onClick={() => removeFile(files[0]?.id)}
                            size="icon"
                            className="border-background focus-visible:border-background absolute top-0 -right-1 size-6 rounded-full border-2 shadow-none"
                            aria-label="Remove image"
                        >
                            <XIcon className="size-3.5 dark:text-white" />
                        </Button>
                    )}
                    <input
                        {...getInputProps()}
                        className="sr-only"
                        aria-label="Upload image file"
                        tabIndex={-1}
                    />
                </div>

            </div>

            {errors.length > 0 && (
                <div className="text-destructive flex items-center gap-1 text-xs" role="alert">
                    <AlertCircleIcon className="size-3 shrink-0" />
                    <span>{errors[0]}</span>
                </div>
            )}
        </div>
    )
}

export function SettingsDialog() {
    const { fullUser } = useAuth();
    const today = new Date();
    // Add state for selected month
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [percentageData, setPercentageData] = useState(null);
    const [markedDates, setMarkedDates] = useState({});
    const [loadingAtt, setLoadingAtt] = useState(false);
    const [selectedDate, setSelectedDate] = useState(today);

    // Function to generate month options (last 12 months)
    const getMonthOptions = () => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    };
    // Function to parse local date string (e.g., "2025-08-27")
    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day); // month is 0-based
    };

    // Function to get month in "YYYY-MM" format from a date
    const getMonthFromDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Function to get date key in "YYYY-MM-DD" format
    const getDateKey = (date) => {
        if (!date) return null;
        return date.toLocaleDateString("en-CA"); // e.g., "2025-08-27"
    };


    // Update getAttendance to fetch with month parameter
    const getAttendance = async (userId, schoolId, month) => {
        setLoadingAtt(true);
        try {
            const response = await fetch(
                `/api/attendance/getsingle?userId=${encodeURIComponent(userId)}&schoolId=${encodeURIComponent(schoolId)}&month=${encodeURIComponent(month)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch attendance');
            }

            const { attendanceRecords, percentageData } = await response.json();

            const newMarkedDates = attendanceRecords.reduce((acc, record) => {
                const dateKey = new Date(record.date).toLocaleDateString("en-CA");
                let status;
                switch (record.status) {
                    case 'PRESENT': status = 'present'; break;
                    case 'ABSENT': status = 'absent'; break;
                    case 'HOLIDAY': status = 'holiday'; break;
                    case 'LATE': status = 'leave'; break;
                    default: status = 'present';
                }
                return { ...acc, [dateKey]: status };
            }, {});

            setMarkedDates(newMarkedDates);
            setPercentageData(percentageData);
        } catch (error) {
            console.error('Error fetching attendance:', error.message);
        } finally {
            setLoadingAtt(false);
        }
    };
    // Update useEffect to include selectedMonth
    useEffect(() => {
        if (fullUser?.id && fullUser?.schoolId) {
            getAttendance(fullUser.id, fullUser.schoolId, selectedMonth);
        }
    }, [fullUser?.id, fullUser?.schoolId, selectedMonth]);

    // Update marking functions to refresh percentage data
    const markPresent = async () => {
        const dateKey = getDateKey(selectedDate);
        if (!dateKey) {
            console.error("Invalid date key");
            return;
        }
        setLoadingAtt(true);
        try {
            const normalizedDate = format(selectedDate, "yyyy-MM-dd"); // ✅YYYY-MM-DD only

            const response = await fetch("/api/attendance/single", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schoolId: fullUser?.schoolId,
                    userId: fullUser?.id,
                    date: normalizedDate,
                    status: "PRESENT",
                }),
            });


            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mark attendance");
            }

            const data = await response.json();

            setMarkedDates((prev) => ({ ...prev, [dateKey]: "present" }));
            getAttendance(fullUser.id, fullUser.schoolId, selectedMonth);
        } catch (error) {
            console.error("Error marking attendance:", error.message);
        } finally {
            setLoadingAtt(false);
        }
    };


    // Mark attendance as LEAVE
    const markLeave = async () => {
        const dateKey = getDateKey(selectedDate);
        if (!dateKey) {
            console.error('Invalid date key');
            return;
        }

        try {
            const response = await fetch('/api/attendance/single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolId: fullUser?.schoolId,
                    userId: fullUser?.id,
                    date: selectedDate.toISOString(),
                    status: 'HOLIDAY', // Using HOLIDAY for leave
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to mark attendance');
            }

            const data = await response.json();
            setMarkedDates((prev) => ({ ...prev, [dateKey]: 'leave' }));
        } catch (error) {
            console.error('Error marking attendance:', error.message);
        }
    };

    // Mark attendance as ABSENT
    const markAbsent = async () => {
        const dateKey = getDateKey(selectedDate);
        if (!dateKey) {
            console.error('Invalid date key');
            return;
        }

        try {
            const response = await fetch('/api/attendance/single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schoolId: fullUser?.schoolId,
                    userId: fullUser?.id,
                    date: selectedDate.toISOString(),
                    status: 'ABSENT',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to mark attendance');
            }

            const data = await response.json();

            setMarkedDates((prev) => ({ ...prev, [dateKey]: 'absent' }));
        } catch (error) {
            console.error('Error marking attendance:', error.message);
        }
    };

    const dateKey = getDateKey(selectedDate);
    const status = dateKey ? markedDates[dateKey] : null;
    const getStatusStyles = (status) => {
        switch (status) {
            case 'present':
                return 'border-green-500 bg-green-100 text-green-700';
            case 'leave':
                return 'border-yellow-500 bg-yellow-100 text-yellow-700';
            case 'absent':
                return 'border-red-500 bg-red-100 text-red-700';
            case 'holiday':
                return 'border-blue-500 bg-blue-100 text-blue-700';
            default:
                return 'border-gray-300 bg-gray-100 text-gray-700';
        }
    };
    const getTrendStyles = (trend) => {
        switch (trend) {
            case 'up': return 'text-green-600';
            case 'down': return 'text-red-600';
            case 'stable': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };
    // useEffect(() => {
    //     if (selectedDate) {
    //         const newMonth = getMonthFromDate(selectedDate);
    //         setSelectedMonth(newMonth);
    //     }
    // }, [selectedDate]);

    const [resetKey, setResetKey] = useState(0);

    const [
        { files, isDragging },
        {
            removeFile,
            openFileDialog,
            getInputProps,
            handleDragEnter,
            handleDragLeave,
            handleDragOver,
            handleDrop,
        },
    ] = useFileUpload({
        accept: "image/*",
    });
    const { setTheme } = useTheme();
    const { open, setOpen } = useSettingsDialog();
    const [selectedSection, setSelectedSection] = useState("Profile");
    const router = useRouter()
    const dob =
        fullUser?.role?.name === "STUDENT"
            ? fullUser?.studentdatafull?.dob
            : fullUser?.role?.name === "TEACHING_STAFF"
                ? fullUser?.teacherdata?.dob
                : fullUser?.role?.name === "ADMIN"
                    ? fullUser?.adminData?.dob
                    : null;

    const [updatedFields, setUpdatedFields] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (field, value) => {
        setUpdatedFields((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userId = fullUser?.id;
            const role = fullUser?.role?.name;

            let payload = { id: userId };

            if (role === "STUDENT") {
                payload.studentdatafull = {
                    ...(updatedFields.name && { name: updatedFields.name }),
                    ...(updatedFields.admissionNo && { admissionNo: updatedFields.admissionNo }),
                    ...(updatedFields.academicYear && { academicYear: updatedFields.academicYear }),
                    ...(updatedFields.dob && { dob: new Date(updatedFields.dob).toISOString() }),
                    ...(updatedFields.gender && { gender: updatedFields.gender.toUpperCase() }),
                    ...(updatedFields.address && { address: updatedFields.address }),
                    ...(updatedFields.FatherName && { FatherName: updatedFields.FatherName }),
                    ...(updatedFields.MotherName && { MotherName: updatedFields.MotherName }),
                    ...(updatedFields.FatherNumber && { FatherNumber: updatedFields.FatherNumber }),
                    ...(updatedFields.MotherNumber && { MotherNumber: updatedFields.MotherNumber }),
                    ...(updatedFields.GuardianName && { GuardianName: updatedFields.GuardianName }),
                    ...(updatedFields.GuardianRelation && { GuardianRelation: updatedFields.GuardianRelation }),
                    ...(updatedFields.bloodGroup && { bloodGroup: updatedFields.bloodGroup }),
                    ...(updatedFields.contactNumber && { contactNumber: updatedFields.contactNumber }),
                    ...(updatedFields.rollNumber && { rollNumber: updatedFields.rollNumber }),
                    ...(updatedFields.city && { city: updatedFields.city }),
                    ...(updatedFields.state && { state: updatedFields.state }),
                    ...(updatedFields.country && { country: updatedFields.country }),
                    ...(updatedFields.postalCode && { postalCode: updatedFields.postalCode }),
                    ...(updatedFields.DateOfLeaving && { DateOfLeaving: new Date(updatedFields.DateOfLeaving).toISOString() }),
                    ...(updatedFields.House && { House: updatedFields.House }),
                    ...(updatedFields.PreviousSchoolName && { PreviousSchoolName: updatedFields.PreviousSchoolName }),
                    ...(updatedFields.admissionDate && { admissionDate: new Date(updatedFields.admissionDate).toISOString() }),
                    ...(updatedFields.FeeStatus && { FeeStatus: updatedFields.FeeStatus }),
                    ...(updatedFields.class && {
                        classId: parseInt(updatedFields.class.split('-')[0].trim(), 10) || undefined,
                        sectionId: parseInt(updatedFields.class.split('-')[1].trim(), 10) || undefined,
                    }),
                };
                delete payload.studentdatafull.class; // Remove class string
            } else if (role === "TEACHING_STAFF") {
                payload.teacherdata = {
                    ...(updatedFields.name && { name: updatedFields.name }),
                    ...(updatedFields.email && { email: updatedFields.email }),
                    ...(updatedFields.department && { designation: updatedFields.department }),
                    ...(updatedFields.qualification && { qualification: updatedFields.qualification }),
                    ...(updatedFields.experience && { experience: updatedFields.experience }),
                    ...(updatedFields.gender && { gender: updatedFields.gender }),
                    ...(updatedFields.contactNumber && { contactNumber: updatedFields.contactNumber }),
                    ...(updatedFields.address && { address: updatedFields.address }),
                    ...(updatedFields.dob && { dob: new Date(updatedFields.dob).toISOString() }),
                };
            } else if (role === "NON_TEACHING_STAFF") {
                payload.nonTeachingStaff = {
                    ...(updatedFields.name && { name: updatedFields.name }),
                    ...(updatedFields.email && { email: updatedFields.email }),
                    ...(updatedFields.department && { designation: updatedFields.department }),
                    ...(updatedFields.qualification && { qualification: updatedFields.qualification }),
                    ...(updatedFields.experience && { experience: updatedFields.experience }),
                    ...(updatedFields.gender && { gender: updatedFields.gender }),
                    ...(updatedFields.contactNumber && { contactNumber: updatedFields.contactNumber }),
                    ...(updatedFields.address && { address: updatedFields.address }),
                    ...(updatedFields.dob && { dob: new Date(updatedFields.dob).toISOString() }),
                };
            } else if (role === "PARENT") {
                payload = {
                    ...payload,
                    ...(updatedFields.name && { guardianName: updatedFields.name }),
                    ...(updatedFields.childId && { childId: updatedFields.childId }),
                };
            } else if (role === "ADMIN") {
                payload.adminData = {
                    ...(updatedFields.name && { name: updatedFields.name }),
                    ...(updatedFields.email && { email: updatedFields.email }),
                    ...(updatedFields.school && { schoolId: fullUser?.school?.id }), // Use existing schoolId
                    ...(updatedFields.domain && { domain: updatedFields.domain }),
                    ...(updatedFields.Language && { Language: updatedFields.Language }),
                };
            } else if (role === "SUPER_ADMIN") {
                payload = {
                    ...payload,
                    ...(updatedFields.name && { name: updatedFields.name }),
                    ...(updatedFields.email && { email: updatedFields.email }),
                };
            }

            // Include profile picture if uploaded
            if (previewUrl) {
                payload.profilePicture = previewUrl;
            }

            const response = await axios.patch(`/api/users/${userId}`, payload);
            if (response.data.success) {
                toast.success(`Profile updated successfully!`)
                // setCropDialogOpen(false);
                setUpdatedFields({});
                localStorage.removeItem("user");
                // router.refresh()
                window.location.reload();
            } else {
                toast.error(`Failed to update profile ${response.data.error}`)
                throw new Error(response.data.error || "Failed to update profile");
            }
        } catch (error) {
            // setCropDialogOpen(false);
            console.error("Error updating profile:", error);
            toast.error(`Error updating profile! ${error.message || "Please try again."}`)
            // alert(`Failed to update profile: ${error.message || "Please try again."}`);
        } finally {
            setIsSaving(false);
            setCropDialogOpen(false);
        }
    };
    const handleMonthChange = (newMonth) => {
        const newSelectedMonth = getMonthFromDate(newMonth);
        setSelectedMonth(newSelectedMonth);
    };

    const renderContent = () => {
        let profileFields = null;
        switch (fullUser?.role?.name) {
            case "STUDENT":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem
                            label="Admission No"
                            value={updatedFields.admissionNo || fullUser?.studentdatafull?.admissionNo}
                            name="admissionNo"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Class"
                            value={updatedFields.class || `${fullUser?.classs?.className || "-"} - ${fullUser?.section?.name || "-"}`}
                            name="class"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Email"
                            value={updatedFields.email || fullUser?.email}
                            name="email"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Blood Group"
                            value={updatedFields.bloodGroup || fullUser?.studentdatafull?.bloodGroup}
                            name="bloodGroup"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Gender"
                            value={updatedFields.gender || fullUser?.studentdatafull?.gender}
                            name="gender"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Admission Date"
                            value={updatedFields.admissionDate || (fullUser?.studentdatafull?.admissionDate ? new Date(fullUser?.studentdatafull?.admissionDate).toLocaleDateString() : '')}
                            name="admissionDate"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Roll Number"
                            value={updatedFields.rollNumber || fullUser?.studentdatafull?.rollNumber}
                            name="rollNumber"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Fee Status"
                            value={updatedFields.FeeStatus || fullUser?.studentdatafull?.FeeStatus}
                            name="FeeStatus"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Father Name"
                            value={updatedFields.FatherName || fullUser?.studentdatafull?.FatherName}
                            name="FatherName"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Father Number"
                            value={updatedFields.FatherNumber || fullUser?.studentdatafull?.FatherNumber}
                            name="FatherNumber"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Mother Name"
                            value={updatedFields.MotherName || fullUser?.studentdatafull?.MotherName}
                            name="MotherName"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Mother Number"
                            value={updatedFields.MotherNumber || fullUser?.studentdatafull?.MotherNumber}
                            name="MotherNumber"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Contact Number"
                            value={updatedFields.contactNumber || fullUser?.studentdatafull?.contactNumber}
                            name="contactNumber"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="House"
                            value={updatedFields.House || fullUser?.studentdatafull?.House}
                            name="House"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="City"
                            value={updatedFields.city || fullUser?.studentdatafull?.city}
                            name="city"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="State"
                            value={updatedFields.state || fullUser?.studentdatafull?.state}
                            name="state"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Country"
                            value={updatedFields.country || fullUser?.studentdatafull?.country}
                            name="country"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Postal Code"
                            value={updatedFields.postalCode || fullUser?.studentdatafull?.postalCode}
                            name="postalCode"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Address"
                            value={updatedFields.Address || fullUser?.studentdatafull?.Address}
                            name="Address"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Status"
                            value={updatedFields.Status || fullUser?.studentdatafull?.Status}
                            name="Status"
                            onChange={handleInputChange}
                        />
                    </div>
                );
                break;

            case "TEACHING_STAFF":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem
                            label="Name"
                            value={updatedFields.name || fullUser?.name}
                            name="name"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Email"
                            value={updatedFields.email || fullUser?.email}
                            name="email"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Designation"
                            value={updatedFields.department || fullUser?.teacherdata?.designation}
                            name="department"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Qualification"
                            value={updatedFields.qualification || fullUser?.teacherdata?.qualification}
                            name="qualification"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Experience"
                            value={updatedFields.experience || fullUser?.teacherdata?.experience}
                            name="experience"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Gender"
                            value={updatedFields.gender || fullUser?.teacherdata?.gender}
                            name="gender"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Contact Number"
                            value={updatedFields.contactNumber || fullUser?.teacherdata?.contactNumber}
                            name="contactNumber"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Address"
                            value={updatedFields.address || fullUser?.teacherdata?.address}
                            name="address"
                            onChange={handleInputChange}
                        />
                    </div>
                );
                break;

            case "ADMIN":
                profileFields = (
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <ProfileItem
                                label="Name"
                                value={updatedFields.name || fullUser?.name}
                                name="name"
                                onChange={handleInputChange}
                            />
                            <ProfileItem
                                label="User Id"
                                value={updatedFields.id || fullUser?.id}
                                name="id"
                            />
                            <ProfileItem
                                label="Email"
                                value={updatedFields.email || fullUser?.email}
                                name="email"
                                onChange={handleInputChange}
                            />
                            {/* <ProfileItem
                                label="Role"
                                value={updatedFields.role || fullUser?.role?.name}
                                name="role"
                            /> */}
                            <ProfileItem
                                label="School"
                                value={updatedFields.school || fullUser?.school?.name}
                                name="school"
                                onChange={handleInputChange}
                            />
                            <ProfileItem
                                label="School Domain"
                                value={updatedFields.domain || fullUser?.school?.domain}
                                name="domain"
                            />
                        </div>
                    </div>
                );
                break;

            case "SUPER_ADMIN":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem
                            label="Name"
                            value={updatedFields.name || fullUser?.name}
                            name="name"
                            onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Email"
                            value={updatedFields.email || fullUser?.email}
                            name="email"
                        // onChange={handleInputChange}
                        />
                        <ProfileItem
                            label="Role"
                            value={updatedFields.role || fullUser?.role?.name}
                            name="role"
                        // onChange={handleInputChange}
                        />
                    </div>
                );
                break;

            default:
                console.warn("Unknown role:", fullUser?.role?.name);
                profileFields = <p className="text-muted-foreground">No profile information available for this role.</p>;
        }
        if (selectedSection === "Profile") {
            return (
                <div className={`space-y-4 ${isSaving ? 'opacity-50 blur-sm' : ''}`}>
                    <div className="flex items-center gap-4">
                        <FileUploadAvatar defValue={fullUser?.profilePicture} onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
                        <div>
                            <h2 className="text-xl font-semibold">{fullUser?.name}</h2>
                            <span className="text-sm font-regular">{fullUser?.role?.name}</span>
                            {/* value={updatedFields.role || fullUser?.role?.name} */}
                            <p>DOB: {dob ? new Date(dob).toLocaleDateString() : "Please Add DOB"}</p>
                        </div>
                    </div>
                    {profileFields}
                    {Object.keys(updatedFields).length > 0 && (
                        <Button
                            onClick={handleSave}
                            className="mt-4 dark:text-white w-full"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </div>
            )
        } else if (selectedSection === "Attendance") {
            return (
                loadingAtt ? (
                    <div className='h-full transition-all w-full flex items-center justify-center'>
                        <Loader2 className='animate-spin' size={40} />
                        {/* <span className=''>Marking....</span> */}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Section 1: Status + Actions */}
                        < div className="space-y-3" >
                            <div
                                className={` flex justify-center  items-center  py-4 border rounded-lg ${getStatusStyles(status)}`}
                            >
                                {/* <span className="text-sm font-medium">
                                {status === "present"
                                    ? "✅ Present"
                                    : status === "leave"
                                        ? "🟡 Leave"
                                        : status === "absent"
                                            ? "❌ Absent"
                                            : "Not Marked"}{" "}
                                {dateKey ? `on ${selectedDate?.toLocaleDateString()}` : ""}
                            </span> */}
                                <span
                                    className='inline-flex text-sm font-medium justify-center items-center gap-2'
                                >
                                    {status === 'present' && <CheckCircle size={16} />}
                                    {status === 'leave' && <MinusCircle size={16} />}
                                    {status === 'absent' && <XCircle size={16} />}
                                    {status === 'holiday' && <Sun size={16} />}
                                    {status === 'present'
                                        ? 'Present'
                                        : status === 'leave'
                                            ? 'Leave'
                                            : status === 'absent'
                                                ? 'Absent'
                                                : status === 'holiday'
                                                    ? 'Holiday'
                                                    : 'Not Marked'}
                                    {dateKey && ` on ${selectedDate.toLocaleDateString()}`}
                                </span>
                            </div>

                            <div className="flex flex-row gap-2">
                                <Button
                                    size="sm"
                                    className="text-white flex-1"
                                    onClick={markPresent}
                                    disabled={!selectedDate}
                                >
                                    Mark Present
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-yellow-50 flex-1"
                                    variant="outline"
                                    disabled={!selectedDate}
                                >
                                    Request Leave
                                </Button>
                            </div>

                        </div >



                        {/* Section 3: Calendar */}
                        < div className="grid grid-row-2 gap-1" >


                            <div>

                                <div className="bg-muted rounded-lg mb-3.5 pb-3.5">
                                    <ChartRadialShape value={percentageData?.percentage} />
                                    <div className='flex flex-col items-center justify-center'>
                                        <span className="text-xs text-gray-500">
                                            Total Present Percentage Of Week
                                        </span>
                                        {percentageData ? (
                                            <>
                                                {percentageData.trend === 'up' && <TrendingUp size={16} className={getTrendStyles('up')} />}
                                                {percentageData.trend === 'down' && <TrendingDown size={16} className={getTrendStyles('down')} />}
                                                {percentageData.trend === 'stable' && <Minus size={16} className={getTrendStyles('stable')} />}
                                                {percentageData.trend === 'no-data' && <Minus size={16} className={getTrendStyles('no-data')} />}
                                            </>
                                        ) : null}
                                        <span className="text-xs text-gray-500">
                                            {percentageData?.presentDays} of {percentageData?.daysInMonth} days present
                                        </span>
                                    </div>
                                </div>
                                {/* <Heatmap /> */}
                            </div>
                            <div className='bg-muted flex items-center justify-center rounded-lg'>
                                {/* <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                modifiers={{
                                    present: Object.keys(markedDates)
                                        .filter((d) => markedDates[d] === "present")
                                        .map((d) => new Date(d)),
                                    leave: Object.keys(markedDates)
                                        .filter((d) => markedDates[d] === "leave")
                                        .map((d) => new Date(d)),
                                    absent: Object.keys(markedDates)
                                        .filter((d) => markedDates[d] === "absent")
                                        .map((d) => new Date(d)),
                                }}
                                modifiersClassNames={{
                                    present: "bg-green-500 text-white",
                                    leave: "bg-yellow-500 text-white",
                                    absent: "bg-red-500 text-white",
                                }}
                                className='bg-transparent'
                            /> */}
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    month={selectedMonth}
                                    onMonthChange={handleMonthChange}
                                    modifiers={{
                                        present: Object.keys(markedDates)
                                            .filter((d) => markedDates[d] === "present")
                                            .map((d) => parseLocalDate(d)),
                                        leave: Object.keys(markedDates)
                                            .filter((d) => markedDates[d] === "leave")
                                            .map((d) => parseLocalDate(d)),
                                        absent: Object.keys(markedDates)
                                            .filter((d) => markedDates[d] === "absent")
                                            .map((d) => parseLocalDate(d)),
                                    }}
                                    // modifiersClassNames={{
                                    //     present: " text-white",
                                    //     leave: "text-white",
                                    //     absent: "text-white",
                                    // }}
                                    className='bg-transparent w-full'
                                />
                            </div>
                        </div >
                        {/* Section 2: Attendance Chart */}
                        {/* <div className="flex justify-center"> */}

                        {/* </div> */}
                    </div >
                )
            );

        }
        if (selectedSection === "Appearance") {
            return (
                <div className="space-y-6 p-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
                        <p className="text-muted-foreground">Customize the look and feel of your profile and app theme.</p>
                    </div>
                    <div className="space-y-2 p-6 rounded-xl border max-w-2xl">
                        <label className="text-sm font-medium">Theme</label>
                        <p className="text-sm text-muted-foreground mb-2">
                            Choose between light and dark mode.
                        </p>
                        <div className='flex items-center justify-center'>
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Button variant="outline" size="icon">
                                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                                        <span className="sr-only">Toggle theme</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTheme("light")}>
                                        Light
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                                        Dark
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")}>
                                        System
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            )
        }
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">{selectedSection}</h2>
                <p className="text-muted-foreground text-sm">
                    Customize your {selectedSection.toLowerCase()} settings here.
                </p>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-muted/50 aspect-video max-w-3xl rounded-xl"
                    />
                ))}
            </div>
        )
    }
    const [previewUrl, setPreviewUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [errorUpload, setErrorupload] = useState(false);

    const [rawImage, setRawImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const handleImageUpload = (previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setRawImage(previewUrl);
        handleInputChange('profilePicture', previewUrl);
        setCropDialogOpen(true);
    }
    return (
        <>
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
                                    username: fullUser?.name || "User",
                                },
                            });
                            if (res && res[0]?.url) {
                                // setForm({ ...form, profilePicture: res[0].ufsUrl });
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[850px]">
                    <DialogTitle className="sr-only">Settings</DialogTitle>
                    <DialogDescription className="sr-only">
                        Customize your settings here.
                    </DialogDescription>
                    <SidebarProvider className="items-start">
                        <Sidebar collapsible="none" className="hidden md:flex">
                            <SidebarContent>
                                <SidebarGroup className='bg-[#f4f4f5] dark:bg-[#27272a] h-full'>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {data.nav.map((item) => (
                                                <SidebarMenuItem key={item.name}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        variant={'default'}
                                                        className={`w-full font-semibold hover:cursor-pointer ${selectedSection === item.name ? "bg-white hover:bg-white font-semibold text-black shadow-md" : ""}`}
                                                    >
                                                        <button onClick={() => setSelectedSection(item.name)} className="w-full text-left flex items-center gap-2">
                                                            <item.icon className="w-4 h-4" />
                                                            <span>{item.name}</span>
                                                        </button>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </SidebarContent>
                        </Sidebar>
                        <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
                            <header className="flex h-16 shrink-0 items-center gap-2 px-4">
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        {/* <BreadcrumbItem className="hidden md:block">
                                            <BreadcrumbLink href="#">Account</BreadcrumbLink>
                                        </BreadcrumbItem> */}
                                        {/* <BreadcrumbSeparator className="hidden md:block" /> */}
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>{selectedSection}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </header>
                            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
                                {renderContent()}
                            </div>
                        </main>
                        {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                                <Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" />
                            </div>
                        )}
                    </SidebarProvider>
                </DialogContent>
            </Dialog>
        </>
    )
}