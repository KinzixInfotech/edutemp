
'use client'
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, Copy, Loader2, Phone } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { defineStepper } from "@/components/stepper";
import LoaderPage from "@/components/loader-page";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"

import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog"
import { DialogTrigger } from "@radix-ui/react-dialog";
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


export default function ApplicationDetails() {
    const params = useParams();
    const applicationId = params.id;
    const local = localStorage.getItem('user');
    const fullUser = JSON.parse(local);

    const schoolId = fullUser?.schoolId;

    const movedById = fullUser?.id;

    const [stageData, setStageData] = useState({}); // Store stage-specific data
    console.log(stageData);
    const { data: { stages = [] } = {}, isLoading: stagesLoading } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: () => fetchStages(schoolId),
        enabled: !!schoolId,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
    });

    const { data: { application } = {}, isLoading: appLoading } = useQuery({
        queryKey: ["application", applicationId, schoolId],
        queryFn: () => fetchApplication({ applicationId, schoolId }),
        enabled: !!schoolId && !!applicationId,
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


    if (!application) {
        return <div className="p-6 text-center text-red-500">Application not found</div>;
    }

    // const currentStageIndex = stages.findIndex(stage => stage.id === application.currentStage.id);
    const rejectedStage = stages.findIndex(stage => stage?.name === "Rejected");

    const excludedStageIds = ["36bf836d-c63e-474b-9da5-e16909612ebf", "99493d9e-2f0c-42ff-8da4-904e3bc78450"];

    const filteredStages = stages.filter(
        (stage) => !excludedStageIds.includes(stage.id)
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

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(applicationId);
            toast.success("Copied successfully");

        } catch (err) {
            toast.error("Failde To Copy");
        }
    };
    const renderFieldsForStage = (stageName, methods) => {

        const handleStageDataChange = useCallback((field, value) => {
            setStageData(prev => ({ ...prev, [field]: value }));
        }, []);

        switch (stageName) {
            case "REVIEW":
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
                                                    stageId: "99493d9e-2f0c-42ff-8da4-904e3bc78450",
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
            case "Shortlisted":
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
            case "Fees & Verification":
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
                return (
                    <div className="space-y-4">
                        <div>
                            <Label className='mb-4'>Class Assigned</Label>
                            <Input className='bg-background'
                                placeholder="Enter class assigned"
                                value={stageData.classAssigned || ""}
                                onChange={(e) => handleStageDataChange("classAssigned", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className='mb-4'>Roll Number</Label>
                            <Input className='bg-background'
                                placeholder="Enter roll number"
                                value={stageData.rollNumber || ""}
                                onChange={(e) => handleStageDataChange("rollNumber", e.target.value)}
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
            case "Waitlisted":
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
            case "Rejected":
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
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 w-fit text-base">
                                {application.currentStage?.name || "N/A"}
                            </Badge>
                        </div>

                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-background p-4 rounded-md">
                <Stepper.Provider variant="horizontal" labelOrientation="vertical" initialStep={stages[currentStageIndex]?.id}>
                    {({ methods }) => (
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
                                                        stageId: "0a2d4db8-05df-4fe4-b05e-dff8454124ba",
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
                                        {renderFieldsForStage(methods.current.title, methods)}
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
                                            onClick={() => moveMutation.mutate({ id: applicationId, stageId: methods.current.id, movedById, stageData })}
                                            disabled={application.currentStage.id === methods.current.id}
                                        >
                                            {application.currentStage.id === methods.current.id
                                                ? 'Marked'
                                                : `Mark`}
                                        </Button>
                                    </Stepper.Controls>
                                </>
                            )}
                        </>
                    )}
                </Stepper.Provider>
            </div>
        </div>
    );
}
