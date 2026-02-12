'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff, Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, Shield, KeyRound } from "lucide-react"
import axios from "axios"
import Link from "next/link"
import Image from "next/image"
import Turnstile from 'react-turnstile';

export default function LoginPhoto() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false)
    const [loadingl, setLoadingl] = useState(true)
    const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState('');

    // 2FA state
    const [show2FA, setShow2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [pendingUser, setPendingUser] = useState(null); // holds user data during 2FA
    const [pendingSession, setPendingSession] = useState(null);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const twoFAInputRef = useRef(null);

    // School data state
    const searchParams = useSearchParams()
    const schoolCode = searchParams.get("schoolCode")
    const [school, setSchool] = useState(null)
    const [schoolError, setSchoolError] = useState(false)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setAlreadyLoggedIn(true);
                router.push("/dashboard")
            }
        })
    }, [])

    useEffect(() => {
        if (!schoolCode) {
            router.push('/schoollogin');
        } else {
            // Check if school data is already cached from Hero page
            const cachedSchool = sessionStorage.getItem('loginSchool');
            if (cachedSchool) {
                try {
                    const parsed = JSON.parse(cachedSchool);
                    // Verify the cached school matches the schoolCode in URL
                    if (parsed.schoolCode === schoolCode) {
                        setSchool(parsed);
                        setLoadingl(false);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing cached school:', e);
                }
            }
            // If no cache or cache mismatch, fetch from API
            fetchSchool();
        }
    }, [schoolCode]);

    const fetchSchool = async () => {
        try {
            const res = await fetch(`/api/schools/by-code?schoolcode=${schoolCode}`);
            const data = await res.json();
            if (res.ok) {
                setSchool(data.school);
                // Cache for potential page refresh
                sessionStorage.setItem('loginSchool', JSON.stringify(data.school));
            } else {
                setSchoolError(true);
            }
        } catch (err) {
            setSchoolError(true);
        } finally {
            setLoadingl(false);
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Skip Turnstile in development environment
        const isDev = process.env.NODE_ENV === 'development';
        if (!isDev && !turnstileToken) {
            toast.error("Security Check", { description: "Please complete the captcha verification" });
            setLoading(false);
            return;
        }

        try {
            // Check rate limit
            const rateLimitCheck = await axios.get('/api/auth/check-rate-limit');
            if (rateLimitCheck.data.blocked) {
                toast.error("Account Temporarily Locked", {
                    description: "Too many failed login attempts. Try again in 15 minutes."
                });
                setLoading(false);
                return;
            }

            // Authenticate
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: { captchaToken: turnstileToken }
            });

            if (error || !data.user) {
                // Record failure
                axios.post('/api/auth/record-attempt', {
                    email,
                    success: false,
                    reason: 'invalid_credentials',
                    schoolCode: school?.schoolCode
                }).catch(err => console.error(err));

                toast.error("Login Failed", { description: "Invalid email or password" });
                setLoading(false);
                return;
            }

            // Verify User
            const res = await fetch(`/api/auth/user?userId=${data.user.id}`, {
                headers: { Authorization: `Bearer ${data.session?.access_token}` },
            });
            const result = await res.json();

            if (!res.ok) {
                await supabase.auth.signOut();
                toast.error("Login Error", { description: result.error });
                setLoading(false);
                return;
            }

            // Role Checks
            if (result.role?.name === 'SUPER_ADMIN') {
                await supabase.auth.signOut();
                toast.error("Incorrect Portal", {
                    description: "Super Admins must use the Developer Login.",
                    action: { label: "Go to Dev Login", onClick: () => router.push('/developer-login') }
                });
                setLoading(false);
                return;
            }

            if (school && result.schoolId !== school.id) {
                await supabase.auth.signOut();
                // Record failure
                axios.post('/api/auth/record-attempt', {
                    email,
                    success: false,
                    reason: 'school_mismatch',
                    schoolCode: school.schoolCode
                }).catch(err => console.error(err));

                toast.error("Access Denied", { description: `This account does not belong to ${school.name}` });
                setLoading(false);
                return;
            }

            // ─── 2FA Check ───────────────────────────────────
            if (result.twoFactorEnabled) {
                setPendingUser(result);
                setPendingSession(data.session);
                setShow2FA(true);
                setLoading(false);
                setTimeout(() => twoFAInputRef.current?.focus(), 100);
                return;
            }

            // No 2FA — proceed to dashboard
            completeLogin(result, data.session);

        } catch (err) {
            toast.error("Login Error", { description: err.message });
            setLoading(false);
        }
    };

    // ─── Complete Login (after password + optional 2FA) ──────
    const completeLogin = (result, session) => {
        axios.post('/api/auth/record-attempt', {
            email,
            success: true,
            schoolCode: school?.schoolCode
        }).catch(err => console.error(err));

        localStorage.setItem("user", JSON.stringify(result));

        fetch('/api/auth/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: result.id,
                rememberMe,
                supabaseSessionToken: session?.access_token
            })
        }).catch(err => console.error("Session record failed", err));

        toast.success("Welcome back, " + result?.name || "User");
        router.push("/dashboard");
    };

    // ─── 2FA Challenge Submit ────────────────────────────────
    const handle2FASubmit = async (e) => {
        e.preventDefault();
        if (!twoFACode.trim()) return;
        setTwoFALoading(true);

        try {
            const res = await fetch('/api/auth/2fa/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: pendingUser.id, code: twoFACode.trim() }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (data.backupCodeUsed) {
                    toast.info(`Backup code used. ${data.remainingBackupCodes} remaining.`);
                }
                completeLogin(pendingUser, pendingSession);
            } else {
                toast.error("Verification Failed", { description: data.error });
                setTwoFACode('');
                twoFAInputRef.current?.focus();
            }
        } catch (err) {
            toast.error("Verification Error", { description: err.message });
        } finally {
            setTwoFALoading(false);
        }
    };

    if (loadingl) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (schoolError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">School Not Found</h2>
                        <p className="text-gray-500 mt-2">The school code you entered is invalid.</p>
                    </div>
                    <Link href="/schoollogin">
                        <Button className="w-full">Try Another Code</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-[1100px] h-[650px] bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 overflow-hidden flex relative">

                {/* Back Button (Absolute) */}
                <Link href="/schoollogin" className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/10 hover:bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Change School</span>
                </Link>

                {/* Left Side - Visual */}
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
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-900/90 mix-blend-multiply" />
                        </div>
                    )}

                    {/* Branding Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="pt-16">
                            {/* Optional: Brand Logo if separates from Name */}
                            {school?.logo && (
                                <img
                                    src={school.logo}
                                    alt="Logo"
                                    className="h-16 w-auto mb-6 bg-white/10 backdrop-blur-md rounded-xl p-2"
                                />
                            )}
                            <h1 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-sm">
                                {school?.name || "EduBreezy"}
                            </h1>
                            {school?.publicProfile?.tagline && (
                                <p className="text-blue-100 text-lg italic max-w-md border-l-4 border-white/30 pl-4 py-1">
                                    "{school.publicProfile.tagline}"
                                </p>
                            )}
                        </div>

                        <div className="space-y-6">
                            {school?.publicProfile?.description ? (
                                <p className="text-white/80 leading-relaxed line-clamp-3 text-sm">
                                    {school.publicProfile.description}
                                </p>
                            ) : (
                                <p className="text-white/80 text-sm">
                                    Welcome to your dedicated school portal. Access your dashboard securely.
                                </p>
                            )}

                            {/* Contact Mini-Footer */}
                            {(school?.contactEmail || school?.contactNumber) && (
                                <div className="flex flex-wrap gap-4 text-xs text-blue-200 border-t border-white/10 pt-6">
                                    {school.contactEmail && <span>{school.contactEmail}</span>}
                                    {school.contactNumber && <span>{school.contactNumber}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center px-12 sm:px-16 py-12 relative bg-white">
                    <div className="max-w-[360px] mx-auto w-full">

                        {show2FA ? (
                            /* ─── 2FA Challenge Screen ─── */
                            <>
                                <div className="mb-8">
                                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                                        <Shield className="w-7 h-7 text-blue-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
                                    <p className="text-gray-500 text-sm">
                                        {useBackupCode
                                            ? "Enter one of your backup codes to continue."
                                            : "Enter the 6-digit code from your authenticator app."}
                                    </p>
                                </div>

                                <form onSubmit={handle2FASubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">
                                            {useBackupCode ? "Backup Code" : "Verification Code"}
                                        </Label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                                            <Input
                                                ref={twoFAInputRef}
                                                type="text"
                                                inputMode={useBackupCode ? "text" : "numeric"}
                                                placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                                                maxLength={useBackupCode ? 8 : 6}
                                                className="pl-11 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-mono text-lg tracking-[0.3em] text-center text-gray-900 placeholder:text-gray-300"
                                                value={twoFACode}
                                                onChange={(e) => setTwoFACode(e.target.value.replace(useBackupCode ? /[^A-Fa-f0-9]/g : /\D/g, ''))}
                                                autoComplete="one-time-code"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={twoFALoading || !twoFACode.trim()}
                                        className={`group w-full relative h-12 rounded-xl border font-bold text-base transition-all duration-300 overflow-hidden flex items-center justify-center gap-2 ${twoFALoading || !twoFACode.trim()
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-[#0569ff] text-white shadow-[0_4px_20px_rgba(5,105,255,0.3)] hover:shadow-[0_8px_30px_rgba(5,105,255,0.4)]'
                                            }`}
                                    >
                                        {twoFALoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                                                <span className="relative z-10">Verifying...</span>
                                            </>
                                        ) : (
                                            <span className="relative z-10">Verify</span>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUseBackupCode(!useBackupCode);
                                                setTwoFACode('');
                                                twoFAInputRef.current?.focus();
                                            }}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                        >
                                            {useBackupCode ? "Use authenticator app" : "Use a backup code"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShow2FA(false);
                                                setTwoFACode('');
                                                setPendingUser(null);
                                                setPendingSession(null);
                                                supabase.auth.signOut();
                                            }}
                                            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            ← Back to login
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            /* ─── Login Form ─── */
                            <>
                                <div className="mb-10">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
                                    <p className="text-gray-500 text-sm">Please enter your details to sign in.</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                                            <Input
                                                type="email"
                                                placeholder="Enter your email"
                                                className="pl-11 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-11 pr-11 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                                {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                                        </label>
                                        <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                            Forgot password?
                                        </Link>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || alreadyLoggedIn || !email || !password}
                                        className={`group w-full relative h-12 rounded-xl border font-bold text-base transition-all duration-300 overflow-hidden flex items-center justify-center gap-2 mt-2 ${loading || alreadyLoggedIn || !email || !password
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-[#0569ff] text-white shadow-[0_4px_20px_rgba(5,105,255,0.3)] hover:shadow-[0_8px_30px_rgba(5,105,255,0.4)]'
                                            }`}
                                    >
                                        {!loading && !alreadyLoggedIn && email && password && (
                                            <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        )}
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                                                <span className="relative z-10">Signing in...</span>
                                            </>
                                        ) : (
                                            <span className="relative z-10">Sign in</span>
                                        )}
                                    </button>
                                    {/* Turnstile Widget - Hidden in development */}
                                    {process.env.NODE_ENV !== 'development' && (
                                        <div className="flex justify-center pt-2">
                                            <Turnstile
                                                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                                onVerify={(token) => setTurnstileToken(token)}
                                                theme="light"
                                            />
                                        </div>
                                    )}
                                </form>
                            </>
                        )}
                    </div>

                    {/* Bottom Legal/Copyright (Optional) */}
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                        <p className="text-[10px] text-gray-400">© {new Date().getFullYear()} Edubreezy. Secure Login.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}