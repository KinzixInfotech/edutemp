
'use client'
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
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
    // const { fullUser } = useAuth();
    // const { fullUser } = useAuth();
    const local = localStorage.getItem('user');
    const fullUser = JSON.parse(local);
    // console.log(user.id);


    const schoolId = fullUser?.schoolId;
    // const schoolId = '8386c0aa-af56-45aa-86a5-c9ecefd9614d';

    const movedById = fullUser?.id;

    const [stageData, setStageData] = useState({}); // Store stage-specific data
    console.log(stageData);

    // const { data: { stages = [] } = {}, isLoading: stagesLoading } = useQuery({
    //     queryKey: ["stages", schoolId],
    //     queryFn: () => fetchStages(schoolId),
    //     enabled: !!schoolId,
    //     refetchOnWindowFocus: false,
    // });

    // const { data: { application } = {}, isLoading: appLoading } = useQuery({
    //     queryKey: ["application", applicationId, schoolId],
    //     queryFn: () => fetchApplication({ applicationId, schoolId }),
    //     enabled: !!schoolId && !!applicationId,
    //     refetchOnWindowFocus: false, //  disables auto-refetch
    // });
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
    console.log(stages, application);

    // useEffect(() => {
    //     console.log("schoolId:", schoolId, "applicationId:", applicationId);
    // }, [schoolId, applicationId]);
    // console.log('remounted');


    // useEffect(() => {
    //     if (application.currentStage.name === 'Rejected') {

    //     }
    // }, [application])
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

    const excludedStageIds = ["36bf836d-c63e-474b-9da5-e16909612ebf", "cca3c432-2650-44c0-95ad-14c9081d4b4e"];

    const filteredStages = stages.filter(
        (stage) => !excludedStageIds.includes(stage.id)
    );

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
    // const { Stepper } = defineStepper(
    //     ...filteredStages.map((stage) => ({
    //         id: stage.id,
    //         title: stage?.name,
    //         description: stage.description || "",
    //     }))
    // );
    const renderFieldsForStage = (stageName, methods) => {

        const handleStageDataChange = useCallback((field, value) => {
            setStageData(prev => ({ ...prev, [field]: value }));
        }, []);

        switch (stageName) {
            case "Pending Review":
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
                                // onClick={() => {
                                //     if (rejectedStage) {
                                //         // methods.goTo(rejectedStage.id);
                                //         handleStageDataChange("rejectionReason", "Rejected in initial review");
                                //         moveMutation.mutate({
                                //             id: applicationId,
                                //             stageId: 'cca3c432-2650-44c0-95ad-14c9081d4b4e',
                                //             movedById,
                                //             stageData,
                                //         });
                                //     } else {
                                //         toast.error("Rejected stage not found");
                                //     }
                                // }}
                                // disabled={!rejectedStage}
                                >
                                    Reject
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white shadow-none dark:bg-[#171717] w-[384px] h-fit p-0 text-foreground space-y-0 gap-0 rounded-md ">
                                <div>
                                    <DialogHeader className='border-b  h-min flex  justify-center px-3.5'>
                                        <DialogTitle className="flex py-3.5  text-lg tracking-tight leading-tight dark:text-white text-black font-semibold">
                                            {/* {title} */}
                                            Rejection Reason
                                            {/* Confirm deletion of kinzixinfotech@gmail.com's Project */}
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className='border-b  dark:text-white text-black h-min flex py-3.5   px-4'>
                                        {/* {description} */}
                                        Please provide a reason for rejection to help the applicant understand and maintain transparency
                                    </div>
                                    <div className="px-3.5 py-3.5">
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
                                    </div>
                                </div>
                                <DialogFooter className="flex flex-col py-5 px-4 gap-2 sm:flex-row justify-center items-center">
                                    <DialogClose asChild>
                                        <Button variant="outline" className="w-full cursor-pointer  dark:text-white text-black sm:w-auto">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant='destructive'
                                        className="w-full sm:w-auto bg-[#541c15] border-2 cursor-pointer  dark:text-white text-black border-[#541c15] hover:bg-[#e54d2e80] hover:border-red-600 hover:border-2 "
                                        // onClick={onConfirm}
                                        // disabled={loading}
                                        onClick={() => {
                                            if (rejectedStage) {
                                                // methods.goTo(rejectedStage.id);
                                                // handleStageDataChange("rejectionReason", "Rejected in initial review");
                                                console.log(stageData);

                                                moveMutation.mutate({
                                                    id: applicationId,
                                                    stageId: 'cca3c432-2650-44c0-95ad-14c9081d4b4e',
                                                    movedById,
                                                    stageData,
                                                });
                                            } else {
                                                toast.error("Rejected stage not found");
                                            }
                                        }}
                                        disabled={!rejectedStage}
                                    >
                                        Reject
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
            case "Test/Interview":
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
            case "Offer":
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
            case "Enrolled":
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5">
                <div className="flex flex-col gap-0.5 ">
                    {/* <h1 className="text-2xl font-bold">Registration Application</h1> */}
                    <span className="text-muted-foreground">Application ID: <span className="border-b-2">{applicationId}</span></span>
                    <span className="text-muted-foreground">Name: <span className="border-b-2">{application.applicantName}</span></span>
                    <span className="text-muted-foreground">Email: <span className="border-b-2">{application.applicantEmail}</span></span>
                    {/* stages[currentStageIndex].name */}
                    <span className="text-muted-foreground">
                        Submitted On:{" "}
                        <span className="border-b-2">
                            {new Date(application.submittedAt
                            ).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </span>
                    </span>
                    <span className="text-muted-foreground">Current Stage: <span className="border-b-2">{application.currentStage?.name}</span></span>

                </div>
                <div className="mt-2 sm:mt-0 space-x-2">
                    <Button variant="outline">Call Candidate</Button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-background p-4 rounded-md">
                <Stepper.Provider variant="horizontal" labelOrientation="vertical" initialStep={stages[currentStageIndex]?.id}>
                    {({ methods }) => (
                        <>
                            {application.currentStage.name === 'Rejected' ? (
                                <div className="flex  w-full h-max mt-4 p-4 bg-muted  border rounded-md  flex-col gap-2.5">
                                    <Alert variant="destructive"  >
                                        <AlertCircleIcon />

                                        <AlertTitle>Application Rejected.</AlertTitle>
                                        <AlertDescription>
                                            {/* <Input className='bg-background'
                                                placeholder="Enter rejection reason"
                                                value={stageData.rejectionReason || ""}
                                                onChange={(e) => handleStageDataChange("rejectionReason", e.target.value)}
                                            /> */}
                                            <p>Reason: {application.data?.[application.currentStage.id]?.rejectionReason}</p>

                                            {/* <ul className="list-inside list-disc text-sm">
                                                <li>Check your card details</li>
                                                <li>Ensure sufficient funds</li>
                                                <li>Verify billing address</li>
                                            </ul> */}
                                        </AlertDescription>

                                    </Alert>
                                    <div>
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                if (rejectedStage) {
                                                    // handleStageDataChange("activated", "Application Re-Activated");
                                                    moveMutation.mutate({
                                                        id: applicationId,
                                                        stageId: "884287a7-3e39-49ce-aa86-5f7e130befa9",
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
                                                    <Loader2 className="h-4 w-4 animate-spin" /> {/* from lucide-react */}
                                                    Activating...
                                                </span>
                                            ) : (
                                                "Activate"
                                            )}
                                        </Button>

                                    </div>
                                    {/* <span className="text-red-600 text-3xl font-normal">Application Rejected</span> */}

                                </div>
                            ) : (
                                <>
                                    <Stepper.Navigation className='border p-4 bg-muted  rounded-md overflow-x-auto overflow-hidden'>
                                        {methods.all.map((step) => (
                                            <Stepper.Step
                                                key={step.id}
                                                of={step.id}
                                                onClick={() => methods.goTo(step.id)}
                                                disabled={stages.findIndex(s => s.id === step.id) > currentStageIndex && !methods.isLast}
                                            >
                                                <Stepper.Title>{step.title}</Stepper.Title>
                                                <Stepper.Description>{step.description}</Stepper.Description>
                                            </Stepper.Step>
                                        ))}
                                    </Stepper.Navigation>

                                    <div className="mt-4 p-4 bg-muted border rounded-md">
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
