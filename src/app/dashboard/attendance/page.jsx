'use client'
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import AttendanceTable from "@/components/AttendanceTable";
import { parse, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// import { useSession } from "next-auth/react";
const ProfileCard = ({ name, value, }) => {
    return (
        <div className="w-full border py-1 my-2.5  px-2.5">
            <div>
                <span className="font-semibold ">{name}</span>
            </div>
            <div>
                <span className="text-gray-500">{value}</span>
            </div>
        </div>
    )
}

export default function AttendancePage() {
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    const [month, setMonth] = useState(new Date()); // Default current month
    const [date, setDate] = useState(new Date()); // Default current date
    const [mode, setMode] = useState("mark"); // "mark" | "view"
    const fullUser = useAuth()

    const schoolId = fullUser.schoolId;
    const classId = ''
    const [submitState, setSubmitState] = useState({
        hasChanges: false,
        loading: false,
        error: null,
        success: null,
        handleSubmit: null,
    });
    useEffect(() => {
        fetch(
            `/api/attendance/summary?date=${format(date, "yyyy-MM-dd")}&schoolId=${schoolId}&classId=${classId}`
        )
            .then(res => res.json())
            .then(setAttendanceSummary)
            .catch(console.error);
    }, [date, schoolId, classId]);
    // Whenever error or success updates, show a toast
    useEffect(() => {
        if (submitState.error) {
            toast.error(submitState.error); // red toast
        }
        if (submitState.success) {
            toast.success(submitState.success); // green toast
        }
    }, [submitState.error, submitState.success]);

    useEffect(() => {
        fetch(`/api/attendance/summary?date=${format(date, "yyyy-MM-dd")}`)
            .then(res => res.json())
            .then(setAttendanceSummary)
            .catch(console.error);
    }, [date]);


    // if (!session || session.user.role.name !== "ADMIN") return <p>Unauthorized</p>;

    const handleMonthChange = (e) => {
        const [year, monthStr] = e.target.value.split("-");
        setMonth(new Date(parseInt(year), parseInt(monthStr) - 1, 1));
    };

    return (
        <div className="flex flex-row gap-3 px-6 py-3 overflow-hidden w-full">

            <div>
                {/* <Input
                    type="month"
                    onChange={handleMonthChange}
                    defaultValue={format(month, "yyyy-MM")}
                /> */}
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-none "
                    captionLayout="dropdown"
                />
                <div className="flex gap-4 my-3">
                    {Array.isArray(attendanceSummary) && attendanceSummary.length > 0 ? (
                        attendanceSummary.map((role) => (
                            <div key={role.role} className="border p-2 rounded">
                                <p className="font-semibold">{role.role}</p>
                                <p>Total: {role.total}</p>
                                <p>Present: {role.present}</p>
                                <p>Absent: {role.absent}</p>
                                <p>Late: {role.late}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">No attendance data available for this date.</p>
                    )}
                </div>
                <div>
                    <ProfileCard name="School" value="DAV Public School" />
                    <ProfileCard name="Session" value="2025" />
                    {/* <ProfileCard name="Class" value="10'A" /> */}
                </div>
                {/* <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="mark">Marking Mode</option>
                    <option value="view">View Mode</option>
                </select> */}
            </div>
            <div className="mt-2  w-[-webkit-fill-available]">

                <div className="flex-1 flex flex-col w-[-webkit-fill-available]">
                    <Tabs defaultValue="STUDENT" className="flex-1 flex flex-col">
                        <TabsList className="w-full flex flex-wrap">
                            <TabsTrigger value="STUDENT">Students</TabsTrigger>
                            <TabsTrigger value="TEACHER">Teaching Staff</TabsTrigger>
                            <TabsTrigger value="STAFF">Non-Teaching Staff</TabsTrigger>
                        </TabsList>
                        <div className="w-full rounded-md border grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.5fr] divide-x">
                            <div className="py-2 px-3">
                                <div>
                                    <span className="font-semibold">Class Id:</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">hi</span>
                                </div>
                            </div>

                            <div className="py-2 px-3">
                                <div>
                                    <span className="font-semibold">Section:</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">A</span>
                                </div>
                            </div>

                            <div className="py-2  px-3 flex flex-row items-center justify-between">
                                <div>
                                    <span className="font-semibold">Pending</span>
                                </div>
                                <div>
                                    {/* // Example: Using the state elsewhere */}
                                    <Button
                                        className='text-white'
                                        onClick={() => submitState.handleSubmit?.()}
                                        disabled={!submitState.hasChanges || submitState.loading}
                                    >
                                        {submitState.loading ? "Submitting..." : "Submit Attendance"}
                                    </Button>

                                    {/* {submitState.error && <p className="text-red-500">{submitState.error}</p>}
                                    {submitState.success && <p className="text-green-500">{submitState.success}</p>} */}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto w-[-webkit-fill-available]">

                            <TabsContent value="STUDENT" >
                                <AttendanceTable
                                    role="STUDENT"
                                    month={month}
                                    selectedDate={date}
                                    isMarkingMode={mode === "mark"}
                                    onSubmit={setSubmitState}
                                />
                            </TabsContent>
                            <TabsContent value="TEACHER" >
                                <AttendanceTable
                                    role="TEACHER"
                                    month={month}
                                    selectedDate={date}
                                    isMarkingMode={mode === "mark"}
                                    onSubmit={setSubmitState}
                                />
                            </TabsContent>
                            <TabsContent value="STAFF" >
                                <AttendanceTable
                                    role="STAFF"
                                    month={month}
                                    selectedDate={date}
                                    isMarkingMode={mode === "mark"}
                                    onSubmit={setSubmitState}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>

                </div>
            </div>
            {/* <div>
                <Button
                    // onClick={submitState.handleSubmit}
                    // className="rounded-full"
                    // disabled={!submitState?.hasChanges}
                >
                  Download Exl.
                </Button>
            </div> */}
        </div>
    );
}
