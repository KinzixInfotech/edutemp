"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, Building2, User, MapPin, Lock, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Validation Schema
const registrationSchema = z.object({
    // Account Info
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),

    // Contact Info
    contactPerson: z.string().min(2, "Contact person name is required"),
    contactPhone: z.string().min(10, "Valid phone number is required"),

    // Business Info
    companyName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),

    // Role
    role: z.enum(["AFFILIATE", "RESELLER", "ENTERPRISE"]).default("AFFILIATE"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function PartnerRegistrationPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // Multi-step form feel

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
    } = useForm({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            role: "AFFILIATE",
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/partners/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Registration failed");
            }

            toast.success("Registration Successful!", {
                description: "Your partner account has been created. Please wait for admin approval.",
            });

            // Redirect or show success state
            setTimeout(() => router.push("/login"), 2000);
        } catch (error) {
            toast.error("Registration Failed", {
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = async () => {
        const fieldsToValidate = step === 1
            ? ["name", "email", "password", "confirmPassword"]
            : ["contactPerson", "contactPhone"];

        const isValid = await trigger(fieldsToValidate);
        if (isValid) setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4 lg:pt-0 pt-20 sm:p-6 lg:p-8 overflow-hidden relative">

            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: '#0c65f1' }} />
                <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-15 animate-pulse" style={{ backgroundColor: '#0c65f1', animationDelay: '1s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >

                {/* Left Side - Hero/Info */}
                <div className="w-full md:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">EduBreezy Partners</span>
                        </div>

                        <h1 className="text-3xl font-bold mb-4 leading-tight">
                            Grow with us. <br />
                            <span className="text-blue-200">Earn with us.</span>
                        </h1>
                        <p className="text-blue-100 text-sm leading-relaxed opacity-90">
                            Join our partner program to bring modern education management to schools everywhere. Earn competitive commissions and make a difference.
                        </p>
                    </div>

                    <div className="relative z-10 mt-12 space-y-4">
                        <div className="flex items-center gap-3 text-sm text-blue-100">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span>High Commission Rates</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-blue-100">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span>Marketing Support</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-blue-100">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span>Real-time Analytics</span>
                        </div>
                    </div>

                    {/* Decorative Circles */}
                    <div className="absolute top-1/2 right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-blue-500/20 rounded-full blur-xl" />
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-3/5 p-8 lg:p-12 bg-white relative">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Create Partner Account</h2>
                            <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                Step {step} of 3
                            </div>
                        </div>
                        <p className="text-gray-500 text-sm">Fill in your details to get started.</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
                        <motion.div
                            className="h-full bg-[#0c65f1]"
                            initial={{ width: "33%" }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <AnimatePresence mode="wait">

                            {/* STEP 1: Account Info */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                            <input
                                                {...register("name")}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Email Address</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                            <input
                                                {...register("email")}
                                                type="email"
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                                <input
                                                    {...register("password")}
                                                    type="password"
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Confirm</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                                <input
                                                    {...register("confirmPassword")}
                                                    type="password"
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: Contact Info */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Contact Person</label>
                                        <input
                                            {...register("contactPerson")}
                                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                            placeholder="Who should we contact?"
                                        />
                                        {errors.contactPerson && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contactPerson.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                                        <input
                                            {...register("contactPhone")}
                                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                            placeholder="+91 98765 43210"
                                        />
                                        {errors.contactPhone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.contactPhone.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Company Name (Optional)</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                            <input
                                                {...register("companyName")}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="Acme Corp"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: Business Details */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700">Address</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                            <textarea
                                                {...register("address")}
                                                rows={2}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium resize-none"
                                                placeholder="Street Address"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">City</label>
                                            <input
                                                {...register("city")}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">State</label>
                                            <input
                                                {...register("state")}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="State"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Postal Code</label>
                                            <input
                                                {...register("postalCode")}
                                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all font-medium"
                                                placeholder="123456"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700">Partner Type</label>
                                            <div className="relative">
                                                <select
                                                    {...register("role")}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-[#0c65f1] focus:bg-white transition-all appearance-none font-medium"
                                                >
                                                    <option value="AFFILIATE">Affiliate</option>
                                                    <option value="RESELLER">Reseller</option>
                                                    <option value="ENTERPRISE">Enterprise</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors font-bold"
                                >
                                    Back
                                </button>
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-1 bg-gradient-to-r from-[#0c65f1] to-[#0a52c6] hover:shadow-lg hover:scale-[1.02] text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                                >
                                    Next Step
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-gradient-to-r from-[#0c65f1] to-[#0a52c6] hover:shadow-lg hover:scale-[1.02] text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            Complete Registration
                                            <CheckCircle className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{" "}
                            <a href="/login" className="text-[#0c65f1] hover:text-blue-700 transition-colors font-bold hover:underline">
                                Sign in
                            </a>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
