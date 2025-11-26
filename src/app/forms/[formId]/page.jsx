"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function PublicFormPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);

    // Special fields for identification
    const [applicantName, setApplicantName] = useState("");
    const [applicantEmail, setApplicantEmail] = useState("");

    useEffect(() => {
        if (params.formId) {
            fetchForm();
        }
    }, [params.formId]);

    const fetchForm = async () => {
        try {
            const res = await axios.get(`/api/forms/${params.formId}/submit`);
            setForm(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching form:", error);
            setError(error.response?.data?.error || "Failed to load form");
            setLoading(false);
        }
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!applicantName || !applicantEmail) {
            toast.error("Name and Email are required");
            return;
        }

        // Validate required fields
        const missingFields = form.fields.filter(f => f.required && !formData[f.name]);
        if (missingFields.length > 0) {
            toast.error(`Please fill in all required fields: ${missingFields.map(f => f.name).join(", ")}`);
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`/api/forms/${params.formId}/submit`, {
                applicantName,
                applicantEmail,
                data: formData
            });
            setSubmitted(true);
            toast.success("Form submitted successfully!");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(error.response?.data?.error || "Failed to submit form");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="max-w-md w-full border-destructive/50">
                        <CardContent className="pt-6 text-center">
                            <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4 w-fit">
                                <AlertCircle className="h-10 w-10 text-destructive" />
                            </div>
                            <h2 className="text-2xl font-semibold text-destructive mb-2">Error</h2>
                            <p className="text-muted-foreground">{error}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="max-w-md w-full">
                        <CardContent className="pt-8 pb-8 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-6 w-fit"
                            >
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </motion.div>
                            <h2 className="text-3xl font-semibold text-green-700 dark:text-green-400 mb-2">Thank You!</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                Your submission has been received successfully.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => window.location.reload()}
                            >
                                Submit Another Response
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header - matching exam style */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-normal text-gray-800">{form.title}</h1>
                            {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
                        </div>
                        {!form.isAccepting && (
                            <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-1 rounded-md border border-yellow-200">
                                {form.status}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content - matching exam/builder style */}
            <main className="flex-1 py-8 overflow-y-auto bg-gray-50">
                <div className="max-w-4xl mx-auto px-6 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info Card */}
                        <Card className="border-l-4 border-l-primary bg-white">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="font-bold text-lg text-muted-foreground">*</div>
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="applicantName" className="text-base font-medium text-gray-800">
                                                Full Name <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="applicantName"
                                                value={applicantName}
                                                onChange={(e) => setApplicantName(e.target.value)}
                                                placeholder="Enter your full name"
                                                required
                                                className="border-gray-300 focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="applicantEmail" className="text-base font-medium text-gray-800">
                                                Email Address <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="applicantEmail"
                                                type="email"
                                                value={applicantEmail}
                                                onChange={(e) => setApplicantEmail(e.target.value)}
                                                placeholder="Enter your email"
                                                required
                                                className="border-gray-300 focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dynamic Fields */}
                        {form.fields.map((field, index) => (
                            <Card key={field.id} className="border-l-4 border-l-primary bg-white">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="font-bold text-lg text-muted-foreground">{index + 1}.</div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <Label className="text-lg font-medium text-gray-800">
                                                    {field.name}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </Label>
                                            </div>

                                            {field.type === 'text' && (
                                                <Input
                                                    value={formData[field.name] || ""}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    placeholder="Your answer"
                                                    required={field.required}
                                                    className="border-gray-300 focus:ring-2 focus:ring-primary/20"
                                                />
                                            )}

                                            {field.type === 'textarea' && (
                                                <textarea
                                                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                    placeholder="Type your answer here..."
                                                    value={formData[field.name] || ""}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    required={field.required}
                                                />
                                            )}

                                            {field.type === 'email' && (
                                                <Input
                                                    type="email"
                                                    value={formData[field.name] || ""}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    placeholder="Your email"
                                                    required={field.required}
                                                    className="border-gray-300 focus:ring-2 focus:ring-primary/20"
                                                />
                                            )}

                                            {field.type === 'number' && (
                                                <Input
                                                    type="number"
                                                    value={formData[field.name] || ""}
                                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                                    placeholder="Number"
                                                    required={field.required}
                                                    className="border-gray-300 focus:ring-2 focus:ring-primary/20"
                                                />
                                            )}

                                            {field.type === 'select' && (
                                                <Select
                                                    value={formData[field.name] || ""}
                                                    onValueChange={(val) => handleInputChange(field.name, val)}
                                                    required={field.required}
                                                >
                                                    <SelectTrigger className="border-gray-300">
                                                        <SelectValue placeholder="Select an option" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(field.options || []).map((opt, idx) => (
                                                            <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {field.type === 'radio' && (
                                                <RadioGroup
                                                    value={formData[field.name] || ""}
                                                    onValueChange={(val) => handleInputChange(field.name, val)}
                                                    required={field.required}
                                                    className="space-y-2 pl-2"
                                                >
                                                    {(field.options || []).map((opt, idx) => (
                                                        <div key={idx} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`${field.id}-${idx}`} />
                                                            <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-pointer">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}

                                            {field.type === 'checkbox' && (
                                                <div className="space-y-2 pl-2">
                                                    {(field.options || []).map((opt, idx) => (
                                                        <div key={idx} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`${field.id}-${idx}`}
                                                                checked={(formData[field.name] || []).includes(opt)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = formData[field.name] || [];
                                                                    if (checked) {
                                                                        handleInputChange(field.name, [...current, opt]);
                                                                    } else {
                                                                        handleInputChange(field.name, current.filter(v => v !== opt));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-pointer">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={submitting || !form.isAccepting}
                                className="bg-primary hover:bg-primary/90"
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
