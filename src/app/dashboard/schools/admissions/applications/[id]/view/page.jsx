
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { defineStepper } from "@/components/stepper";
import LoaderPage from "@/components/loader-page";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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

export default function ApplicationDetails() {
    const params = useParams();
    const applicationId = params.id;
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;

    const [stageData, setStageData] = useState({}); // Store stage-specific data

    const { data: { stages = [] } = {}, isLoading: stagesLoading } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: () => fetchStages(schoolId),
        enabled: !!schoolId,
    });

    const { data: { application } = {}, isLoading: appLoading } = useQuery({
        queryKey: ["application", applicationId, schoolId],
        queryFn: () => fetchApplication({ applicationId, schoolId }),
        enabled: !!schoolId && !!applicationId,
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

    const excludedStageIds = ["36bf836d-c63e-474b-9da5-e16909612ebf", "cca3c432-2650-44c0-95ad-14c9081d4b4e"];

    const filteredStages = stages.filter(
        (stage) => !excludedStageIds.includes(stage.id)
    );

    const currentStageIndex = filteredStages.findIndex(
        (stage) => stage.id === application.currentStage.id
    );


    // Dynamically define stepper steps based on stages
    // const { Stepper } = defineStepper(...stages.map(stage => ({
    //     id: stage.id,
    //     title: stage.name,
    //     description: stage.description || "",
    // })));

    const { Stepper } = defineStepper(
        ...filteredStages.map((stage) => ({
            id: stage.id,
            title: stage.name,
            description: stage.description || "",
        }))
    );
    const renderFieldsForStage = (stageName) => {
        const handleStageDataChange = (field, value) => {
            setStageData(prev => ({ ...prev, [field]: value }));
        };

        switch (stageName) {
            case "Pending Review":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Applicant Name</Label>
                            <Input value={application.applicantName} disabled />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input value={application.applicantEmail} disabled />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
                                placeholder="Add comments"
                                value={stageData.notes || ""}
                                onChange={(e) => handleStageDataChange("notes", e.target.value)}
                            />
                        </div>
                    </div>
                );
            case "Shortlisted":
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Eligibility Notes</Label>
                            <Input
                                placeholder="Enter eligibility notes"
                                value={stageData.eligibilityNotes || ""}
                                onChange={(e) => handleStageDataChange("eligibilityNotes", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Test Score</Label>
                            <Input
                                type="number"
                                placeholder="Enter test score"
                                value={stageData.testScore || ""}
                                onChange={(e) => handleStageDataChange("testScore", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Interview Date</Label>
                            <Input
                                type="date"
                                value={stageData.interviewDate || ""}
                                onChange={(e) => handleStageDataChange("interviewDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Offer Amount</Label>
                            <Input
                                placeholder="Enter offer amount"
                                value={stageData.offerAmount || application.offerAmount || ""}
                                onChange={(e) => handleStageDataChange("offerAmount", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Notice Period</Label>
                            <Input
                                placeholder="Enter notice period"
                                value={stageData.noticePeriod || application.noticePeriod || ""}
                                onChange={(e) => handleStageDataChange("noticePeriod", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Fee Status</Label>
                            <Input
                                placeholder="Enter fee status"
                                value={stageData.feeStatus || ""}
                                onChange={(e) => handleStageDataChange("feeStatus", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Class Assigned</Label>
                            <Input
                                placeholder="Enter class assigned"
                                value={stageData.classAssigned || ""}
                                onChange={(e) => handleStageDataChange("classAssigned", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Roll Number</Label>
                            <Input
                                placeholder="Enter roll number"
                                value={stageData.rollNumber || ""}
                                onChange={(e) => handleStageDataChange("rollNumber", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Waitlist Position</Label>
                            <Input
                                placeholder="Enter waitlist position"
                                value={stageData.waitlistPosition || ""}
                                onChange={(e) => handleStageDataChange("waitlistPosition", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
                            <Label>Rejection Reason</Label>
                            <Input
                                placeholder="Enter rejection reason"
                                value={stageData.rejectionReason || ""}
                                onChange={(e) => handleStageDataChange("rejectionReason", e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Comments</Label>
                            <Input
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold">Registration Application</h1>
                    <span className="text-muted-foreground">Application ID: <span className="border-b-2">{applicationId}</span></span>
                </div>
                <div className="mt-2 sm:mt-0 space-x-2">
                    <Button variant="outline">Call Candidate</Button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-muted p-4 rounded-md">
                <Stepper.Provider variant="horizontal" labelOrientation="vertical" initialStep={stages[currentStageIndex]?.id}>
                    {({ methods }) => (
                        <>
                            <Stepper.Navigation>
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
                            <div className="mt-4 p-4  rounded-md">
                                {renderFieldsForStage(methods.current.title)}
                            </div>
                            <Stepper.Controls className="mt-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={methods.prev}
                                    disabled={methods.isFirst}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={methods.isLast ? methods.reset : methods.next}
                                    disabled={methods.isLast}
                                >
                                    {methods.isLast ? "Reset" : "Next"}
                                </Button>
                                <Button
                                    onClick={() => {
                                        moveMutation.mutate({
                                            id: applicationId,
                                            stageId: methods.current.id,
                                            movedById,
                                            stageData,
                                        });
                                    }}
                                    disabled={application.currentStage.id === methods.current.id}
                                >
                                    Save
                                </Button>
                            </Stepper.Controls>
                        </>
                    )}
                </Stepper.Provider>
            </div>
        </div>
    );
}
