"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, ChevronRight, School } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
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
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f5f8" }}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0052ff" }} />
                    <p className="text-sm text-slate-500">Loading form...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#f5f5f8" }}>
                <div className="text-center max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Form Not Available</h1>
                    <p className="text-slate-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // Success State
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#f5f5f8" }}>
                <div className="text-center max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
                    {form?.school && (
                        <div className="flex items-center justify-center gap-2.5 mb-6">
                            {form.school.profilePicture ? (
                                <img
                                    src={form.school.profilePicture}
                                    alt={form.school.name}
                                    className="w-8 h-8 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: "#0052ff" }}>
                                    {form.school.name?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                            <span className="text-sm font-semibold text-slate-700">{form.school.name}</span>
                        </div>
                    )}
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Application Submitted!</h1>
                    <p className="text-slate-500 text-sm mb-8">Your response has been recorded successfully. We'll be in touch soon.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                    >
                        Submit another response
                    </button>
                </div>
            </div>
        );
    }

    // Form UI
    return (
        <div className="min-h-screen font-[Inter,sans-serif]" style={{ backgroundColor: "#f5f5f8" }}>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {form.school?.profilePicture ? (
                        <img
                            src={form.school.profilePicture}
                            alt={form.school.name}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: "#0052ff" }}>
                            {form.school?.name?.charAt(0)?.toUpperCase() ?? <School size={18} />}
                        </div>
                    )}
                    <h2 className="text-slate-900 text-lg font-bold tracking-tight">
                        {form.school?.name || "School Portal"}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    {form.status !== "PUBLISHED" && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                            {form.status}
                        </span>
                    )}
                    <span className="hidden md:block text-sm text-slate-500 font-medium">
                        {form.category ? `${form.category.charAt(0) + form.category.slice(1).toLowerCase()} Portal` : "Application Portal"}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex justify-center py-10 px-4 md:px-10">
                <div className="w-full max-w-[720px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Top color band */}
                    <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #0052ff 0%, #338bff 100%)" }} />

                    {/* Form header */}
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight mb-2">
                                    {form.title}
                                </h1>
                                {form.description && (
                                    <p className="text-slate-500 text-base">{form.description}</p>
                                )}
                            </div>
                            {form.isAccepting && (
                                <span className="flex-shrink-0 px-3 py-1 text-white text-xs font-bold uppercase tracking-wider rounded-full mt-1" style={{ backgroundColor: "#0052ff" }}>
                                    Open
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="p-8">

                        {/* Draft / Closed Notice */}
                        {!form.isAccepting && (
                            <div className="mb-8 flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">
                                        {form.status === "DRAFT" ? "Form is not published yet" : "This form is closed"}
                                    </p>
                                    <p className="text-xs mt-0.5 text-amber-700">
                                        {form.status === "DRAFT"
                                            ? "This form is in draft mode. Submissions are disabled until the school publishes it."
                                            : "This form is no longer accepting responses."}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Applicant Identity */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Applicant Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-slate-900 text-sm font-semibold">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={applicantName}
                                            onChange={(e) => setApplicantName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-slate-900 text-sm font-semibold">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={applicantEmail}
                                            onChange={(e) => setApplicantEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-slate-100" />

                            {/* Dynamic Fields */}
                            {form.fields.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">Form Questions</p>
                                    <div className="space-y-6">
                                        {form.fields.map((field, index) => (
                                            <div key={field.id} className="flex flex-col gap-2">
                                                <label className="text-slate-900 text-sm font-semibold">
                                                    {field.name}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>

                                                {/* Text */}
                                                {field.type === 'text' && (
                                                    <input
                                                        value={formData[field.id] || ""}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        placeholder="Type your answer..."
                                                        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
                                                    />
                                                )}

                                                {/* Textarea */}
                                                {field.type === 'textarea' && (
                                                    <>
                                                        <textarea
                                                            value={formData[field.id] || ""}
                                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                            placeholder="Type your answer..."
                                                            className="w-full min-h-[140px] px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 resize-none transition-all"
                                                        />
                                                        <p className="text-xs text-slate-400">Be as detailed as possible.</p>
                                                    </>
                                                )}

                                                {/* Email */}
                                                {field.type === 'email' && (
                                                    <input
                                                        type="email"
                                                        value={formData[field.id] || ""}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        placeholder="email@example.com"
                                                        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
                                                    />
                                                )}

                                                {/* Number */}
                                                {field.type === 'number' && (
                                                    <input
                                                        type="number"
                                                        value={formData[field.id] || ""}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
                                                    />
                                                )}

                                                {/* Date */}
                                                {field.type === 'date' && (
                                                    <input
                                                        type="date"
                                                        value={formData[field.id] || ""}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 text-sm focus:outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/20 transition-all"
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
                                                        <SelectTrigger className="h-12 rounded-lg border-slate-200 bg-white focus:border-[#0052ff] focus:ring-[#0052ff]/20">
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
                                                    <div className="flex flex-wrap gap-3">
                                                        {(field.options || []).map((opt, i) => (
                                                            <label
                                                                key={`${field.id}-r-${i}`}
                                                                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm font-medium ${formData[field.id] === opt
                                                                        ? 'border-[#0052ff] bg-blue-50 text-[#0052ff]'
                                                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0052ff]/40'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`radio-${field.id}`}
                                                                    value={opt}
                                                                    checked={formData[field.id] === opt}
                                                                    onChange={() => handleInputChange(field.id, opt)}
                                                                    className="accent-[#0052ff]"
                                                                />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Checkbox */}
                                                {field.type === 'checkbox' && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {(field.options || []).map((opt, i) => {
                                                            const isChecked = (formData[field.id] || []).includes(opt);
                                                            return (
                                                                <label
                                                                    key={`${field.id}-c-${i}`}
                                                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm font-medium ${isChecked
                                                                            ? 'border-[#0052ff] bg-blue-50 text-[#0052ff]'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0052ff]/40'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const current = formData[field.id] || [];
                                                                            handleInputChange(field.id, e.target.checked
                                                                                ? [...current, opt]
                                                                                : current.filter(v => v !== opt)
                                                                            );
                                                                        }}
                                                                        className="accent-[#0052ff] rounded"
                                                                    />
                                                                    {opt}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer / Submit */}
                            <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                                <p className="text-xs text-slate-400 max-w-xs text-center md:text-left">
                                    By submitting, you confirm that the information provided is accurate and complete.
                                </p>
                                <button
                                    type="submit"
                                    disabled={submitting || !form.isAccepting}
                                    className="w-full md:w-auto px-10 py-3 rounded-lg text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{ backgroundColor: form.isAccepting ? "#0052ff" : undefined }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : !form.isAccepting ? (
                                        <>
                                            <AlertCircle className="w-4 h-4" />
                                            Submissions Disabled
                                        </>
                                    ) : (
                                        <>
                                            Submit Application
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 px-6 text-center text-slate-400 text-sm">
                <p>
                    {form.school?.name
                        ? `© ${new Date().getFullYear()} ${form.school.name}. All rights reserved.`
                        : `© ${new Date().getFullYear()} School Portal. All rights reserved.`}
                </p>
            </footer>

        </div>
    );
}
