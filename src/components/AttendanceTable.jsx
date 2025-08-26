'use client'
import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { capitalizeFirstLetter } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import LoaderPage from "./loader-page";
import { ChartLine, Check, Clock, Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import { Table, TableHeader, TableRow, TableHead,} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Heatmap from "./Heatmap";
const studentData = {
    name: "Jeremy Schmidt",
    id: "BSBAD0555",
    totalHours: "12 Hours",
    attendance: ["Present", "Present", "Present"],
    units: [
        {
            title: "Unit 1 - Manage meetings",
            code: "BB5012",
            start: "01/01/2021",
            end: "04/07/2021",
            assessments: [
                {
                    title: "Assessment 1 : Presentation on Meeting",
                    dueDate: "25/01/2021",
                    status: "Satisfactory",
                    attempt: "1st Attempt",
                },
                {
                    title: "Assessment 2 : OMR Test",
                    dueDate: "25/01/2021",
                    status: "Not Yet Satisfactory",
                    attempt: "1st Attempt",
                },
                {
                    title: "Assessment 2 : OMR Test",
                    dueDate: "25/01/2021",
                    status: "Satisfactory",
                    attempt: "1st Attempt",
                },
            ],
        },
    ],
};

export default function AttendanceTable({ role, month, isMarkingMode, onSubmit, selectedDate }) {
    const { fullUser, loading } = useAuth();
    if (loading) return <LoaderPage />;
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(null);
    const [users, setUsers] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [changes, setChanges] = useState({}); // userId -> date -> status

    // const days = eachDayOfInterval({
    //     start: startOfMonth(month),
    //     end: endOfMonth(month),
    // });

    useEffect(() => {
        fetch(`/api/attendance/users/by-role?role=${role}&schoolId=${fullUser?.schoolId}`)
            .then((res) => res.json())
            .then(setUsers);

        const userIds = users.map((u) => u.userId);
        if (userIds.length > 0) {
            fetch(`/api/attendance/bulk?userIds=${userIds.join(",")}&date=${format(selectedDate, "yyyy-MM-dd")}`)
                .then(res => res.json())
                .then(setAttendances);
        }
    }, [role, month, selectedDate, users.length]);

    const getStatus = (userId, date) => {
        const isoDate = format(date, "yyyy-MM-dd");
        const changed = changes[userId]?.[isoDate];
        if (changed) return changed.toUpperCase(); // force uppercase

        const att = attendances.find(
            a => a.userId === userId && format(new Date(a.date), "yyyy-MM-dd") === isoDate
        );
        return att?.status?.toUpperCase() || "ABSENT";
    };


    const handleChange = (userId, date, value) => {
        const isoDate = format(date, "yyyy-MM-dd");
        setChanges(prev => ({
            ...prev,
            [userId]: { ...prev[userId], [isoDate]: value }
        }));
    };
    // 🚀 Expose this to parent
    const handleSubmit = async () => {
        if (Object.keys(changes).length === 0) return;

        setLoadingSubmit(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        // Notify parent
        onSubmit?.({ loading: true, error: null, success: null });

        try {
            const bulkData = [];
            for (const userId in changes) {
                for (const date in changes[userId]) {
                    bulkData.push({
                        userId,
                        date: `${date}T00:00:00Z`,
                        status: changes[userId][date],
                    });
                }
            }

            const res = await fetch("/api/attendance/bulk-mark", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bulkData),
            });

            if (!res.ok) throw new Error("Failed to update attendance");

            setSubmitSuccess("Attendances updated successfully!");
            setChanges({});

            // Refetch attendance data
            fetch(
                `/api/attendance/bulk?userIds=${users.map(u => u.userId).join(",")}&date=${format(selectedDate, "yyyy-MM-dd")}`
            )
                .then(res => res.json())
                .then(data => setAttendances(data.map(a => ({ ...a, status: a.status.toUpperCase() }))));

            // Notify parent
            onSubmit?.({ loading: false, error: null, success: "Attendances updated successfully!" });
        } catch (err) {
            const msg = err.message || "Something went wrong!";
            setSubmitError(msg);
            onSubmit?.({ loading: false, error: msg, success: null });
        } finally {
            setLoadingSubmit(false);
        }
    };
    // Whenever `changes` updates, notify parent
    useEffect(() => {
        onSubmit?.({
            hasChanges: Object.keys(changes).length > 0,
            loading: loadingSubmit,
            error: submitError,
            success: submitSuccess,
            handleSubmit,
        });
    }, [changes, loadingSubmit, submitError, submitSuccess]);
    // useEffect(() => {
    //     if (onSubmit) {
    //         onSubmit({ handleSubmit, hasChanges: Object.keys(changes).length > 0 });
    //     }
    // }, [changes]);
    // Dummy attendance data for students
    const attendanceData = [
        {
            id: 1,
            name: "Aarav Sharma",
            attendance: [
                { date: "2025-08-01", present: true },
                { date: "2025-08-02", present: false },
                { date: "2025-08-03", present: true },
                { date: "2025-08-04", present: true },
                { date: "2025-08-05", present: false },
                { date: "2025-08-06", present: true },
                { date: "2025-08-07", present: true },
            ],
        },
        {
            id: 2,
            name: "Ishita Verma",
            attendance: [
                { date: "2025-08-01", present: false },
                { date: "2025-08-02", present: true },
                { date: "2025-08-03", present: true },
                { date: "2025-08-04", present: true },
                { date: "2025-08-05", present: true },
                { date: "2025-08-06", present: false },
                { date: "2025-08-07", present: true },
            ],
        },
        {
            id: 3,
            name: "Rohan Gupta",
            attendance: [
                { date: "2025-08-01", present: true },
                { date: "2025-08-02", present: true },
                { date: "2025-08-03", present: false },
                { date: "2025-08-04", present: true },
                { date: "2025-08-05", present: true },
                { date: "2025-08-06", present: true },
                { date: "2025-08-07", present: false },
            ],
        },
    ];

    return (
        <div className="w-full overflow-x-auto rounded-lg border">
            {/* <StudentDialog open={true} setOpen={() => { }} studentData={studentData} /> */}
            <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Photo</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>{capitalizeFirstLetter(role)} Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                            <div>
                                <Button size="sm" className='text-white border-[#0064e3] rounded-lg '>
                                    <Download strokeWidth={2} />
                                </Button>
                            </div>
                        </TableHead>
                        {/* <TableHead>Attendance Trend</TableHead> */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user, index) => (
                        <TableRow key={user.userId}>
                            <TableCell className="font-semibold">{index + 1}</TableCell>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user?.user?.profilePicture} />
                                    <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-semibold">{user.admissionNo}</TableCell>
                            <TableCell className="font-semibold">{user.name}</TableCell>
                            <TableCell>

                                <AttendanceStatusToggle
                                    value={getStatus(user.userId, selectedDate)}
                                    onChange={(val) => handleChange(user.userId, selectedDate, val)}
                                />
                            </TableCell>
                            <TableCell>
                                <span className="text-muted-foreground">
                                    <ChartLine size={20} />
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}


function AttendanceStatusToggle({ value, onChange }) {
    console.log(value);

    return (
        <ToggleGroup
            type="single"
            value={value}
            onValueChange={(v) => v && onChange(v)} // prevent empty string
            className="flex gap-2"
        >
            <ToggleGroupItem
                value="PRESENT"
                className={`flex items-center transition-all cursor-pointer gap-2 px-2.5 py-1 font-semibold text-md rounded-none border 
          ${value === "PRESENT" ? "!bg-[#dcf7e9] !text-[#297457]" : "bg-muted text-muted-foreground"}`}
            >
                <Check size={18} /> Present
            </ToggleGroupItem>

            <ToggleGroupItem
                value="ABSENT"
                className={`flex items-center transition-all cursor-pointer gap-2 px-2.5 py-1 font-semibold text-md rounded-none border 
          ${value === "ABSENT" ? "!bg-[#ffe7ee] !text-[#b85f76]" : "bg-muted text-muted-foreground"}`}
            >
                <X size={18} /> Absent
            </ToggleGroupItem>

            <ToggleGroupItem
                value="LATE"
                className={`flex items-center transition-all cursor-pointer gap-2 px-2.5 py-1 font-semibold text-md rounded-none border 
          ${value === "LATE" ? "!bg-[#fcf1db] !text-[#d39e6c]" : "bg-muted text-muted-foreground"}`}
            >
                <Clock size={18} /> Late
            </ToggleGroupItem>
        </ToggleGroup>
    );
}

function StudentDialog({ open, setOpen, studentData }) {
    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogContent className="max-w-3xl rounded-2xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        <span className="font-semibold">Student Name : </span>
                        {studentData.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        ID:<span className="font-semibold">{studentData.id}</span> | Roll Number:{" "}
                        <span className="font-semibold">{studentData.totalHours}</span>
                    </p>
                </DialogHeader>

                <Tabs defaultValue="attendance" className="mt-2">
                    <TabsList>
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        <TabsTrigger value="results">Results</TabsTrigger>
                    </TabsList>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance">
                        {/* <ul className="list-disc pl-4 space-y-1 text-sm">
                            {studentData.attendance.map((a, i) => (
                                <li key={i} className="text-green-600">
                                    {a}
                                </li>
                            ))}
                        </ul> */}
                        <div className="flex flex-col gap-3.5">
                            <span className="font-semibold text-sm text-muted-foreground px-1">
                                Past 7 Day Heatmap
                            </span>
                            <Heatmap />
                        </div>
                    </TabsContent>

                    {/* Results Tab */}
                    <TabsContent value="results">
                        {/* {studentData.units.map((unit, idx) => (
              <div key={idx} className="mb-4 max-w-2xl border rounded-lg p-3">
                <h3 className="font-semibold">
                  {unit.title} ({unit.code})
                </h3>
                <p className="text-xs text-muted-foreground">
                  {unit.start} - {unit.end}
                </p>

                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unit.assessments.map((assess, aIdx) => (
                      <TableRow key={aIdx}>
                        <TableCell>{assess.title}</TableCell>
                        <TableCell>{assess.dueDate}</TableCell>
                        <TableCell>
                          <span
                            className={`${
                              assess.status === "Satisfactory"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {assess.status}
                          </span>
                        </TableCell>
                        <TableCell>{assess.attempt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))} */}
                        Nothing Here
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}