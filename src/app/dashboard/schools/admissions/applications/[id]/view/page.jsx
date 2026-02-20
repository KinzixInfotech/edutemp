
'use client';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, CalendarCheck, CheckCircle2Icon, Copy, Loader2, Mail, Phone, RefreshCw, MessageSquare, Image, Download, ZoomIn, X, FileText, Video, Music, ChevronRight, Home, ArrowLeft, Clock, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
    const [enrollmentErrors, setEnrollmentErrors] = useState({});

    // Zod schema for enrollment validation
    const enrollmentSchema = z.object({
        admissionNo: z.string().min(1, 'Admission number is required'),
        studentName: z.string().min(1, 'Student name is required'),
        classId: z.string().min(1, 'Class is required'),
        sectionId: z.string().min(1, 'Section is required'),
        gender: z.string().min(1, 'Gender is required'),
        dob: z.string().optional(),
        rollNumber: z.string().optional(),
        admissionDate: z.string().optional(),
    });

    const validateEnrollment = (data) => {
        const result = enrollmentSchema.safeParse(data);
        if (!result.success) {
            const fieldErrors = {};
            result.error.errors.forEach(err => {
                fieldErrors[err.path[0]] = err.message;
            });
            setEnrollmentErrors(fieldErrors);
            return false;
        }
        setEnrollmentErrors({});
        return true;
    };

    // SMS Dialog state
    const [smsDialogOpen, setSmsDialogOpen] = useState(false);
    const [smsMessage, setSmsMessage] = useState("");
    const [smsSending, setSmsSending] = useState(false);

    // File preview lightbox state
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    const [scopen, setScopen] = useState(false);

    // Helper: Check if value is a file URL
    const isFileUrl = (value) => {
        if (!value) return false;
        // If it's an object with a url property
        if (typeof value === 'object' && (value.url || value.fileUrl || value.secure_url)) {
            return true;
        }
        // If string
        if (typeof value !== 'string') return false;
        return value.startsWith('http') && (
            value.includes('uploadthing') ||
            value.includes('utfs.io') ||
            value.includes('cloudinary') ||
            value.includes('.s3.') ||
            /\.(jpg|jpeg|png|gif|webp|pdf|mp4|mp3|doc|docx|xlsx|csv)$/i.test(value)
        );
    };

    // Helper: Get file type from URL
    const getFileType = (url) => {
        if (!url) return 'unknown';
        const lower = url.toLowerCase();
        if (/\.(jpg|jpeg|png|gif|webp|svg)/.test(lower)) return 'image';
        if (/\.(mp4|webm|mov|avi)/.test(lower)) return 'video';
        if (/\.(mp3|wav|ogg)/.test(lower)) return 'audio';
        if (/\.pdf/.test(lower)) return 'pdf';
        return 'file';
    };

    // Helper: Render file preview in table
    const renderFieldValue = (value) => {
        if (!value) return <span className="text-muted-foreground">—</span>;

        // Handle arrays (e.g. checkboxes)
        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1">
                    {value.map((v, i) => <Badge key={i} variant="secondary">{String(v)}</Badge>)}
                </div>
            );
        }

        // Handle objects (extract file url or stringify)
        if (typeof value === 'object') {
            const url = value.url || value.fileUrl || value.secure_url;
            if (url) {
                // It's a file object, recurse with the url string
                return renderFieldValue(url);
            }
            // Fallback for non-file objects
            return JSON.stringify(value);
        }

        if (isFileUrl(value)) {
            const fileType = getFileType(value);

            if (fileType === 'image') {
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="relative w-12 h-12 rounded-md overflow-hidden border cursor-pointer group"
                            onClick={() => { setPreviewUrl(value); setPreviewOpen(true); }}
                        >
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <Button size="sm" variant="ghost" asChild>
                            <a href={value} download target="_blank"><Download className="w-4 h-4" /></a>
                        </Button>
                    </div>
                );
            }

            if (fileType === 'video') {
                return (
                    <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-500" />
                        <Button size="sm" variant="outline" asChild>
                            <a href={value} target="_blank">View</a>
                        </Button>
                    </div>
                );
            }

            if (fileType === 'audio') {
                return (
                    <div className="flex items-center gap-2">
                        <Music className="w-5 h-5 text-purple-500" />
                        <audio controls src={value} className="h-8" />
                    </div>
                );
            }

            if (fileType === 'pdf') {
                return (
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" />
                        <Button size="sm" variant="outline" asChild>
                            <a href={value} target="_blank">View PDF</a>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                            <a href={value} download><Download className="w-4 h-4" /></a>
                        </Button>
                    </div>
                );
            }

            // Generic file
            return (
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <Button size="sm" variant="outline" asChild>
                        <a href={value} download>Download</a>
                    </Button>
                </div>
            );
        }

        // Handle arrays (checkboxes, multiple select)
        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1">
                    {value.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                    ))}
                </div>
            );
        }

        return <span className="text-sm">{String(value)}</span>;
    };

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
        (stage) => stage.id === application.currentStage?.id
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
                        <Label className='mb-2 text-sm font-semibold'>Applicant Data</Label>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 dark:bg-background/50">
                                        <TableHead className="w-1/3 font-semibold">Field Name</TableHead>
                                        <TableHead className="font-semibold">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(application.data || {}).map(([fieldId, fieldData], index) => {
                                        // Try to find field config from form definition by ID or by Name check
                                        const fieldConfig = application.form?.fields?.find(f => f.id === fieldId || f.name === fieldId);
                                        // Determine label: use form config name (corrected from label), or data name, or fallback to field ID
                                        const label = fieldConfig?.name || fieldData?.name || fieldId;
                                        // Determine value: structure might be { name, value } or just raw value
                                        const value = fieldData?.value !== undefined ? fieldData.value : fieldData;

                                        return (
                                            <TableRow key={fieldId} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium text-muted-foreground py-3">{label}</TableCell>
                                                <TableCell className="py-3">{renderFieldValue(value)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {Object.keys(application.data || {}).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                                                No application data found
                                            </TableCell>
                                        </TableRow>
                                    )}
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
                    <div className="space-y-6">
                        {/* Step 1: Schedule Test */}
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${test ? 'bg-green-100 text-green-700' : 'bg-primary text-primary-foreground'}`}>
                                    {test ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Schedule Test</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {test ? 'Test scheduled successfully' : 'Set date, time and venue for the test'}
                                            </p>
                                        </div>
                                        <Dialog open={scopen} onOpenChange={setScopen}>
                                            <DialogTrigger asChild>
                                                <Button variant={test ? 'outline' : 'default'} size="sm">
                                                    <CalendarCheck className="h-4 w-4 mr-2" />
                                                    {test ? 'Update Schedule' : 'Schedule Test'}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-white max-h-[95vh] overflow-y-auto shadow-none dark:bg-[#171717] w-[384px] h-fit p-0 text-foreground space-y-0 gap-0 rounded-md">
                                                <div className="space-y-4 mt-4">
                                                    <div>
                                                        <DialogHeader className='border-b py-2 h-min flex justify-center px-3.5'>
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
                                                                    <div className="grid grid-cols-2 gap-2.5">
                                                                        <div>
                                                                            <Label className={'mb-3'}>Start Time</Label>
                                                                            <Input
                                                                                type="time"
                                                                                className="bg-background"
                                                                                value={stageData.testStartTime || new Date(Date.now()).toTimeString().slice(0, 5)}
                                                                                onChange={(e) => handleStageDataChange("testStartTime", e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className={'mb-3'}>End Time</Label>
                                                                            <Input
                                                                                type="time"
                                                                                className="bg-background"
                                                                                value={stageData.testEndTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5)}
                                                                                onChange={(e) => handleStageDataChange("testEndTime", e.target.value)}
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
                                                                stageId: application.currentStage?.id,
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
                                                        <Mail strokeWidth={2} className="h-4 w-4 mr-2" />
                                                        {isLoading ? "Scheduling..." : "Schedule & Notify via SMS"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {/* Show scheduled test info */}
                                    {test && (
                                        <div className="text-sm bg-green-50 dark:bg-green-950/20 rounded-md p-3 border border-green-200">
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                <span><strong>Date:</strong> {new Date(test.testDate).toLocaleDateString()}</span>
                                                <span><strong>Time:</strong> {new Date(test.testStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(test.testEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {test.testVenue && <span><strong>Venue:</strong> {test.testVenue}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Enter Test Results */}
                        <div className={`rounded-lg border bg-card p-4 ${!test ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-start gap-4">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${stageData.testResult ? 'bg-green-100 text-green-700' : test ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    {stageData.testResult ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h4 className="font-medium">Enter Test Results</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {!test ? 'Schedule test first' : stageData.testResult ? 'Results recorded' : 'Add the test score and result'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="mb-2">Test Result</Label>
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
                                            <Label className="mb-2">Test Score</Label>
                                            <Input
                                                className="bg-background"
                                                type="number"
                                                placeholder="Enter score"
                                                value={stageData.testScore || ""}
                                                onChange={(e) => handleStageDataChange("testScore", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="mb-2">Comments</Label>
                                        <Input
                                            className="bg-background"
                                            placeholder="Add comments (optional)"
                                            value={stageData.notes || ""}
                                            onChange={(e) => handleStageDataChange("notes", e.target.value)}
                                        />
                                    </div>

                                    <Button
                                        onClick={() =>
                                            updateTestResult({
                                                applicationId: applicationId,
                                                stageId: application.currentStage?.id,
                                                testResult: stageData.testResult,
                                                testScore: Number(stageData.testScore),
                                                notes: stageData.notes,
                                            }).then(() => {
                                                queryClient.invalidateQueries(["applicationTest", applicationId, activeStep]);
                                            })
                                        }
                                        className="w-full"
                                        disabled={isLoadingtestRes || !isStageDataChanged() || !stageData.testResult}
                                    >
                                        {isLoadingtestRes ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                        ) : (
                                            <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Results</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Send Notification */}
                        <div className={`rounded-lg border bg-card p-4 ${!stageData.testResult ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-start gap-4">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${stageData.testResult ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    3
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h4 className="font-medium">Send Result Notification</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {!stageData.testResult ? 'Enter results first' : 'Notify the candidate about their test result'}
                                        </p>
                                    </div>

                                    <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full sm:w-auto">
                                                <MessageSquare className="w-4 h-4 mr-2" /> Send SMS to Candidate
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Send SMS to Candidate</DialogTitle>
                                                <DialogDescription>
                                                    Send a notification SMS to {application.applicantName}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div>
                                                    <Label className="mb-2">Recipient Phone</Label>
                                                    <Input
                                                        value={application.data?.phone?.value || application.data?.mobile?.value || application.data?.contactNumber?.value || ""}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                    {!application.data?.phone?.value && !application.data?.mobile?.value && (
                                                        <p className="text-xs text-amber-500 mt-1">No phone number found in application data</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label className="mb-2">Message Template</Label>
                                                    <Select value={smsMessage} onValueChange={setSmsMessage}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select message type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="test_scheduled">Test Scheduled Notification</SelectItem>
                                                            <SelectItem value="interview_scheduled">Interview Scheduled Notification</SelectItem>
                                                            <SelectItem value="result_pass">Result: Passed</SelectItem>
                                                            <SelectItem value="result_fail">Result: Not Selected</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {smsMessage && (
                                                    <div className="p-3 bg-muted rounded-lg text-sm">
                                                        <p className="font-medium mb-1">Preview:</p>
                                                        <p className="text-muted-foreground">
                                                            {smsMessage === "test_scheduled" && `Dear ${application.applicantName}, your admission test has been scheduled${stageData.testDate ? ` on ${stageData.testDate}` : ""}${stageData.testVenue ? ` at ${stageData.testVenue}` : ""}. - St Xavier's School`}
                                                            {smsMessage === "interview_scheduled" && `Dear ${application.applicantName}, your interview has been scheduled. Please check your email for details. - St Xavier's School`}
                                                            {smsMessage === "result_pass" && `Congratulations ${application.applicantName}! You have passed the admission test. Please proceed with the next steps. - St Xavier's School`}
                                                            {smsMessage === "result_fail" && `Dear ${application.applicantName}, thank you for your interest. Unfortunately, you were not selected at this time. - St Xavier's School`}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
                                                <Button
                                                    disabled={smsSending || !smsMessage}
                                                    onClick={async () => {
                                                        const phoneNumber = application.data?.phone?.value || application.data?.mobile?.value || application.data?.contactNumber?.value;
                                                        if (!phoneNumber) {
                                                            toast.error("No phone number found in application");
                                                            return;
                                                        }
                                                        setSmsSending(true);
                                                        try {
                                                            toast.success("SMS functionality ready - configure SMS templates in Settings > SMS to enable sending");
                                                            setSmsDialogOpen(false);
                                                        } catch (error) {
                                                            toast.error("Failed to send SMS");
                                                        } finally {
                                                            setSmsSending(false);
                                                        }
                                                    }}
                                                >
                                                    {smsSending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : "Send SMS"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
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
                                        onChange={(e) => { handleStageDataChange("admissionNo", e.target.value); setEnrollmentErrors(prev => ({ ...prev, admissionNo: undefined })); }}
                                        className={enrollmentErrors.admissionNo ? 'border-red-500' : ''}
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
                                                        setEnrollmentErrors(prev => ({ ...prev, admissionNo: undefined }));
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
                                {enrollmentErrors.admissionNo && <p className="text-xs text-red-500 mt-1">{enrollmentErrors.admissionNo}</p>}
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
                                    onChange={(e) => { handleStageDataChange("studentName", e.target.value); setEnrollmentErrors(prev => ({ ...prev, studentName: undefined })); }}
                                    className={enrollmentErrors.studentName ? 'border-red-500' : ''}
                                />
                                {enrollmentErrors.studentName && <p className="text-xs text-red-500 mt-1">{enrollmentErrors.studentName}</p>}
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
                                    onValueChange={(value) => { handleStageDataChange("gender", value); setEnrollmentErrors(prev => ({ ...prev, gender: undefined })); }}
                                >
                                    <SelectTrigger className={enrollmentErrors.gender ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {enrollmentErrors.gender && <p className="text-xs text-red-500 mt-1">{enrollmentErrors.gender}</p>}
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
                                            setEnrollmentErrors(prev => ({ ...prev, classId: undefined, sectionId: undefined }));
                                        }}
                                    >
                                        <SelectTrigger className={`w-full ${enrollmentErrors.classId ? 'border-red-500' : ''}`}>
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
                                {enrollmentErrors.classId && <p className="text-xs text-red-500 mt-1">{enrollmentErrors.classId}</p>}
                            </div>
                            <div>
                                <Label className=" font-semibold  mb-2 block">Section Assigned</Label>
                                <Select
                                    value={stageData.sectionId || ""}
                                    onValueChange={(value) => { handleStageDataChange("sectionId", value); setEnrollmentErrors(prev => ({ ...prev, sectionId: undefined })); }}
                                    disabled={!stageData.classId}
                                >
                                    <SelectTrigger className={`w-full ${enrollmentErrors.sectionId ? 'border-red-500' : ''}`}>
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
                                {enrollmentErrors.sectionId && <p className="text-xs text-red-500 mt-1">{enrollmentErrors.sectionId}</p>}
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
        <>
            <div className="p-6 space-y-6">
                {/* Header with Breadcrumb */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <a href="/dashboard/schools/admissions/overview" className="hover:text-foreground transition-colors flex items-center gap-1">
                                <Home className="h-4 w-4" />
                                Admissions
                            </a>
                            <ChevronRight className="h-4 w-4" />
                            <a href="/dashboard/schools/admissions/applications" className="hover:text-foreground transition-colors">
                                Applications
                            </a>
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-foreground">{application.applicantName}</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight">{application.applicantName}</h1>
                        <p className="text-muted-foreground mt-1">
                            Application submitted on {new Date(application.submittedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${application.applicantEmail}`}>
                                <Mail className="h-4 w-4 mr-2" />
                                Email
                            </a>
                        </Button>
                        {(application.data?.phone?.value || application.data?.mobile?.value) && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={`tel:${application.data?.phone?.value || application.data?.mobile?.value}`}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Call
                                </a>
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy Application ID">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Rejected Application Alert */}
                {application.currentStage?.name === 'REJECTED' && (
                    <Alert variant="destructive">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertTitle>Application Rejected</AlertTitle>
                        <AlertDescription className="flex items-center justify-between">
                            <span>Reason: {application.data?.[application.currentStage?.id]?.rejectionReason || 'No reason provided'}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const reviewStage = filteredStages.find(s => s.name?.toUpperCase() === 'REVIEW');
                                    if (reviewStage) {
                                        moveMutation.mutate({ id: applicationId, stageId: reviewStage.id, movedById, stageData });
                                    }
                                }}
                                disabled={moveMutation.isPending}
                            >
                                {moveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Reactivate
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Content Grid - Split View Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Step Progress & Applicant Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Step Progress Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Application Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="relative">
                                    {filteredStages.map((stage, index) => {
                                        const isCompleted = index < currentStageIndex;
                                        const isCurrent = index === currentStageIndex;
                                        const isUpcoming = index > currentStageIndex;

                                        return (
                                            <div
                                                key={stage.id}
                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${isCurrent
                                                    ? 'bg-primary/5 border-l-primary'
                                                    : isCompleted
                                                        ? 'hover:bg-muted/50 border-l-green-500'
                                                        : 'hover:bg-muted/50 border-l-transparent opacity-60'
                                                    }`}
                                                onClick={() => {
                                                    if (!isUpcoming && stepperMethodsRef.current) {
                                                        stepperMethodsRef.current.goTo(stage.id);
                                                    }
                                                }}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCompleted
                                                    ? 'bg-green-100 text-green-700'
                                                    : isCurrent
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>
                                                        {stage.name?.replace('_', ' & ')}
                                                    </p>
                                                    {isCurrent && <p className="text-xs text-muted-foreground">Current stage</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Applicant Summary Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">Quick Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-medium truncate">{application.applicantEmail}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Application ID</p>
                                    <p className="text-sm font-mono text-muted-foreground truncate">{applicationId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Form</p>
                                    <p className="text-sm font-medium">{application.form?.title || 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                                    <Badge className={`mt-1 ${getStageStyle(application.currentStage?.name)}`}>
                                        {application.currentStage?.name?.replace('_', ' & ')}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stage History */}
                        {application.stageHistory && application.stageHistory.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {application.stageHistory.slice(0, 5).map((history, index) => (
                                        <div key={history.id || index} className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{history.stage?.name?.replace('_', ' & ')}</span>
                                            <span className="text-muted-foreground text-xs">
                                                {new Date(history.movedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Stage Content with Stepper */}
                        {application.currentStage?.name !== 'REJECTED' && (
                            <Stepper.Provider variant="horizontal" labelOrientation="vertical" initialStep={filteredStages[currentStageIndex]?.id}>
                                {({ methods }) => {
                                    stepperMethodsRef.current = methods;

                                    useEffect(() => {
                                        if (methods?.current?.id && methods.current.id !== activeStep) {
                                            setActiveStep(methods.current.id);
                                        }
                                    }, [methods?.current?.id, activeStep]);

                                    return (
                                        <>
                                            {/* Horizontal Stepper Navigation */}
                                            <Card className="mb-6">
                                                <CardContent className="p-4">
                                                    <Stepper.Navigation className="overflow-x-auto">
                                                        {methods.all.map((step) => (
                                                            <Stepper.Step
                                                                key={step.id}
                                                                of={step.id}
                                                                onClick={() => methods.goTo(step.id)}
                                                                disabled={filteredStages.findIndex(s => s.id === step.id) > currentStageIndex}
                                                            >
                                                                <Stepper.Title>
                                                                    {step.title
                                                                        .replace('_', ' ')
                                                                        .toLowerCase()
                                                                        .replace(/^\w/, (c) => c.toUpperCase())
                                                                    }
                                                                </Stepper.Title>
                                                                <Stepper.Description>{step.description}</Stepper.Description>
                                                            </Stepper.Step>
                                                        ))}
                                                    </Stepper.Navigation>
                                                </CardContent>
                                            </Card>

                                            {/* Stage Content Card */}
                                            <Card>
                                                <CardHeader className="border-b">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-lg">
                                                                {methods.current?.title?.replace('_', ' & ') || 'Stage Details'}
                                                            </CardTitle>
                                                            <CardDescription>
                                                                {methods.current?.description || 'Complete the required actions for this stage'}
                                                            </CardDescription>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            Step {filteredStages.findIndex(s => s.id === methods.current?.id) + 1} of {filteredStages.length}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-6">
                                                    {methods.current ? (
                                                        renderFieldsForStage(methods.current.title, methods)
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <Skeleton className="h-6 w-1/3" />
                                                            <Skeleton className="h-10 w-full" />
                                                            <Skeleton className="h-10 w-full" />
                                                            <Skeleton className="h-10 w-2/3" />
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Navigation & Actions */}
                                            <div className="flex items-center justify-between pt-4 mt-4 border-t">
                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="outline"
                                                        onClick={methods.prev}
                                                        disabled={methods.isFirst}
                                                    >
                                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                                        Previous
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={methods.next}
                                                        disabled={methods.isLast}
                                                    >
                                                        Next
                                                        <ChevronRight className="h-4 w-4 ml-2" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    onClick={() => {
                                                        // Check if target stage is ENROLLED — apply Zod validation
                                                        const targetStageName = methods.current?.title?.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                                                        if (targetStageName === 'ENROLLED' || targetStageName === 'ENROLLMENT') {
                                                            const isValid = validateEnrollment({
                                                                admissionNo: stageData.admissionNo || '',
                                                                studentName: stageData.studentName || application.applicantName || '',
                                                                classId: stageData.classId || '',
                                                                sectionId: stageData.sectionId || '',
                                                                gender: stageData.gender || '',
                                                            });
                                                            if (!isValid) {
                                                                toast.error('Please fill all required enrollment fields');
                                                                return;
                                                            }
                                                        }
                                                        moveMutation.mutate({ id: applicationId, stageId: methods.current?.id, movedById, stageData });
                                                    }}
                                                    disabled={!methods.current || application.currentStage?.id === methods.current.id || moveMutation.isPending}
                                                >
                                                    {moveMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : application.currentStage?.id === methods.current?.id ? (
                                                        <>
                                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                                            Current Stage
                                                        </>
                                                    ) : (
                                                        <>
                                                            Move to {methods.current?.title?.replace('_', ' & ')}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </>
                                    );
                                }}
                            </Stepper.Provider>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Preview Lightbox */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                            onClick={() => setPreviewOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        <img
                            src={previewUrl}
                            alt="Full preview"
                            className="w-full h-auto max-h-[80vh] object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-3">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(previewUrl);
                                    toast.success("URL copied to clipboard");
                                }}
                            >
                                <Copy className="w-4 h-4 mr-2" /> Copy URL
                            </Button>
                            <Button variant="secondary" size="sm" asChild>
                                <a href={previewUrl} download target="_blank">
                                    <Download className="w-4 h-4 mr-2" /> Download
                                </a>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
