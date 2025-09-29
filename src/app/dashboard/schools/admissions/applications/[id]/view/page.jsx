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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
                                        {/* {step.title} */}
                                        <Stepper.Title>{step.title}</Stepper.Title>
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
            <div>
                <div className="overflow-x-auto rounded-lg border w-full">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="bg-muted sticky top-0 z-10">
                                <TableHead>#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Fields</TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* {formsLoading ? (
                                Array(6).fill(0).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : forms.length > 0 ? (
                                forms.map((form, index) => (
                                    <TableRow key={form.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{form.name}</TableCell>
                                        <TableCell>{form.description}</TableCell>
                                        <TableCell>{form.fields.length}</TableCell>
                                        <TableCell>{form.slug ? `/admissions/${form.slug}` : "Not generated"}</TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEditForm(form)}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteForm(form.id)}>Delete</Button>
                                            <Button size="sm" variant="outline" onClick={() => handleGenerateLink(form.id)}>Generate Link</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">No forms found.</TableCell>
                                </TableRow>
                            )} */}
                            <TableRow>
                                <TableCell>
                                    5
                                </TableCell>
                                <TableCell>
                                    Mansha Jami
                                </TableCell>
                                <TableCell>
                                    Mansha Jami
                                </TableCell>
                                <TableCell>
                                    Mansha Jami
                                </TableCell>
                                <TableCell>
                                    Mansha Jami
                                </TableCell>
                                <TableCell>
                                    Mansha Jami
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}