'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, AlertCircle, Shield, RefreshCw, Building2, MapPin, Phone, GraduationCap, ClipboardCheck, FileText, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Turnstile from 'react-turnstile';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function TeacherPageContent() {
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
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-load school from URL entry parameter
    useEffect(() => {
        const entryCode = searchParams.get('entry');
        if (entryCode) {
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
        if (!employeeId.trim() || !password) {
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
            const res = await fetch('/api/teacher/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId: school.id,
                    employeeId: employeeId.trim(),
                    password,
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
            localStorage.setItem('teacherPortalToken', data.token);
            localStorage.setItem('teacherPortalData', JSON.stringify({
                teacher: data.teacher,
                school: data.school,
                expiresAt: data.expiresAt,
            }));

            toast.success('Login successful!');
            router.push('/teacher/dashboard');

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
        setEmployeeId('');
        setPassword('');
        setError('');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Left Side - Visual/School Branding - Hidden on mobile */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-50 to-emerald-50 relative flex-col overflow-hidden">
                    {/* Floating Icons - Positioned around center content */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-[400px] h-[300px]">
                            {/* Top Left - GraduationCap */}
                            <div className="absolute -top-8 -left-4 animate-bounce" style={{ animationDelay: '0s', animationDuration: '4s' }}>
                                <div className="bg-emerald-50 p-2.5 rounded-xl shadow-sm">
                                    <GraduationCap className="w-5 h-5 text-emerald-500/70" />
                                </div>
                            </div>
                            {/* Top Left 2 - ClipboardCheck */}
                            <div className="absolute top-4 left-12 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>
                                <div className="bg-blue-50 p-2 rounded-xl shadow-sm">
                                    <ClipboardCheck className="w-4 h-4 text-blue-500/60" />
                                </div>
                            </div>
                            {/* Top Right - FileText */}
                            <div className="absolute -top-6 right-8 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }}>
                                <div className="bg-indigo-50 p-2.5 rounded-xl shadow-sm">
                                    <FileText className="w-5 h-5 text-indigo-500/60" />
                                </div>
                            </div>
                            {/* Left Middle - Shield */}
                            <div className="absolute top-1/2 -left-12 -translate-y-1/2 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4.5s' }}>
                                <div className="bg-red-50 p-2.5 rounded-xl shadow-sm">
                                    <Shield className="w-5 h-5 text-red-400/60" />
                                </div>
                            </div>
                            {/* Right Middle - BookOpen */}
                            <div className="absolute top-1/2 -right-8 -translate-y-1/2 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.2s' }}>
                                <div className="bg-slate-100 p-2.5 rounded-xl shadow-sm">
                                    <BookOpen className="w-5 h-5 text-slate-500/60" />
                                </div>
                            </div>
                            {/* Bottom Left */}
                            <div className="absolute -bottom-4 left-8 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }}>
                                <div className="bg-orange-50 p-2 rounded-xl shadow-sm">
                                    <ClipboardCheck className="w-4 h-4 text-orange-500/60" />
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
                        {school ? (
                            <div className="flex items-center gap-3">
                                {school.profilePicture ? (
                                    <img src={school.profilePicture} alt={school.name} className="h-10 w-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <span className="text-xl font-bold text-gray-900">{school.name}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Image src="/by.png" alt="EduBreezy" width={36} height={36} className="h-9 w-auto" />
                                <span className="text-xl font-bold text-gray-900">Teacher Portal</span>
                            </div>
                        )}
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
                                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Teacher Portal</h2>
                                <p className="text-gray-500">Enter marks for assigned exams</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom - Security Badge */}
                    <div className="p-6 lg:p-8 relative z-20">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <Shield className="w-4 h-4" />
                            <span>Secure Teacher Access</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-100 to-emerald-50 lg:bg-white lg:bg-none flex flex-col justify-center items-center min-h-[calc(100vh-40px)] lg:min-h-0 p-4 sm:p-8 lg:p-12 xl:p-16">
                    {/* Mobile Logo - Outside card */}
                    <div className="lg:hidden mb-4 flex justify-center items-center gap-2">
                        {school ? (
                            <>
                                {school.profilePicture ? (
                                    <img src={school.profilePicture} alt={school.name} className="h-8 w-8 rounded-md object-cover" />
                                ) : (
                                    <Building2 className="w-6 h-6 text-emerald-600" />
                                )}
                                <span className="font-bold text-gray-900">{school.name}</span>
                            </>
                        ) : (
                            <>
                                <Image src="/by.png" alt="EduBreezy" width={32} height={32} className="h-8 w-auto" />
                                <span className="font-bold text-gray-900">Teacher Portal</span>
                            </>
                        )}
                    </div>

                    {/* Card Container for Mobile */}
                    <div className="max-w-md mx-auto w-full bg-white lg:bg-transparent rounded-2xl lg:rounded-none border lg:border-none p-6 lg:p-0">

                        {!school ? (
                            // School Code Entry
                            <>
                                <div className="mb-6 text-center lg:text-left">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Welcome Teacher 👋</h1>
                                    <p className="text-gray-500 text-sm">Enter your school code to get started</p>
                                </div>

                                <form onSubmit={handleSchoolCodeSubmit} className="space-y-5">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">School Code *</Label>
                                        <div className={`flex items-center border-2 rounded-xl overflow-hidden bg-gray-50 transition-all ${schoolCodeError ? 'border-red-300' : 'border-gray-200 focus-within:border-emerald-500'}`}>
                                            <span className="px-4 py-3.5 bg-emerald-600 text-white font-bold text-sm min-w-[60px] text-center">
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
                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
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
                                            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
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
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Teacher Login 👋</h1>
                                    <p className="text-gray-500 text-sm">Enter your credentials to access marks entry</p>
                                </div>

                                {error && (
                                    <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Employee ID / Email *</Label>
                                        <Input
                                            placeholder="Your Employee ID or Email"
                                            value={employeeId}
                                            onChange={(e) => setEmployeeId(e.target.value)}
                                            className="h-12 rounded-xl border-gray-200 focus:border-emerald-500"
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
                                                className="h-12 rounded-xl border-gray-200 focus:border-emerald-500 pr-12"
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
                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Teacher Portal'}
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
                </div>
            </div>
        </div>
    );
}
