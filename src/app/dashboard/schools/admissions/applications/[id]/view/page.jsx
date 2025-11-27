
'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, CalendarCheck, CheckCircle2Icon, Copy, Loader2, Mail, Phone, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { defineStepper } from "@/components/stepper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoaderPage from "@/components/loader-page";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogClose,
    DialogDescription,
} from "@/components/ui/dialog"
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
async function fetchApplication({ applicationId, schoolId }) {
    const response = await fetch(`/api/schools/admissions/applications/${applicationId}?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch application");
    return response.json();
}

async function fetchStages(schoolId) {
    const response = await fetch(`/api/schools/admissions/settings?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch stages");
    return response.json();
}

async function moveApplication({ id, stageId, movedById, stageData }) {
    const response = await fetch(`/api/schools/admissions/applications/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, movedById, stageData }),
    });
    if (!response.ok) throw new Error("Failed to move application");
    return response.json();
}

// Outside the component
let cachedStepper = null;
let cachedStagesLength = 0;

// Debounce helper to limit API calls
function useDebounce(value, delay = 400) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debounced
}

export function LocationInput({ stageData, handleStageDataChange, queryClient }) {
    const [query, setQuery] = useState("")

    const debouncedQuery = useDebounce(query, 400)
    //   const queryClient = useQueryClient()

    // Fetch suggestions using Nominatim API
    const { data: suggestions = [], isFetching } = useQuery({
        queryKey: ["location-suggestions-india", debouncedQuery],
        queryFn: async ({ signal }) => {
            if (!debouncedQuery || debouncedQuery.length < 2) return []
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&q=${encodeURIComponent(
                    debouncedQuery
                )}&limit=6`,
                { signal }
            )
            return res.json()
        },
        enabled: !!debouncedQuery,
        staleTime: 1000 * 60 * 10, // cache for 10 min
        gcTime: 1000 * 60 * 30, // garbage collect after 30 min
        retry: 1,
    })

    // Prefetch for next possible input (improves UX)
    useEffect(() => {
        if (debouncedQuery && debouncedQuery.length > 2) {
            queryClient.prefetchQuery({
                queryKey: ["location-suggestions-india", debouncedQuery + " "],
                queryFn: async () =>
                    fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&q=${encodeURIComponent(
                            debouncedQuery + " "
                        )}&limit=6`
                    ).then((r) => r.json()),
            })
        }
    }, [debouncedQuery, queryClient])

    return (
        <div className="relative">
            <Label className="mb-3">Venue / Location</Label>
            <Input
                placeholder="Enter test venue or location"
                className="bg-background"
                value={stageData.testVenue || ""}
                onChange={(e) => {
                    const val = e.target.value
                    setQuery(val)
                    handleStageDataChange("testVenue", val)
                }}
            />

            {/* Suggestion dropdown */}
            {debouncedQuery && suggestions.length > 0 && (
                <div className="absolute  mt-3 z-40 w-full rounded-md  bg-white dark:bg-muted border shadow-md max-h-[240px] overflow-y-auto">
                    {suggestions.map((item) => (
                        <div
                            key={item.place_id}
                            onClick={() => {
                                handleStageDataChange("testVenue", item.display_name)
                                setQuery("")
                            }}
                            className="cursor-pointer border-t border-b px-3 py-2 hover:bg-muted"
                        >
                            {item.display_name}
                        </div>
                    ))}
                </div>
            )}

            {/* Fetching indicator */}
            {isFetching && (
                <div className="absolute mt-2 z-40 text-sm py-2 w-full  inline-flex border rounded-md px-3 shadow-lg bg-white dark:bg-muted text-muted-foreground ">

                    <span className="animate-pulse">
                        Fetching location suggestions....
                    </span>
                </div>
            )}
        </div>
    )
}
export default function ApplicationDetails() {
    const params = useParams();

    const stepperMethodsRef = useRef(null);
    const [activeStep, setActiveStep] = useState(null);
    const applicationId = params.id;
    const local = localStorage.getItem('user');
    const fullUser = JSON.parse(local);

    const [assignedRollNumbers, setAssignedRollNumbers] = useState([]);
    const [rollNumberWarning, setRollNumberWarning] = useState("");



    const [scopen, setScopen] = useState(false);

    const schoolId = fullUser?.schoolId;

    const movedById = fullUser?.id;
    const { mutate: updateTestResult, isPending: isLoadingtestRes } = useUpdateTestResult();
    const { data: { application } = {}, isLoading: appLoading } = useQuery({
        queryKey: ["application", applicationId, schoolId],
        queryFn: () => fetchApplication({ applicationId, schoolId }),
        enabled: !!schoolId && !!applicationId,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
    });
    const fetchClasses = async (schoolId) => {
        if (!schoolId) throw new Error("schoolId is required")
        const res = await fetch(`/api/schools/${schoolId}/classes`)
        if (!res.ok) throw new Error("Failed to fetch classes")
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error("Invalid data format")
        return data
    }
    // TanStack Query hook for fetching classes
    const { data: classes = [], isLoading: loadingClasses, error } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: () => fetchClasses(schoolId),
        enabled: !!schoolId, // Only fetch when schoolId is available
        retry: 1,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })
    // Handle fetch error with toast
    if (error) {
        toast.error("Failed to load classes")
        console.error("[CLASS_FETCH_ERROR]", error)
    }

    // Function to convert class names to display format (e.g., 1 to I, Nursery to Nursery)
    const displayClassName = (name) => {
        const num = parseInt(name, 10)
        if (isNaN(num)) {
            return name
        } else {
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
            return romanNumerals[num - 1] || name
        }
    }
    function useUpdateTestResult() {
        const queryClient = useQueryClient();

        return useMutation({
            mutationFn: async (payload) => {
                const res = await fetch("/api/schools/admissions/applications/stage/schedule", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update test result");
                return data;
            },
            onSuccess: (data, variables) => {
                toast.success("Test result saved!");
                // Refetch the application test details
                queryClient.invalidateQueries(["applicationTest", applicationId]);

                setStageData((prev) => ({
                    ...prev,
                    testScore: data.updated.testScore,
                    testResult:
                        data.updated.testPassed === true
                            ? "pass"
                            : data.updated.testPassed === false
                                ? "fail"
                                : "",
                    notes: data.updated.notes,
                }));
            },
            onError: (err) => {
                toast.error(err.message);
            },
        });
    }
    function useScheduleTest() {
        return useMutation({
            mutationFn: async (payload) => {
                const res = await fetch("/api/schools/admissions/applications/stage/schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to schedule test");
                return data;
            },
            onSuccess: () => {
                toast.success("Test scheduled successfully!");
                // Refetch the test details for this application
                queryClient.invalidateQueries(["applicationTest", applicationId]);

                setScopen(false);
                setStageData({}); // Reset stage data after scheduling
            },
            onError: (err) => {
                toast.error(err.message);
            },
        });
    }
    function useApplicationTest(applicationId) {
        return useQuery({
            queryKey: ["applicationTest", applicationId],
            queryFn: async () => {
                const res = await fetch(`/api/schools/admissions/applications/stage/schedule?applicationId=${applicationId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch test");
                return data.schedule;
            },
            enabled: !!applicationId, // only run when ID is available
        });
    }

    // function useApplicationTestScore(applicationId, stageid) {
    //     console.log("🎯 Hook mounted with ID:", stageid);

    //     return useQuery({
    //         queryKey: ["applicationTest", applicationId],
    //         queryFn: async () => {
    //             console.log("🚀 QueryFn triggered!");
    //             const url = `/api/schools/admissions/applications/stage/stageHistory?applicationId=ab11bcd5-4022-4fef-92a4-256e59a0e048&stageId=50efcbd6-8c84-4e10-a982-26babc696a10`;
    //             console.log("➡️ Fetching:", url);

    //             const res = await fetch(url, { credentials: "include" });
    //             console.log("📥 Response status:", res.status);

    //             const data = await res.json();
    //             console.log("📦 Data received:", data);

    //             if (!res.ok) throw new Error(data.error || "Failed to fetch test");
    //             return data.test;
    //         },
    //         onSuccess: (data) => {
    //             console.log("✅ Query success:", data);
    //         },
    //         onError: (err) => {
    //             console.error("❌ Query failed:", err);
    //         },
    //         enabled: !!applicationId,
    //     });
    // }

    const { data: test, isPending: isLoadingtest } = useApplicationTest(applicationId);

    useEffect(() => {
        if (test) {
            const formattedDate = test.testDate ? test.testDate.split("T")[0] : "";
            setStageData((prev) => ({
                ...prev,
                testDate: formattedDate,
                testStartTime: test?.testStartTime || "",
                testEndTime: test?.testEndTime || "",
                testVenue: test?.testVenue || "",
            }));
        }
    }, [test]);



    function useApplicationTestScore(applicationId, stageId) {
        return useQuery({
            queryKey: ["applicationTest", applicationId, stageId],
            enabled: !!applicationId && !!stageId,
            staleTime: 5 * 60 * 1000, // 5 minutes: data is considered fresh for 5 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes: cached even if not used
            queryFn: async () => {
                const url = `/api/schools/admissions/applications/stage/stageHistory?applicationId=${applicationId}&stageId=${stageId}`;
                const res = await fetch(url, { credentials: "include" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch test score");
                return data.test;
            },
        });
    }
    // const {
    //     data: testScoremut,
    //     isPending,
    //     refetch,
    // } = useApplicationTestScore(applicationId, application?.currentStage?.id);

    const { data: testScoremut, refetch, isPending } = useApplicationTestScore(applicationId, activeStep);

    // Sync test data to stageData whenever testScoremut or activeStep changes
    useEffect(() => {
        if (testScoremut) {
            setStageData((prev) => ({
                ...prev,
                testScore: testScoremut?.testScore || "",
                testResult:
                    testScoremut?.testPassed === true
                        ? "pass"
                        : testScoremut?.testPassed === false
                            ? "fail"
                            : "",
                notes: testScoremut?.notes || "",
            }));
        }
    }, [testScoremut, activeStep]);
    // force refetch whenever step changes
    useEffect(() => {
        if (activeStep) refetch();
    }, [activeStep, refetch]);
    const { mutate: scheduleTest, isPending: isLoading } = useScheduleTest();
    console.log(isLoading);


    const [stageData, setStageData] = useState({}); // Store stage-specific data
    console.log(stageData);

    useEffect(() => {
        if (stageData.sectionId && schoolId) {
            fetch(`/api/schools/${schoolId}/sections/${stageData.sectionId}/roll-numbers`)
                .then(res => res.json())
                .then(data => {
                    if (data.assignedRollNumbers) {
                        setAssignedRollNumbers(data.assignedRollNumbers);
                    }
                    if (data.nextRollNumber && !stageData.rollNumber) {
                        setStageData(prev => ({ ...prev, rollNumber: data.nextRollNumber }));
                    }
                })
                .catch(err => console.error("Failed to fetch roll numbers", err));
        } else {
            setAssignedRollNumbers([]);
        }
    }, [stageData.sectionId, schoolId]);


    const { data: { stages = [] } = {}, isLoading: stagesLoading } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: () => fetchStages(schoolId),
        enabled: !!schoolId,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
    });


    const queryClient = useQueryClient();

    const moveMutation = useMutation({
        mutationFn: moveApplication,
        onSuccess: () => {
            queryClient.invalidateQueries(["application"]);
            toast.success("Stage saved successfully");
            setStageData({}); // Reset stage data after saving
        },
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
    });

    if (stagesLoading || appLoading) {
        return <LoaderPage />
    }

    const getStageStyle = (stage) => {
        switch (stage) {
            case "REVIEW":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "TEST_INTERVIEW":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "OFFER":
                return "bg-green-100 text-green-700 border-green-200";
            case "ENROLLED":
                return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "REJECTED":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100  border-gray-200";
        }
    };


    if (!application) {
        return <div className="p-6 text-center text-red-500">Application not found</div>;
    }

    // const currentStageIndex = stages.findIndex(stage => stage.id === application.currentStage.id);
    const rejectedStage = stages.find(stage => stage?.name?.toUpperCase() === "REJECTED");

    // Filter out only Rejected stage from the stepper (keep Enrolled as final step)
    const filteredStages = stages.filter(
        (stage) => {
            const stageName = stage.name?.toUpperCase();
            return stageName !== "REJECTED";
        }
    );
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };


    const currentStageIndex = filteredStages.findIndex(
        (stage) => stage.id === application.currentStage.id
    );
    const stepperConfig = filteredStages.map(stage => ({
        id: stage.id,
        title: stage.name,
        description: stage.description || "",
    }));


    // Inside component
    if (!cachedStepper || cachedStagesLength !== filteredStages.length) {
        cachedStepper = defineStepper(...stepperConfig);
        cachedStagesLength = filteredStages.length;
    }
    const { Stepper } = cachedStepper;

    const isStageDataChanged = () => {
        if (!testScoremut) {
            // no fetched data yet, enable if any field has value
            return !!(stageData.testScore || stageData.testResult || stageData.notes);
        }
        // compare with fetched data
        return (
            stageData.testScore !== (testScoremut?.testScore || "") ||
            stageData.testResult !==
            (testScoremut?.testPassed === true
                ? "pass"
                : testScoremut?.testPassed === false
                    ? "fail"
                    : "") ||
            stageData.notes !== (testScoremut?.notes || "")
        );
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(applicationId);
            toast.success("Application Id Copied!");

        } catch (err) {
            toast.error("Failde To Copy");
        }
    };

    const renderFieldsForStage = (stageName, methods) => {

        const handleStageDataChange = useCallback((field, value) => {
            setStageData(prev => ({ ...prev, [field]: value }));
        }, []);

        const handleRollNumberChange = (value) => {
            handleStageDataChange("rollNumber", value);
            if (assignedRollNumbers.includes(value) || assignedRollNumbers.includes(parseInt(value))) {
                // Find next available
                let nextVal = 1;
                const sorted = [...assignedRollNumbers].filter(n => typeof n === 'number').sort((a, b) => a - b);
                for (const num of sorted) {
                    if (num === nextVal) nextVal++;
                    else if (num > nextVal) break;
                }
                // Also check against string values just in case
                while (assignedRollNumbers.includes(String(nextVal))) {
                    nextVal++;
                }

                setRollNumberWarning(`Roll number ${value} is already assigned. Next available: ${nextVal}`);
            } else {
                setRollNumberWarning("");
            }
        };

        // Normalize stage name for comparison (case-insensitive)
        const normalizedStageName = stageName?.toUpperCase().replace(/[^A-Z0-9]/g, '_');

        switch (normalizedStageName) {
            case "REVIEW":
            case "SUBMITTED":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Applicant Name</Label>
                            <Input className='bg-background' value={application.applicantName} />
                        </div>
                        <div>
                            <Label className='mb-4'>Email</Label>
                            <Input className='bg-background' value={application.applicantEmail} />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>

                        {/* <span className="font-semibold">{field.name}: </span>
                                <span>{field.value}</span> */}
                        <Label className='mb-4'>Applicant Data</Label>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-background sticky top-0 z-10">
                                        <TableHead>Field Name</TableHead>
                                        <TableHead>Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(application.data).map(([fieldId, field], index) => (
                                        <TableRow key={fieldId} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                            <TableCell>{field.name}</TableCell>
                                            <TableCell>{field.value || ""}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Dialog>
                            <DialogTrigger>
                                <Button
                                    variant="destructive"
                                >
                                    Reject
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white shadow-none dark:bg-[#171717] w-[384px] h-fit p-0 text-foreground space-y-0 gap-0 rounded-md ">
                                <div>
                                    <DialogHeader className='border-b  h-min flex  justify-center px-3.5'>
                                        <DialogTitle className="flex py-3.5  text-lg tracking-tight leading-tight dark:text-white text-black font-semibold">
                                            Rejection Reason
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className='border-b  dark:text-white text-black h-min flex py-3.5   px-4'>
                                        Please provide a reason for rejection to help the applicant understand and maintain transparency
                                    </div>
                                    <div className="px-3.5 py-3.5">
                                        <div className="space-y-4">
                                            <div>
                                                <Label className='mb-4'>Rejection Reason*</Label>
                                                <Input className='bg-background'
                                                    placeholder="Enter rejection reason"
                                                    value={stageData.rejectionReason || ""}
                                                    onChange={(e) => handleStageDataChange("rejectionReason", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="flex flex-col py-5 px-4 gap-2 sm:flex-row justify-center items-center">
                                    <DialogClose asChild>
                                        <Button variant="outline" className="w-full cursor-pointer  dark:text-white text-black sm:w-auto">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        disabled={!rejectedStage || moveMutation.isPending || !stageData.rejectionReason}
                                        onClick={() => {
                                            if (rejectedStage) {
                                                moveMutation.mutate({
                                                    id: applicationId,
                                                    stageId: rejectedStage.id,
                                                    movedById,
                                                    stageData,
                                                });
                                            } else {
                                                toast.error("Rejected stage not found");
                                            }
                                        }}
                                    >
                                        {moveMutation.isPending ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Rejecting...
                                            </div>
                                        ) : (
                                            "Reject"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog >
                    </div >
                );
            case "SHORTLISTED":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Eligibility Notes</Label>
                            <Input className='bg-background'
                                placeholder="Enter eligibility notes"
                                value={stageData.eligibilityNotes || ""}
                                onChange={(e) => handleStageDataChange("eligibilityNotes", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            case "TEST_INTERVIEW":
            case "TEST":
            case "INTERVIEW":
            case "TESTINTERVIEW":

                return (
                    <div className="space-y-4">
                        {/* Schedule Test Button */}

                        <Dialog open={scopen} onOpenChange={setScopen}>
                            <DialogTrigger asChild>
                                <Button variant={'outline'} className="w-fit inline-flex items-center justify-center">
                                    <CalendarCheck />
                                    {test ? ('Update Scheduled Test') : "Schedule Test"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white max-h-[95vh]   overflow-y-auto shadow-none dark:bg-[#171717] w-[384px] h-fit p-0 text-foreground space-y-0 gap-0 rounded-md ">
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <DialogHeader className='border-b  py-2  h-min flex  justify-center px-3.5'>
                                            <DialogTitle className="flex text-lg tracking-tight leading-tight dark:text-white text-black font-semibold">
                                                Schedule Test
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="px-3.5 py-3.5">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className={'mb-3'}>Test Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="bg-background"
                                                        value={stageData.testDate || ""}
                                                        onChange={(e) => handleStageDataChange("testDate", e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    {/* <Label className={'mb-3'}>Test Time</Label> */}
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div>
                                                            <Label className={'mb-3'}>Start Time</Label>
                                                            <Input
                                                                type="time"
                                                                className="bg-background"
                                                                value={stageData.testStartTime || new Date(Date.now()).toTimeString().slice(0, 5)}
                                                                onChange={(e) => handleStageDataChange("testDate", e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className={'mb-3'}>End Time</Label>
                                                            <Input
                                                                type="time"
                                                                className="bg-background"
                                                                value={stageData.testEndTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)}
                                                                onChange={(e) => handleStageDataChange("testDate", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                </div>

                                                <div>
                                                    <LocationInput queryClient={queryClient} stageData={stageData} handleStageDataChange={handleStageDataChange} />
                                                </div>

                                                <div>
                                                    <Label className={'mb-3'}>Custom Message (Optional)</Label>
                                                    <Textarea className={'shadow-none'} placeholder="Custom Message...." />
                                                    {/* <Input
                                                        placeholder="Enter test venue or location"
                                                        className="bg-background"
                                                        value={stageData.testVenue || ""}
                                                        onChange={(e) => handleStageDataChange("testVenue", e.target.value)}
                                                    /> */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <DialogFooter className="mb-4 px-4 border-t pt-3.5">

                                    <Button
                                        disabled={isLoading}
                                        onClick={() => {
                                            scheduleTest({
                                                applicationId: applicationId,
                                                stageId: application.currentStage.id,
                                                movedById,
                                                testDate: stageData.testDate,
                                                testStartTime: stageData.testStartTime,
                                                testEndTime: stageData.testEndTime,
                                                testVenue: stageData.testVenue,
                                                customMessage: stageData.customMessage,
                                            });
                                        }}
                                        className="inline-flex w-full justify-center items-center"
                                    >
                                        <Mail strokeWidth={2} />
                                        {isLoading ? "Scheduling..." : "Inform & Save"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        {/* Test Score */}
                        <div>
                            <Label className="mb-4">Test Result</Label>
                            <Select
                                value={stageData.testResult || ""}
                                onValueChange={(value) => handleStageDataChange("testResult", value)}
                            >
                                <SelectTrigger className="bg-background w-full">
                                    <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pass">Pass</SelectItem>
                                    <SelectItem value="fail">Fail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-4">Test Score</Label>
                            <Input
                                className="bg-background"
                                type="number"
                                placeholder="Enter test score"
                                value={stageData.testScore || ""}
                                onChange={(e) => handleStageDataChange("testScore", e.target.value)}
                            />
                        </div>
                        {/* Comments */}
                        <div>
                            <Label className="mb-4">Comments</Label>
                            <Input
                                className="bg-background"
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                        <Button variant={'outline'} className={'inline-flex cursor-pointerß'}>
                            <Mail /> Send Mail To Candidate
                        </Button>
                        <Button
                            onClick={() =>
                                updateTestResult({
                                    applicationId: applicationId,
                                    stageId: application.currentStage.id,
                                    testResult: stageData.testResult,
                                    testScore: Number(stageData.testScore),
                                    notes: stageData.notes,
                                }).then(() => {
                                    // Invalidate the cached query so react-query refetches fresh data
                                    queryClient.invalidateQueries(["applicationTest", applicationId, activeStep]);
                                })
                            }
                            className="w-full inline-flex items-center justify-center"
                            disabled={isLoadingtestRes || !isStageDataChanged()}
                        >
                            {isLoadingtestRes ? "Saving..." : "Save"}
                        </Button>


                    </div >
                );
                return (
                    <div className="space-y-4">

                        <div>
                            <Label className='mb-4'>Test Score</Label>
                            <Input className='bg-background'
                                type="number"
                                placeholder="Enter test score"
                                value={stageData.testScore || ""}
                                onChange={(e) => handleStageDataChange("testScore", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Interview Date</Label>
                            <Input className='bg-background'
                                type="date"
                                value={stageData.interviewDate || ""}
                                onChange={(e) => handleStageDataChange("interviewDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            case "OFFER":
            case "OFFERED":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Offer Amount</Label>
                            <Input className='bg-background'
                                placeholder="Enter offer amount"
                                value={stageData.offerAmount || application.offerAmount || ""}
                                onChange={(e) => handleStageDataChange("offerAmount", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Notice Period</Label>
                            <Input className='bg-background'
                                placeholder="Enter notice period"
                                value={stageData.noticePeriod || application.noticePeriod || ""}
                                onChange={(e) => handleStageDataChange("noticePeriod", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            case "FEES_VERIFICATION":
            case "FEES__VERIFICATION":
            case "FEESVERIFICATION":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Fee Status</Label>
                            <Input className='bg-background'
                                placeholder="Enter fee status"
                                value={stageData.feeStatus || ""}
                                onChange={(e) => handleStageDataChange("feeStatus", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                        <Button>Verify Documents</Button>
                    </div>
                );
            case "ENROLLED":
            case "ENROLLMENT":
                return (
                    // <div className="space-y-4">
                    //     <div>
                    //         <Label className='mb-4'>Class Assigned</Label>
                    //         <Input className='bg-background'
                    //             placeholder="Enter class assigned"
                    //             value={stageData.classAssigned || ""}
                    //             onChange={(e) => handleStageDataChange("classAssigned", e.target.value)}
                    //         />
                    //     </div>
                    //     <div>
                    //         <Label className='mb-4'>Roll Number</Label>
                    //         <Input className='bg-background'
                    //             placeholder="Enter roll number"
                    //             value={stageData.rollNumber || ""}
                    //             onChange={(e) => handleStageDataChange("rollNumber", e.target.value)}
                    //         />
                    //     </div>
                    //     <div>
                    //         <Label className='mb-4'>Comments</Label>
                    //         <Input className='bg-background'
                    //             placeholder="Add comments"
                    //             value={stageData.notes || ""}
                    //             onChange={(e) => handleStageDataChange("notes", e.target.value)}
                    //         />
                    //     </div>
                    // </div>
                    <div className="space-y-4 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="font-semibold mb-2 block">Admission Number</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Admission Number"
                                        value={stageData.admissionNo || ""}
                                        onChange={(e) => handleStageDataChange("admissionNo", e.target.value)}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            fetch(`/api/schools/${schoolId}/students/next-admission-no`)
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.nextAdmissionNo) {
                                                        handleStageDataChange("admissionNo", data.nextAdmissionNo);
                                                        toast.success("Admission number generated");
                                                    }
                                                })
                                                .catch(() => toast.error("Failed to generate admission number"));
                                        }}
                                        title="Generate Admission Number"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Admission Date</Label>
                                <Input
                                    type="date"
                                    value={stageData.admissionDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => handleStageDataChange("admissionDate", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Student Name</Label>
                                <Input
                                    placeholder="Student Name"
                                    value={stageData.studentName || application.applicantName || ""}
                                    onChange={(e) => handleStageDataChange("studentName", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Date of Birth</Label>
                                <Input
                                    type="date"
                                    value={stageData.dob || ""}
                                    onChange={(e) => handleStageDataChange("dob", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Gender</Label>
                                <Select
                                    value={stageData.gender || ""}
                                    onValueChange={(value) => handleStageDataChange("gender", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Class Assigned</Label>
                                {loadingClasses ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="animate-spin w-5 h-5" />
                                        <span>Loading classes...</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={stageData.classId || ""}
                                        onValueChange={(value) => {
                                            handleStageDataChange("classId", value);
                                            handleStageDataChange("sectionId", ""); // Reset section when class changes
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.length === 0 ? (
                                                <SelectItem value="null" disabled>
                                                    No classes available
                                                </SelectItem>
                                            ) : (
                                                classes.map((cls) => (
                                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                                        {displayClassName(cls.className)}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div>
                                <Label className=" font-semibold  mb-2 block">Section Assigned</Label>
                                <Select
                                    value={stageData.sectionId || ""}
                                    onValueChange={(value) => handleStageDataChange("sectionId", value)}
                                    disabled={!stageData.classId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.find(c => c.id.toString() === stageData.classId)?.sections?.map((sec) => (
                                            <SelectItem key={sec.id} value={sec.id.toString()}>
                                                {sec.name}
                                            </SelectItem>
                                        )) || <SelectItem value="select" disabled>Select Class First</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className=" font-semibold mb-2 block">Roll Number</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter roll number"
                                        value={stageData.rollNumber || ""}
                                        onChange={(e) => handleRollNumberChange(e.target.value)}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            if (stageData.sectionId && schoolId) {
                                                fetch(`/api/schools/${schoolId}/sections/${stageData.sectionId}/roll-numbers`)
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        if (data.nextRollNumber) {
                                                            setStageData(prev => ({ ...prev, rollNumber: data.nextRollNumber }));
                                                            setRollNumberWarning("");
                                                            toast.success("Roll number assigned");
                                                        }
                                                    })
                                                    .catch(() => toast.error("Failed to generate roll number"));
                                            } else {
                                                toast.error("Please select a section first");
                                            }
                                        }}
                                        title="Generate Roll Number"
                                        disabled={!stageData.sectionId}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                {rollNumberWarning && (
                                    <p className="text-sm text-red-500 mt-1">{rollNumberWarning}</p>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-4">Parent/Guardian Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className=" font-semibold mb-2 block">Guardian Type</Label>
                                    <RadioGroup
                                        value={stageData.guardianType || "PARENTS"}
                                        onValueChange={(value) => handleStageDataChange("guardianType", value)}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="PARENTS" id="r1" />
                                            <Label htmlFor="r1">Parents</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="GUARDIAN" id="r2" />
                                            <Label htmlFor="r2">Guardian</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>

                            {stageData.guardianType === "GUARDIAN" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Guardian Name</Label>
                                        <Input
                                            placeholder="Guardian Name"
                                            value={stageData.guardianName || ""}
                                            onChange={(e) => handleStageDataChange("guardianName", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Guardian Mobile</Label>
                                        <Input
                                            placeholder="Guardian Mobile"
                                            value={stageData.guardianMobileNo || ""}
                                            onChange={(e) => handleStageDataChange("guardianMobileNo", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Relation</Label>
                                        <Input
                                            placeholder="Relation"
                                            value={stageData.guardianRelation || ""}
                                            onChange={(e) => handleStageDataChange("guardianRelation", e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Father Name</Label>
                                        <Input
                                            placeholder="Father Name"
                                            value={stageData.fatherName || ""}
                                            onChange={(e) => handleStageDataChange("fatherName", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Father Mobile</Label>
                                        <Input
                                            placeholder="Father Mobile"
                                            value={stageData.fatherMobileNumber || ""}
                                            onChange={(e) => handleStageDataChange("fatherMobileNumber", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Mother Name</Label>
                                        <Input
                                            placeholder="Mother Name"
                                            value={stageData.motherName || ""}
                                            onChange={(e) => handleStageDataChange("motherName", e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className=" font-semibold mb-2 block">Mother Mobile</Label>
                                        <Input
                                            placeholder="Mother Mobile"
                                            value={stageData.motherMobileNumber || ""}
                                            onChange={(e) => handleStageDataChange("motherMobileNumber", e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className=" font-semibold mb-2 block">Comments</Label>
                            <Input
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            case "WAITLISTED":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Waitlist Position</Label>
                            <Input className='bg-background'
                                placeholder="Enter waitlist position"
                                value={stageData.waitlistPosition || ""}
                                onChange={(e) => handleStageDataChange("waitlistPosition", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                        <Button>Move to Offer</Button>
                    </div>
                );
            case "REJECTED":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Rejection Reason</Label>
                            <Input className='bg-background'
                                placeholder="Enter rejection reason"
                                value={stageData.rejectionReason || ""}
                                onChange={(e) => handleStageDataChange("rejectionReason", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Comments</Label>
                            <Input className='bg-background'
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            default:
                return <p>No fields for this stage.</p>;
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center px-4 justify-between">
                <Card className="shadow-md w-full">
                    {/* Header for Primary Info (Name, Email) and Action Button 
            -----------------------------------------------------------
            */}
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div className="space-y-1">
                            {/* Name as the main title */}
                            <CardTitle className="text-2xl font-medium  tracking-tight">
                                {application.applicantName}
                            </CardTitle>
                            {/* Email as the description, styled as a clickable link */}
                            <CardDescription className="text-base text-blue-600 hover:text-blue-700 cursor-pointer">
                                {application.applicantEmail}
                            </CardDescription>
                        </div>

                        {/* Action Button */}

                        {/* <Button className="ml-4" variant="default">
                            <Phone className="mr-2 h-4 w-4" /> Call Candidate
                        </Button> */}
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">

                        {/* 1. Application ID */}
                        <div className="flex w flex-col space-y-1">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Application ID</span>
                            <div className="flex items-center w-full space-x-2">
                                {/* Use a Badge for visual distinction and allow copying */}
                                <Badge variant="secondary" className="font-mono text-sm py-1 px-3">
                                    {applicationId}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        {/* 2. Submitted On */}
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Submitted On</span>
                            <span className="text-base font-medium text-foreground">
                                {formatDate(application.submittedAt)}
                            </span>
                        </div>

                        {/* 3. Current Stage */}
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Current Stage</span>
                            {/* <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 w-fit text-base">
                                {application.currentStage?.name || "N/A"}
                            </Badge> */}
                            <Badge
                                className={`px-2 py-1 text-sm font-medium ${getStageStyle(application.currentStage?.name)} capitalize`}
                            >
                                {application.currentStage?.name.replace("_", " & ")}
                            </Badge>
                        </div>

                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-background p-4 rounded-md">
                {
                    test && (
                        <Alert className="flex transition-all items-start gap-2 mb-2.5 border-green-400 shadow-sm bg-green-50  text-green-800">
                            <CheckCircle2Icon />

                            <div>
                                <AlertTitle>Scheduled Test Details</AlertTitle>
                                {/* <AlertTitle>Test Scheduled</AlertTitle> */}
                                <AlertDescription className="space-y-1 mt-2.5" >
                                    <ul className="space-y-1 font-normal text-black text-sm">
                                        <li> <span className="font-semibold">Test Date: </span>{new Date(test.testDate).toLocaleDateString()}</li>
                                        <li>
                                            <span className="font-semibold">Test Time: </span>{" "}
                                            {new Date(test.testStartTime).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}{" "}
                                            –{" "}
                                            {new Date(test.testEndTime).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </li>
                                        <li className="flex items-center gap-1">
                                            <span className="font-semibold">Test Venue: </span>
                                            <span>{test.testVenue}</span>
                                        </li>
                                    </ul>
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}
                <Stepper.Provider variant="horizontal" labelOrientation="vertical" initialStep={stages[currentStageIndex]?.id}>
                    {({ methods }) => {
                        // store methods in ref
                        stepperMethodsRef.current = methods;

                        // update state whenever current step changes
                        useEffect(() => {
                            if (methods?.current?.id && methods.current.id !== activeStep) {
                                console.log("Active step changed:", methods.current.id);
                                setActiveStep(methods.current.id);
                            }
                        }, [methods?.current?.id, activeStep]);

                        return (
                            <>
                                {application.currentStage.name === 'REJECTED' ? (
                                    <div className="flex  w-full h-max mt-4 p-4 bg-muted  border rounded-md  flex-col gap-2.5">
                                        <Alert variant="destructive"  >
                                            <AlertCircleIcon />

                                            <AlertTitle>Application Rejected.</AlertTitle>
                                            <AlertDescription>
                                                <p>Reason: {application.data?.[application.currentStage.id]?.rejectionReason}</p>
                                            </AlertDescription>

                                        </Alert>
                                        <div>
                                            <Button
                                                className="w-full"
                                                onClick={() => {
                                                    if (rejectedStage) {
                                                        moveMutation.mutate({
                                                            id: applicationId,
                                                            stageId: "670a599b-b5b9-4c4c-9f50-4b4d31ae0cf5",
                                                            movedById,
                                                            stageData,
                                                        });
                                                    } else {
                                                        toast.error("Rejected stage not found");
                                                    }
                                                }}
                                                disabled={!rejectedStage || moveMutation.isPending}
                                                variant="outline"
                                            >
                                                {moveMutation.isPending ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Activating...
                                                    </span>
                                                ) : (
                                                    "Activate"
                                                )}
                                            </Button>

                                        </div>

                                    </div>
                                ) : (
                                    <>
                                        <Stepper.Navigation className='border p-4 shadow-md bg-white dark:bg-muted  rounded-md overflow-x-auto overflow-hidden'>
                                            {methods.all.map((step) => (
                                                <Stepper.Step
                                                    key={step.id}
                                                    of={step.id}
                                                    onClick={() => methods.goTo(step.id)}
                                                    disabled={stages.findIndex(s => s.id === step.id) > currentStageIndex && !methods.isLast}
                                                >
                                                    <Stepper.Title>
                                                        {step.title
                                                            .replace("_", " ")                       // replace underscore with space
                                                            .toLowerCase()                           // convert all to lowercase
                                                            .replace(/^\w/, (c) => c.toUpperCase()) // capitalize first letter
                                                        }
                                                    </Stepper.Title>

                                                    <Stepper.Description>{step.description}</Stepper.Description>
                                                </Stepper.Step>
                                            ))}
                                        </Stepper.Navigation>

                                        <div className="mt-4 p-4 bg-white shadow-md dark:bg-muted border rounded-md">
                                            {methods.current ? renderFieldsForStage(methods.current.title, methods) : <div>Loading stage...</div>}
                                        </div>

                                        <Stepper.Controls className="mt-4 w-full flex justify-between ">
                                            {/* <div></div> */}
                                            <div className="flex gap-3">
                                                <Button type="button" variant="secondary" onClick={methods.prev} disabled={methods.isFirst}>
                                                    Previous
                                                </Button>
                                                <Button type="button" variant="secondary" onClick={methods.isLast ? methods.reset : methods.next} disabled={methods.isLast}>
                                                    {methods.isLast ? "Reset" : "Next"}
                                                </Button>
                                            </div>
                                            <Button
                                                onClick={() => moveMutation.mutate({ id: applicationId, stageId: methods.current?.id, movedById, stageData })}
                                                disabled={!methods.current || application.currentStage.id === methods.current.id}
                                            >
                                                {methods.current && application.currentStage.id === methods.current.id
                                                    ? 'Marked'
                                                    : `Mark`}
                                            </Button>
                                        </Stepper.Controls>
                                    </>
                                )}
                            </>
                        );
                    }}
                </Stepper.Provider>
            </div>
        </div>
    );
}
