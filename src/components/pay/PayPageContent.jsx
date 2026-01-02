'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertCircle, Shield, RefreshCw, Building2, MapPin, Phone, CreditCard, Wallet, ShieldCheck, Banknote, Receipt, Smartphone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Turnstile from 'react-turnstile';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function PayPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // School code state
    const [schoolCodeInput, setSchoolCodeInput] = useState('');
    const [schoolCodeError, setSchoolCodeError] = useState('');
    const [schoolCodeLoading, setSchoolCodeLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

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

    // Auto-load school from URL entry parameter
    useEffect(() => {
        const entryCode = searchParams.get('entry');
        if (entryCode) {
            // Auto-fetch school data
            const fetchSchool = async () => {
                try {
                    const code = entryCode.toUpperCase().startsWith('EB-')
                        ? entryCode.toUpperCase()
                        : `EB-${entryCode.toUpperCase()}`;

                    const res = await fetch(`/api/schools/by-code?schoolcode=${encodeURIComponent(code)}`);
                    const data = await res.json();

                    if (res.ok && data.school) {
                        setSchool(data.school);
                        toast.success(`Welcome to ${data.school.name}`);
                    } else {
                        toast.error('Invalid school code in URL');
                    }
                } catch (err) {
                    console.error('Error loading school from URL:', err);
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchSchool();
        } else {
            setInitialLoading(false);
        }
    }, [searchParams]);

    // Fetch academic years when school is set
    const { data: academicYears } = useQuery({
        queryKey: ['pay-academic-years', school?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${school.id}/academic-years`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const years = data.academicYears || data;

            // Filter to show only past and current years (not future years)
            const currentYear = new Date().getFullYear();
            return years.filter(ay => {
                // Extract start year from name (e.g., "2025-26" -> 2025)
                const match = ay.name.match(/^(\d{4})/);
                if (!match) return true; // If format doesn't match, include it
                const startYear = parseInt(match[1]);
                return startYear <= currentYear; // Only current or past years
            });
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
            const code = `EB-${schoolCodeInput.trim().toUpperCase()}`;
            const res = await fetch(`/api/schools/by-code?schoolcode=${encodeURIComponent(code)}`);
            const data = await res.json();

            if (!res.ok || !data.school) {
                setSchoolCodeError(data.error || 'School not found. Please check your code.');
                setSchoolCodeLoading(false);
                return;
            }

            setSchool(data.school);
        } catch (err) {
            setSchoolCodeError('Something went wrong. Please try again.');
        } finally {
            setSchoolCodeLoading(false);
        }
    };

    // Handle login
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!admissionNo.trim() || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!turnstileToken) {
            setError('Please complete the captcha verification');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/pay/student-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: school.id,
                    admissionNo: admissionNo.trim(),
                    password,
                    academicYearId,
                    turnstileToken,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Invalid credentials');
                setLoading(false);
                setTurnstileKey(Date.now());
                setTurnstileToken('');
                return;
            }

            // Store session
            sessionStorage.setItem('paySession', JSON.stringify({
                token: data.token,
                student: data.student,
                school: data.school,
                academicYear: data.academicYear,
                expiresAt: data.expiresAt,
            }));

            toast.success('Login successful!');
            router.push('/pay/dashboard');

        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
            setTurnstileKey(Date.now());
            setTurnstileToken('');
        }
    };

    // Change school handler
    const handleChangeSchool = () => {
        setSchool(null);
        setSchoolCodeInput('');
        setAdmissionNo('');
        setPassword('');
        setAcademicYearId('');
        setError('');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Left Side - Visual/School Branding - Hidden on mobile */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-50 to-blue-50 relative flex-col overflow-hidden">
                    {/* Floating Icons - Positioned around center content */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-[400px] h-[300px]">
                            {/* Top Left - Shield Check */}
                            <div className="absolute -top-8 -left-4 animate-bounce" style={{ animationDelay: '0s', animationDuration: '4s' }}>
                                <div className="bg-green-50 p-2.5 rounded-xl shadow-sm">
                                    <ShieldCheck className="w-5 h-5 text-green-500/70" />
                                </div>
                            </div>
                            {/* Top Left 2 - Credit Card */}
                            <div className="absolute top-4 left-12 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>
                                <div className="bg-blue-50 p-2 rounded-xl shadow-sm">
                                    <CreditCard className="w-4 h-4 text-[#0569ff]/60" />
                                </div>
                            </div>
                            {/* Top Right - Wallet */}
                            <div className="absolute -top-6 right-8 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }}>
                                <div className="bg-indigo-50 p-2.5 rounded-xl shadow-sm">
                                    <Wallet className="w-5 h-5 text-indigo-500/60" />
                                </div>
                            </div>
                            {/* Left Middle - Shield */}
                            <div className="absolute top-1/2 -left-12 -translate-y-1/2 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4.5s' }}>
                                <div className="bg-red-50 p-2.5 rounded-xl shadow-sm">
                                    <Shield className="w-5 h-5 text-red-400/60" />
                                </div>
                            </div>
                            {/* Right Middle - Receipt */}
                            <div className="absolute top-1/2 -right-8 -translate-y-1/2 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.2s' }}>
                                <div className="bg-slate-100 p-2.5 rounded-xl shadow-sm">
                                    <Receipt className="w-5 h-5 text-slate-500/60" />
                                </div>
                            </div>
                            {/* Bottom Left - Banknote */}
                            <div className="absolute -bottom-4 left-8 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }}>
                                <div className="bg-orange-50 p-2 rounded-xl shadow-sm">
                                    <Banknote className="w-4 h-4 text-orange-500/60" />
                                </div>
                            </div>
                            {/* Bottom Right - Building */}
                            <div className="absolute -bottom-6 right-4 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '3.6s' }}>
                                <div className="bg-cyan-50 p-2.5 rounded-xl shadow-sm">
                                    <Building2 className="w-5 h-5 text-cyan-500/60" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Logo */}
                    <div className="p-6 lg:p-8 relative z-20">
                        <Image src="/pay.png" alt="EduBreezy Pay" width={180} height={60} className="h-10 lg:h-12 w-auto" />
                    </div>

                    {/* Center Content - Illustration or School Info */}
                    <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-20">
                        <InteractiveGridPattern
                            width={80}
                            height={80}
                            className="absolute inset-0 w-full h-full z-0 opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_0%,transparent_70%)]"
                        />
                        {school ? (
                            // Show school branding when school is selected
                            <div className="text-center max-w-md z-10">
                                {school.profilePicture && (
                                    <img
                                        src={school.profilePicture}
                                        alt={school.name}
                                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl mx-auto mb-6 object-cover shadow-lg border-4 border-white"
                                    />
                                )}
                                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{school.name}</h2>
                                {school.location && (
                                    <p className="text-gray-500 flex items-center justify-center gap-2 mb-4">
                                        <MapPin className="w-4 h-4" />
                                        {school.location}
                                    </p>
                                )}
                                {school.contactNumber && (
                                    <p className="text-gray-500 flex items-center justify-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        {school.contactNumber}
                                    </p>
                                )}
                            </div>
                        ) : (
                            // Show default visual when no school selected
                            <div className="text-center z-10">
                                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Secure Fee Payment Portal</h2>
                                <p className="text-gray-500">Pay your school fees online with ease</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom - Security Badge */}
                    <div className="p-6 lg:p-8 relative z-20">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <Shield className="w-4 h-4" />
                            <span>100% Secure Payments</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-100 to-blue-50 lg:bg-white lg:bg-none flex flex-col justify-center items-center min-h-[calc(100vh-40px)] lg:min-h-0 p-4 sm:p-8 lg:p-12 xl:p-16">
                    {/* Mobile Logo - Outside card */}
                    <div className="lg:hidden mb-4 flex justify-center">
                        <Image src="/pay.png" alt="EduBreezy Pay" width={140} height={45} className="h-9 w-auto" />
                    </div>

                    {/* Card Container for Mobile */}
                    <div className="max-w-md mx-auto w-full bg-white lg:bg-transparent rounded-2xl lg:rounded-none border lg:border-none p-6 lg:p-0">

                        {!school ? (
                            // School Code Entry
                            <>
                                <div className="mb-6 text-center lg:text-left">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Welcome to EduBreezy Pay 👋</h1>
                                    <p className="text-gray-500 text-sm">Enter your school code to get started</p>
                                </div>

                                <form onSubmit={handleSchoolCodeSubmit} className="space-y-5">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">School Code *</Label>
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
                                        {schoolCodeError && (
                                            <div className="flex items-center gap-2 mt-2 text-red-500">
                                                <AlertCircle className="w-4 h-4" />
                                                <p className="text-sm font-medium">{schoolCodeError}</p>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-[#0569ff] hover:bg-[#0451cc] text-white font-semibold rounded-xl transition-all"
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

                                    <p className="text-sm text-gray-400 text-center">
                                        Don&apos;t know your code? Contact your school administration.
                                    </p>
                                </form>
                            </>
                        ) : (
                            // Login Form
                            <>
                                {/* School Header with Change Option */}
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {school.profilePicture ? (
                                            <img src={school.profilePicture} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-[#0569ff] rounded-lg flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{school.name}</p>
                                            <Badge variant="outline" className="text-xs mt-0.5">{school.schoolCode}</Badge>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleChangeSchool}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-1" />
                                        Change
                                    </Button>
                                </div>

                                <div className="mb-6">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Fee Payment Portal 👋</h1>
                                    <p className="text-gray-500 text-sm">Please enter your details to login</p>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">User Id/Admn. No. *</Label>
                                        <Input
                                            placeholder="Your User Id/Admn. No."
                                            value={admissionNo}
                                            onChange={(e) => setAdmissionNo(e.target.value)}
                                            className="h-12 rounded-xl border-gray-200 focus:border-[#0569ff]"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Password *</Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Your Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-12 rounded-xl border-gray-200 focus:border-[#0569ff] pr-12"
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {academicYears?.length > 0 && (
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Session *</Label>
                                            <Select value={academicYearId} onValueChange={setAcademicYearId}>
                                                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                                    <SelectValue placeholder="Select session" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {academicYears.map((ay) => (
                                                        <SelectItem key={ay.id} value={ay.id}>
                                                            {ay.name} {ay.isCurrent && '(Current)'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Turnstile Captcha */}
                                    <div className="flex justify-center">
                                        <Turnstile
                                            key={turnstileKey}
                                            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                            onVerify={(token) => setTurnstileToken(token)}
                                            onError={() => {
                                                setTurnstileToken('');
                                                toast.error('Captcha failed. Please try again.');
                                            }}
                                            theme="light"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-[#0569ff] hover:bg-[#0451cc] text-white font-medium rounded-xl transition-all"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Pay Fees'}
                                    </Button>
                                </form>
                            </>
                        )}

                        {/* Footer - Hidden on mobile */}
                        <div className="hidden lg:block mt-8 pt-6 border-t border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xs text-gray-500">Powered by EduBreezy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Footer Links */}
            <div className="w-full bg-slate-800 py-2 lg:py-3 px-4">
                <div className="flex flex-wrap items-center justify-center gap-x-3 lg:gap-x-4 gap-y-0.5 text-[10px] lg:text-xs text-slate-300">
                    <Link href="https://www.edubreezy.com/about" target='_blank' className="hover:text-white transition-colors">About Us</Link>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <Link href="https://www.edubreezy.com/contact" target='_blank' className="hover:text-white transition-colors">Contact Us</Link>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <Link href="/terms" target='_blank' className="hover:text-white transition-colors">Terms & Conditions</Link>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <Link href="/privacy" target='_blank' className="hover:text-white transition-colors">Privacy Policy</Link>
                    <span className="text-slate-600 hidden sm:inline">|</span>
                    <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
                </div>
            </div>
        </div>
    );
}
