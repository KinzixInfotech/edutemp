'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Code, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Shield, Terminal, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import Turnstile from 'react-turnstile';

export default function DeveloperLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');

    // 2FA state
    const [show2FA, setShow2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [pendingSession, setPendingSession] = useState(null);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const twoFAInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!turnstileToken) {
            setError('Please complete the security check');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: { captchaToken: turnstileToken }
            });

            if (authError || !authData.user) {
                setError(authError?.message || 'Invalid credentials');
                toast.error('Login failed', { description: authError?.message });
                setLoading(false);
                return;
            }

            // Step 2: Verify user is SUPER_ADMIN
            const res = await fetch(`/api/auth/user?userId=${authData.user.id}`, {
                headers: {
                    Authorization: `Bearer ${authData.session?.access_token}`,
                },
            });

            const userData = await res.json();

            if (userData.role?.name !== 'SUPER_ADMIN') {
                // Not a super admin, sign out
                await supabase.auth.signOut();
                setError('Access denied: Developer login is only for super admins');
                toast.error('Access Denied', {
                    description: 'This login is restricted to developers only'
                });
                setLoading(false);
                return;
            }

            // ─── 2FA Check ───────────────────────────────────
            if (userData.twoFactorEnabled) {
                setPendingUser(userData);
                setPendingSession(authData.session);
                setShow2FA(true);
                setLoading(false);
                setTimeout(() => twoFAInputRef.current?.focus(), 100);
                return;
            }

            // No 2FA — proceed
            completeLogin(userData);

        } catch (error) {
            console.error('Developer login error:', error);
            setError('An unexpected error occurred');
            toast.error('Login failed', { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const completeLogin = (userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
        toast.success('Welcome back, ' + userData?.name);
        router.push('/dashboard');
    };

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
                completeLogin(pendingUser);
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

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-[1100px] h-[650px] bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 overflow-hidden flex relative">

                {/* Left Side - Visual */}
                <div className="w-[55%] relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-slate-900">
                    {/* Abstract Code/Tech Background */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
                    </div>

                    {/* Branding Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="pt-8">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                                <Terminal className="w-8 h-8 text-blue-400" />
                            </div>
                            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                                Developer<br />Console
                            </h1>
                            <p className="text-slate-400 text-lg max-w-md">
                                Secure access for system administrators and developers.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <p>Restricted Environment. All actions are logged and monitored.</p>
                            </div>
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

                                    <Button
                                        type="submit"
                                        disabled={twoFALoading || !twoFACode.trim()}
                                        className="w-full h-12 bg-slate-900 hover:bg-black text-white font-medium rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all duration-300"
                                    >
                                        {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                    </Button>

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
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
                                    <p className="text-gray-500 text-sm">Authentication for Super Admins only.</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Email</Label>
                                        <div className="relative">
                                            <Input
                                                type="email"
                                                placeholder="admin@edubreezy.com"
                                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Password</Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400 pr-10"
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
                                    <div className="flex items-center justify-end pt-1">
                                        <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-slate-900 hover:bg-black text-white font-medium rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all duration-300 mt-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate"}
                                    </Button>
                                    {/* Turnstile Widget */}
                                    <div className="w-full overflow-hidden" style={{ height: '65px' }}>
                                        <div style={{ transform: 'scaleX(1.2)', transformOrigin: 'center top' }}>
                                            <Turnstile
                                                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                                onVerify={(token) => setTurnstileToken(token)}
                                                theme="auto"
                                            />
                                        </div>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* Footer Links */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-center gap-2 text-xs">
                                <span className="text-gray-500">Not an admin?</span>
                                <Link href="/schoollogin" className="text-blue-600 hover:underline font-semibold">
                                    Go to School Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
