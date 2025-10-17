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
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter, DialogClose, DialogHeader } from "@/components/ui/dialog"
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
  Bell, Check, Globe, Home, Keyboard, Lock, Menu, MessageCircle,
  Paintbrush, Settings, Video
} from "lucide-react"
import Link from 'next/link';
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
import { useId } from "react";
import { CheckIcon, ImagePlusIcon } from "lucide-react"

import { useCharacterLimit } from "@/hooks/use-character-limit"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
    <div className="*:not-first:mt-2">
      <Label>{label}</Label>
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
    <div className="-mt-10 px-6 flex items-center justify-center ">
      <div className="bg-muted relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 shadow-xs shadow-black/10">
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
                    <Camera className="mb-1" size={40} strokeWidth={0.9} />
                    {/* Change Image */}
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
    </div>
  )
}

export function Profile() {
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
      default: return 'border-gray-300 bg-gray-100 text-gray-700';
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
              <ProfileItem
                label="School Code"
                value={fullUser?.school?.schoolCode}
                name="code"
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
    return (
      <div className={`space-y-4 ${isSaving ? 'opacity-50 blur-sm' : ''}`}>
        {profileFields}
      </div>
    )
  }

  // Function to check if there are actual changes compared to the original data
  const hasChanges = () => {
    if (!fullUser) return false;

    // Get the reference original data based on role
    let originalData = {};
    switch (fullUser.role?.name) {
      case "STUDENT":
        originalData = { ...fullUser.studentdatafull, admissionNo: fullUser?.admissionNo, class: fullUser?.classs?.className, ...fullUser?.section }; // add any top-level fields you need
        break;
      case "TEACHING_STAFF":
        originalData = { ...fullUser.teacherdata, name: fullUser?.name, email: fullUser?.email };
        break;
      case "ADMIN":
        originalData = { ...fullUser.school, name: fullUser?.name, email: fullUser?.email, id: fullUser?.id, domain: fullUser?.school?.domain };
        break;
      case "SUPER_ADMIN":
        originalData = { name: fullUser?.name, email: fullUser?.email, role: fullUser?.role?.name };
        break;
      default:
        originalData = {};
    }

    // Check if any key in updatedFields differs from originalData
    return Object.keys(updatedFields).some((key) => updatedFields[key] !== (originalData[key] ?? ""));
  };


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
                  profileId: fullUser?.id || "no profile id",
                  username: fullUser?.name || "User",
                  schoolId: fullUser?.schoolId || null,
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
        <DialogContent className="flex flex-col  max-h-[500px]  gap-0 overflow-y-visible p-0 sm:max-w-lg [&>button:last-child]:top-3.5">
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="border-b px-6 py-4 text-base">
              Edit profile
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Make changes to your profile here. You can change your photo and set a
            username.
          </DialogDescription>
          <div className="overflow-y-scroll ">
            <ProfileBg />
            <FileUploadAvatar defValue={fullUser?.profilePicture} onChange={(previewUrl) => handleImageUpload(previewUrl)} resetKey={resetKey} />
            <div className="px-6 pt-4 pb-6">
              <form className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1 space-y-2">
                    {renderContent()}

                  </div>
                </div>
              </form>
            </div>
          </div>
          <DialogFooter className="w-full border-t px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 items-center">
            {/* Left side: Change Password */}
            <Link href="../auth/ChangePassword">
              <Button variant="outline" className="w-full text-center ">
                Change Your Password
              </Button>
            </Link>

            {/* Spacer for desktop alignment */}
            {/* <div className="hidden md:block"></div> */}

            {/* Right side: Cancel + Save */}
            <div className="flex flex-col lg:flex-row gap-2.5 w-full md:justify-end">
              {/* <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full lg:w-fit">
                  Cancel
                </Button>
              </DialogClose> */}

              <DialogClose asChild>
                {/* {Object.keys(updatedFields).length > 0 && (
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="w-full lg:w-fit"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                )} */}
                <Button
                  type="button"
                  onClick={handleSave}
                  className="w-full transition-all"
                  disabled={isSaving || !hasChanges()} // disabled if saving or no changes
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>

              </DialogClose>
            </div>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  )
}

const initialBgImage = [
  {
    name: "profile-bg.jpg",
    size: 1528737,
    type: "image/jpeg",
    url: "https://plus.unsplash.com/premium_photo-1673240367277-e1d394465b56?q=80&w=869&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    id: "profile-bg-123456789",
  },
]
function ProfileBg() {
  const [{ files }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      accept: "image/*",
      initialFiles: initialBgImage,
    })

  const currentImage = files[0]?.preview || null

  return (
    <div className="h-32">
      <div className="bg-muted relative flex size-full items-center justify-center overflow-hidden">
        {currentImage && (
          <img
            className="size-full object-cover"
            src={currentImage}
            alt={
              files[0]?.preview
                ? "Preview of uploaded image"
                : "Default profile background"
            }
            width={512}
            height={96}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {/* <button
            type="button"
            className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
            onClick={openFileDialog}
            aria-label={currentImage ? "Change image" : "Upload image"}
          >
            <ImagePlusIcon size={16} aria-hidden="true" />
          </button> */}
          {/* {currentImage && (
            <button
              type="button"
              className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
              onClick={() => removeFile(files[0]?.id)}
              aria-label="Remove image"
            >
              <XIcon size={16} aria-hidden="true" />
            </button>
          )} */}
        </div>
      </div>
      <input
        {...getInputProps()}
        className="sr-only"
        aria-label="Upload image file"
      />
    </div>
  )
}
