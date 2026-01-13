"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
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
import FormFileUpload from "@/components/FormFileUpload";

export default function PublicFormPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);

    const [applicantName, setApplicantName] = useState("");
    const [applicantEmail, setApplicantEmail] = useState("");

    useEffect(() => {
        if (params.formId) fetchForm();
    }, [params.formId]);

    const fetchForm = async () => {
        try {
            const res = await axios.get(`/api/forms/${params.formId}/submit`);
            setForm(res.data);
            setLoading(false);
        } catch (error) {
            setError(error.response?.data?.error || "Failed to load form");
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!applicantName || !applicantEmail) {
            toast.error("Name and Email are required");
            return;
        }
        const missingFields = form.fields.filter(f => f.required && !formData[f.id]);
        if (missingFields.length > 0) {
            toast.error(`Please fill: ${missingFields.map(f => f.name).join(", ")}`);
            return;
        }
        setSubmitting(true);
        try {
            const submissionData = {};
            form.fields.forEach(field => {
                if (formData[field.id] !== undefined) {
                    // Use field ID as key to prevent duplicate name issues
                    submissionData[field.id] = formData[field.id];
                }
            });
            await axios.post(`/api/forms/${params.formId}/submit`, {
                applicantName,
                applicantEmail,
                data: submissionData
            });
            setSubmitted(true);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">Form Not Available</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    // Success State
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-sm"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank you!</h1>
                    <p className="text-slate-600 mb-8">Your response has been recorded successfully.</p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="rounded-full px-6"
                    >
                        Submit another response
                    </Button>
                </motion.div>
            </div>
        );
    }

    // Form UI
    return (
        <div className="min-h-screen bg-white">
            {/* Floating Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-900 truncate">{form.title}</h1>
                        {form.description && (
                            <p className="text-sm text-slate-500 truncate">{form.description}</p>
                        )}
                    </div>
                    {form.status !== "PUBLISHED" && (
                        <span className="ml-4 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                            {form.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Form Content */}
            <div className="max-w-2xl mx-auto px-6 py-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Identity Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="grid bg-muted px-4 py-4 rounded-2xl sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Your name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={applicantName}
                                    onChange={(e) => setApplicantName(e.target.value)}
                                    placeholder="John Doe"
                                    className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">
                                    Email address <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="email"
                                    value={applicantEmail}
                                    onChange={(e) => setApplicantEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                    required
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    {/* Questions */}
                    <div className="space-y-6 ">
                        {form.fields.map((field, index) => (
                            <motion.div
                                key={field.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group"
                            >
                                <div className="flex gap-4 bg-muted px-4 py-4 rounded-2xl">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <Label className="text-base font-medium text-slate-900">
                                            {field.name}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </Label>

                                        {/* Text Input */}
                                        {field.type === 'text' && (
                                            <Input
                                                value={formData[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                placeholder="Type your answer..."
                                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                            />
                                        )}

                                        {/* Textarea */}
                                        {field.type === 'textarea' && (
                                            <textarea
                                                value={formData[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                placeholder="Type your answer..."
                                                className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none"
                                            />
                                        )}

                                        {/* Email */}
                                        {field.type === 'email' && (
                                            <Input
                                                type="email"
                                                value={formData[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                placeholder="email@example.com"
                                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                            />
                                        )}

                                        {/* Number */}
                                        {field.type === 'number' && (
                                            <Input
                                                type="number"
                                                value={formData[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                placeholder="0"
                                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                            />
                                        )}

                                        {/* Date */}
                                        {field.type === 'date' && (
                                            <Input
                                                type="date"
                                                value={formData[field.id] || ""}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900"
                                            />
                                        )}

                                        {/* File */}
                                        {field.type === 'file' && (
                                            <FormFileUpload
                                                fieldId={field.id}
                                                fieldName={field.name}
                                                acceptedTypes={field.fileTypes || "all"}
                                                schoolId={form.schoolId}
                                                required={field.required}
                                                value={formData[field.id]?.url || null}
                                                onChange={(fileData) => handleInputChange(field.id, fileData)}
                                            />
                                        )}

                                        {/* Select */}
                                        {field.type === 'select' && (
                                            <Select
                                                value={formData[field.id] || ""}
                                                onValueChange={(val) => handleInputChange(field.id, val)}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:border-slate-900 focus:ring-slate-900">
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(field.options || []).map((opt, i) => (
                                                        <SelectItem key={`${field.id}-${i}`} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {/* Radio */}
                                        {field.type === 'radio' && (
                                            <RadioGroup
                                                name={`radio-${field.id}`}
                                                value={formData[field.id] || ""}
                                                onValueChange={(val) => handleInputChange(field.id, val)}
                                                className="space-y-2"
                                            >
                                                {(field.options || []).map((opt, i) => (
                                                    <label
                                                        key={`${field.id}-r-${i}`}
                                                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData[field.id] === opt
                                                            ? 'border-slate-900 bg-slate-50'
                                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                                            }`}
                                                    >
                                                        <RadioGroupItem value={opt} id={`${field.id}-r-${i}`} />
                                                        <span className="text-slate-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </RadioGroup>
                                        )}

                                        {/* Checkbox */}
                                        {field.type === 'checkbox' && (
                                            <div className="space-y-2">
                                                {(field.options || []).map((opt, i) => {
                                                    const isChecked = (formData[field.id] || []).includes(opt);
                                                    return (
                                                        <label
                                                            key={`${field.id}-c-${i}`}
                                                            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isChecked
                                                                ? 'border-slate-900 bg-slate-50'
                                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                                                }`}
                                                        >
                                                            <Checkbox
                                                                id={`${field.id}-c-${i}`}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    const current = formData[field.id] || [];
                                                                    handleInputChange(field.id, checked
                                                                        ? [...current, opt]
                                                                        : current.filter(v => v !== opt)
                                                                    );
                                                                }}
                                                            />
                                                            <span className="text-slate-700">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="pt-6"
                    >
                        <Button
                            type="submit"
                            disabled={submitting || !form.isAccepting}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Response
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </motion.div>
                </form>
            </div>
        </div>
    );
}
