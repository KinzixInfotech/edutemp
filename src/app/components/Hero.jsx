'use client';

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { useRouter } from "next/navigation";

const Hero = () => {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState("");
    const [schoolFound, setSchoolFound] = useState(null); // Store found school data

    const handleContinue = async () => {
        if (!code) return;

        setIsChecking(true);
        setError("");
        setSchoolFound(null);

        try {
            const fullCode = `EB-${code}`;
            const res = await fetch(`/api/schools/by-code?schoolcode=${fullCode}`);
            const data = await res.json();

            if (res.ok && data.school) {
                // School found - store in sessionStorage and redirect
                setSchoolFound(data.school);
                sessionStorage.setItem('loginSchool', JSON.stringify(data.school));

                // Short delay to show success state, then redirect
                setTimeout(() => {
                    router.push(`/login?schoolCode=${fullCode}`);
                }, 500);
            } else {
                setError("School not found. Please check your code and try again.");
            }
        } catch (err) {
            console.error("Error checking school:", err);
            setError("Unable to verify school. Please try again.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && code) {
            handleContinue();
        }
    };

    return (
        <section className="relative min-h-screen mt-18 border-b flex overflow-hidden bg-white">
            {/* LEFT SIDE - Decorative */}
            <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#f5f7fa]">
                {/* Interactive Grid Pattern Background */}
                <InteractiveGridPattern
                    className="absolute opacity-50 inset-0 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_20%,transparent_70%)]"
                    squares={[40, 40]}
                />

                {/* Large Background Text "ERP" */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(10rem,22vw,20rem)] font-black text-gray-200/50 leading-none tracking-tighter">
                        ERP
                    </span>
                </div>

                {/* Center Content */}
                <div className="relative z-10 text-center px-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        School Login Portal
                    </h2>
                    <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto">
                        Access your school's complete management system with your unique school code
                    </p>
                </div>

            </div>

            {/* RIGHT SIDE - Login Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-0">
                <div className="w-full max-w-md">
                    {/* Clean Form - No Card */}
                    <div className="space-y-5">
                        <label className="block text-sm font-semibold text-[#1a1a2e]">
                            School Code *
                        </label>

                        {/* Input Group */}
                        <div className={`flex items-center gap-3 bg-[#f8f9fb] border rounded-xl px-4 py-4 transition-all ${error
                                ? 'border-red-300 ring-2 ring-red-100'
                                : schoolFound
                                    ? 'border-green-300 ring-2 ring-green-100'
                                    : 'border-gray-200 focus-within:ring-2 focus-within:ring-[#0569ff]/20 focus-within:border-[#0569ff]'
                            }`}>
                            <div className="text-white px-4 py-2 rounded-lg font-bold text-sm bg-[#0569ff] shrink-0">
                                EB -
                            </div>
                            <input
                                type="text"
                                placeholder="Enter code (e.g., 0001)"
                                value={code}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    setCode(value);
                                    setError(""); // Clear error on input change
                                    setSchoolFound(null);
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={isChecking}
                                className="flex-1 bg-transparent text-lg font-semibold outline-none text-[#1a1a2e] placeholder:text-gray-400 placeholder:font-normal disabled:opacity-50"
                            />
                            {/* Status Icons */}
                            {isChecking && (
                                <Loader2 className="w-5 h-5 text-[#0569ff] animate-spin shrink-0" />
                            )}
                            {schoolFound && !isChecking && (
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message - School Found */}
                        {schoolFound && !isChecking && (
                            <div className="flex items-center gap-3 text-green-700 text-sm bg-green-50 px-4 py-3 rounded-lg">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">{schoolFound.name}</p>
                                    <p className="text-green-600 text-xs">Redirecting to login...</p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleContinue}
                            disabled={!code || isChecking}
                            className={`group w-full relative px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 overflow-hidden flex items-center justify-center gap-3 ${code && !isChecking
                                    ? 'bg-[#0569ff] text-white shadow-[0_4px_20px_rgba(5,105,255,0.3)] hover:shadow-[0_8px_30px_rgba(5,105,255,0.4)]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {code && !isChecking && (
                                <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            )}

                            {isChecking ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Checking...</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative">Continue</span>
                                    {code && (
                                        <ArrowRight className="relative w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                                    )}
                                </>
                            )}
                        </button>

                        {/* Helper Text */}
                        <p className="text-sm text-gray-500 text-center">
                            Don't know your code?{" "}
                            <Link href="/contact" className="font-semibold text-[#0569ff] hover:underline">
                                Contact your school administration
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;