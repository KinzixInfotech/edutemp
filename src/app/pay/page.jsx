'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertCircle, Shield, Wallet } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Turnstile from 'react-turnstile';

export default function PayPage() {
    const router = useRouter();

    // School code dialog state
    const [showSchoolDialog, setShowSchoolDialog] = useState(true);
    const [schoolCodeInput, setSchoolCodeInput] = useState('');
    const [schoolCodeError, setSchoolCodeError] = useState('');
    const [schoolCodeLoading, setSchoolCodeLoading] = useState(false);

    // School data
    const [school, setSchool] = useState(null);

    // Login form state
    const [admissionNo, setAdmissionNo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [academicYearId, setAcademicYearId] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch academic years when school is set
    const { data: academicYears } = useQuery({
        queryKey: ['pay-academic-years', school?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${school.id}/academic-years`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            return data.academicYears || data;
        },
        enabled: !!school?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Set default academic year
    useEffect(() => {
        if (academicYears?.length > 0 && !academicYearId) {
            const current = academicYears.find(ay => ay.isCurrent) || academicYears[0];
            setAcademicYearId(current.id);
        }
    }, [academicYears, academicYearId]);

    // Handle school code submit
    const handleSchoolCodeSubmit = async (e) => {
        e.preventDefault();
        if (!schoolCodeInput.trim()) {
            setSchoolCodeError('Please enter your school code');
            return;
        }

        setSchoolCodeLoading(true);
        setSchoolCodeError('');

        try {
            // Add EB- prefix if not already present
            let fullCode = schoolCodeInput.trim().toUpperCase();
            if (!fullCode.startsWith('EB-')) {
                fullCode = `EB-${fullCode}`;
            }

            const res = await fetch(`/api/schools/by-code?schoolcode=${fullCode}`);
            const data = await res.json();

            if (!res.ok) {
                setSchoolCodeError(data.error || 'Invalid School Code. Please check and try again.');
                setSchoolCodeLoading(false);
                return;
            }

            setSchool(data.school);
            setShowSchoolDialog(false);
        } catch (err) {
            setSchoolCodeError('Something went wrong. Please try again.');
        } finally {
            setSchoolCodeLoading(false);
        }
    };

    // Handle login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!admissionNo.trim()) {
            setError('Please enter your User Id/Admission Number');
            return;
        }

        if (!academicYearId) {
            setError('Please select a session');
            return;
        }

        if (!turnstileToken) {
            toast.error('Please complete the security check');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/pay/student-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: school.id,
                    admissionNo: admissionNo.trim(),
                    password: password || undefined,
                    academicYearId,
                    turnstileToken,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed. Please check your details.');
                setLoading(false);
                setTurnstileKey(Date.now());
                setTurnstileToken('');
                return;
            }

            // Store session token and redirect
            sessionStorage.setItem('paySession', JSON.stringify({
                token: data.token,
                studentId: data.student.userId,
                schoolId: school.id,
                academicYearId,
                expiresAt: data.expiresAt,
            }));

            toast.success(`Welcome, ${data.student.name}!`);
            router.push('/pay/dashboard');

        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
            // Reset Turnstile on error
            setTurnstileKey(Date.now());
            setTurnstileToken('');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Top Left Logo */}
            <div className="absolute top-6 left-6 z-20">
                <Image src="/pay.png" alt="Pay" width={180} height={60} className="h-12 w-auto" />
            </div>

            {/* Bottom Right Logo */}
            <div className="absolute bottom-6 right-6 z-20">
                <Image src="/kinzix-black.webp" alt="Kinzix" width={280} height={80} className="h-20 w-auto opacity-50" />
            </div>

            {/* Interactive Grid Pattern Background */}
            <InteractiveGridPattern
                width={50}
                height={50}
                squares={[40, 20]}
                className="opacity-30 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
                squaresClassName="stroke-gray-300/50 hover:fill-blue-100/40"
            />

            <div className="w-full max-w-[1100px] h-[650px] bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 overflow-hidden flex relative z-10">

                {/* Left Side - Visual Branding */}
                <div className="w-[55%] relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-blue-600">
                    {/* Background Image / Overlay */}
                    {school?.profilePicture ? (
                        <>
                            <Image
                                src={school.profilePicture}
                                alt={school.name}
                                fill
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-black/30 mix-blend-multiply" />
                            <div className="absolute inset-0 bg-blue-600/20 mix-blend-color" />
                        </>
                    ) : (
                        <>
                            {/* Default gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0569ff] to-[#0246b5]" />
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                            </div>
                        </>
                    )}

                    {/* Branding Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="pt-8">
                            {/* School Logo */}
                            {(school?.publicProfile?.logoImage || school?.profilePicture) ? (
                                <img
                                    src={school?.publicProfile?.logoImage || school?.profilePicture}
                                    alt="Logo"
                                    className="h-16 w-auto mb-6 bg-white/10 backdrop-blur-md rounded-xl p-2 object-contain"
                                />
                            ) : (
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                                    <Wallet className="w-8 h-8 text-white" />
                                </div>
                            )}

                            {/* School Name or Default */}
                            <h1 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-sm">
                                {school?.name || "Fee Payment Portal"}
                            </h1>

                            {/* Tagline or Description */}
                            {school?.publicProfile?.tagline ? (
                                <p className="text-blue-100 text-lg italic max-w-md border-l-4 border-white/30 pl-4 py-1">
                                    "{school.publicProfile.tagline}"
                                </p>
                            ) : school?.location ? (
                                <p className="text-blue-100 text-base max-w-md">
                                    {school.location}
                                </p>
                            ) : (
                                <p className="text-blue-100 text-lg max-w-md">
                                    Pay your school fees securely online.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Description if available */}
                            {school?.publicProfile?.description ? (
                                <p className="text-white/80 leading-relaxed line-clamp-3 text-sm">
                                    {school.publicProfile.description}
                                </p>
                            ) : (
                                <p className="text-white/80 text-sm">
                                    Welcome to the fee payment portal. Pay securely with UPI, Cards, Net Banking or Wallets.
                                </p>
                            )}

                            {/* Contact Info */}
                            {(school?.contactNumber || school?.publicProfile?.publicPhone) && (
                                <div className="flex flex-wrap gap-4 text-xs text-blue-200 border-t border-white/10 pt-4">
                                    {school?.contactNumber && <span>📞 {school.contactNumber}</span>}
                                    {school?.publicProfile?.publicEmail && <span>✉️ {school.publicProfile.publicEmail}</span>}
                                </div>
                            )}

                            {/* Security badges */}
                            <div className="flex items-center gap-3 text-sm text-white/90 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                <Shield className="w-5 h-5 text-white flex-shrink-0" />
                                <p>100% Secure Payments</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center px-12 sm:px-16 py-12 relative bg-white">
                    <div className="max-w-[360px] mx-auto w-full">

                        {school ? (
                            <>
                                {/* Login Form Header */}
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Fee Payment Portal 👋</h2>
                                    <p className="text-gray-500 text-sm">Please enter your details to login.</p>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                                            User Id/Admn. No. *
                                        </Label>
                                        <Input
                                            type="text"
                                            placeholder="Your User Id/Admn. No."
                                            className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-[#0569ff] focus:ring-4 focus:ring-[#0569ff]/10 rounded-xl transition-all font-medium"
                                            value={admissionNo}
                                            onChange={(e) => {
                                                setAdmissionNo(e.target.value);
                                                setError('');
                                            }}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                                            Password *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Your Password"
                                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-[#0569ff] focus:ring-4 focus:ring-[#0569ff]/10 rounded-xl transition-all font-medium pr-10"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                                            Session *
                                        </Label>
                                        <Select value={academicYearId} onValueChange={setAcademicYearId}>
                                            <SelectTrigger className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-[#0569ff] focus:ring-4 focus:ring-[#0569ff]/10 rounded-xl">
                                                <SelectValue placeholder="Select Session" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>



                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-[#0569ff] hover:bg-[#0451cc] text-white font-medium rounded-xl shadow-lg shadow-[#0569ff]/20 active:scale-[0.98] transition-all duration-300"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Pay Fees'}
                                    </Button>
                                    {/* Turnstile Captcha */}
                                    <div className="flex justify-center pt-2">
                                        <Turnstile
                                            key={turnstileKey}
                                            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                            onVerify={(token) => setTurnstileToken(token)}
                                            theme="light"
                                        />
                                    </div>
                                </form>
                            </>
                        ) : (
                            // Placeholder when no school selected
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-[#0569ff]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Wallet className="w-8 h-8 text-[#0569ff]" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Fee Payment Portal</h3>
                                <p className="text-gray-500 text-sm">Please enter your school code to continue</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <Image src="/by.png" alt="EduBreezy" width={20} height={20} className="rounded" />
                                <span className="text-xs text-gray-500">Powered by EduBreezy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* School Code Dialog */}
            <Dialog open={showSchoolDialog} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl [&>button]:hidden p-0 overflow-hidden">
                    <div className="p-8">
                        {/* Icon */}
                        <div className="w-16 h-16 bg-gradient-to-br from-[#0569ff] to-[#0246b5] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#0569ff]/30">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome to EduBreezy Pay</h2>
                        <p className="text-sm text-gray-500 text-center mb-8">
                            Enter your school&apos;s unique code to continue
                        </p>

                        <form onSubmit={handleSchoolCodeSubmit} className="space-y-5">
                            {/* Input with EB- prefix */}
                            <div>
                                <div className={`flex items-center border-2 rounded-xl overflow-hidden bg-gray-50 transition-all ${schoolCodeError ? 'border-red-300' : 'border-gray-200 focus-within:border-[#0569ff]'}`}>
                                    <span className="px-4 py-3.5 bg-[#0569ff] text-white font-bold text-sm min-w-[60px] text-center">
                                        EB-
                                    </span>
                                    <Input
                                        placeholder="Enter code (e.g., 0001)"
                                        value={schoolCodeInput}
                                        onChange={(e) => {
                                            setSchoolCodeInput(e.target.value.toUpperCase());
                                            setSchoolCodeError('');
                                        }}
                                        className="border-0 bg-transparent h-12 focus-visible:ring-0 uppercase font-semibold tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                                        autoFocus
                                        disabled={schoolCodeLoading}
                                    />
                                </div>

                                {/* Error message */}
                                {schoolCodeError && (
                                    <div className="flex items-center gap-2 mt-2 text-red-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-medium">{schoolCodeError}</p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button - Only loader here */}
                            <Button
                                type="submit"
                                className="w-full h-12 bg-[#0569ff] hover:bg-[#0451cc] text-white font-semibold rounded-xl shadow-lg shadow-[#0569ff]/20 active:scale-[0.98] transition-all duration-300"
                                disabled={schoolCodeLoading || !schoolCodeInput.trim()}
                            >
                                {schoolCodeLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </Button>

                            {/* Help text */}
                            <p className="text-xs text-gray-400 text-center">
                                Don&apos;t know your code? Contact your school administration.
                            </p>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2">
                            <Image src="/by.png" alt="EduBreezy" width={18} height={18} className="rounded" />
                            <span className="text-xs text-gray-500">Secure Payment Portal by EduBreezy</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
