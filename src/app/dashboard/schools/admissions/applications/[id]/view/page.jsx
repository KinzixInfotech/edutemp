'use client'
// import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Star, X } from "lucide-react";
import { useParams } from "next/navigation";
import { defineStepper } from "@/components/stepper";
import { Fragment } from "react";


async function fetchJobApplication(jobId) {
    // Dummy data for now; replace with real API fetch in the future
    // const response = await fetch(`/api/job-applications/${jobId}`);
    // if (!response.ok) throw new Error("Failed to fetch job application");
    // return response.json();
    return {
        id: jobId,
        owner: "Kashish Bansal",
        candidateName: "Kashish Bansal",
        stage: "Offer Extended",
        offerAmount: "R 40,000.00",
        noticePeriod: "24 Hours",
    };
}

const { Stepper } = defineStepper(
    {
        id: "step-1",
        title: "Step 1",
        description: "This is the first step",
    },
    {
        id: "step-2",
        title: "Step 2",
        description: "This is the second step",
    },
    {
        id: "step-3",
        title: "Step 3",
        description: "This is the third step",
    }
);

// const Content = ({ id }) => {
//   return (
//     <Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
//       <p className="text-xl font-normal">Content for {id}</p>
//     </Stepper.Panel>
//   );
// };
export default function JobApplicationDetails() {
    // 1️⃣ Define steps (dynamic, reusable)
    // Define the steps
    // Hook with initial step
    const params = useParams();
    const jobId = params.jobId || "01";

    const { data, isLoading } = useQuery({
        queryKey: ["jobApplication", jobId],
        queryFn: () => fetchJobApplication(jobId),
    });

    return (
        <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold">Registration Application </h1>
                    <span className="text-muted-foreground">Application Id:<span className="border-b-2">{jobId}</span></span>
                </div>
                <div className="mt-2 sm:mt-0 space-x-2">
                    <Button variant="outline">Call Candidate</Button>
                    {/* <Button variant="outline"></Button> */}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-muted p-4 rounded-md">
                <Stepper.Provider className="space-y-4" variant="horizontal">
                    {({ methods }) => (
                        <>
                            <Stepper.Navigation>
                                {methods.all.map((step) => (
                                    <Stepper.Step
                                        key={step.id}
                                        of={step.id}
                                        onClick={() => methods.goTo(step.id)}
                                    >
                                        {step.title}
                                        <Stepper.Title className='text-blue-100'>{step.title}</Stepper.Title>
                                        <Stepper.Description>{step.description}</Stepper.Description>
                                    </Stepper.Step>
                                ))}
                            </Stepper.Navigation>
                            {/* {methods.switch({
                            "step-1": (step) => <Content id={step.id} />,
                            "step-2": (step) => <Content id={step.id} />,
                            "step-3": (step) => <Content id={step.id} />,
                        })} */}
                            <Stepper.Controls>
                                {!methods.isLast && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={methods.prev}
                                        disabled={methods.isFirst}
                                    >
                                        Previous
                                    </Button>
                                )}
                                <Button onClick={methods.isLast ? methods.reset : methods.next}>
                                    {methods.isLast ? "Reset" : "Next"}
                                </Button>
                            </Stepper.Controls>
                        </>
                    )}
                </Stepper.Provider>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold">Candidate Information</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <>
                                {Array(6)
                                    .fill(0)
                                    .map((_, index) => (
                                        <Skeleton key={index} className="h-6 w-full" />
                                    ))}
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center">
                                    <Label>Job Id</Label>
                                    <span>{data?.id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Owner</Label>
                                    <div className="flex items-center">
                                        <span>{data?.owner}</span>
                                        <Star className="ml-2 h-4 w-4 text-purple-500" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Candidate Name</Label>
                                    <span>{data?.candidateName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Stages</Label>
                                    <Badge>{data?.stage}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Offer Extended</Label>
                                    <span>{data?.offerAmount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Notice Period</Label>
                                    <span>{data?.noticePeriod}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold">Details</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <>
                                {Array(6)
                                    .fill(0)
                                    .map((_, index) => (
                                        <Skeleton key={index} className="h-6 w-full" />
                                    ))}
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center">
                                    <Label>Job Id</Label>
                                    <span>{data?.id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Owner</Label>
                                    <div className="flex items-center">
                                        <span>{data?.owner}</span>
                                        <Star className="ml-2 h-4 w-4 text-purple-500" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Candidate Name</Label>
                                    <span>{data?.candidateName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Stages</Label>
                                    <Badge>{data?.stage}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Offer Extended</Label>
                                    <span>{data?.offerAmount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label>Notice Period</Label>
                                    <span>{data?.noticePeriod}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}