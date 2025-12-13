'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        // Check for active session (established via callback)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setVerifying(false);
        };

        checkSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (!session) {
            toast.error('Session expired or invalid. Please request a new reset link.');
            return;
        }

        setLoading(true);

        try {
            // 1. Update Password in Supabase
            const { error: supabaseError } = await supabase.auth.updateUser({
                password: password
            });

            if (supabaseError) throw supabaseError;

            // 2. Update Password in Prisma (via API)
            const res = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to sync password to database');
            }

            toast.success('Password updated successfully');

            // 3. Redirect to login
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (error) {
            console.error('Update password error:', error);
            toast.error('Failed to update password', {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 p-8 sm:p-12 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
                    <p className="text-gray-500 mb-8">
                        The password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link href="/forgot-password">
                        <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl">
                            Request New Link
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-[480px] bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 p-8 sm:p-12 relative overflow-hidden">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-7 h-7 text-[#0166fb]" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Set New Password
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Please enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">New Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 bg-gray-50 border focus:bg-white focus:border-[#0166fb] focus:ring-4 focus:ring-[#0166fb]/10 rounded-lg transition-all font-medium text-gray-900 placeholder:text-gray-400 pr-10"
                                required
                                minLength={6}
                                placeholder="••••••••"
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

                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 bg-gray-50 border focus:bg-white focus:border-[#0166fb] focus:ring-4 focus:ring-[#0166fb]/10 rounded-lg transition-all font-medium text-gray-900 placeholder:text-gray-400"
                            required
                            minLength={6}
                            placeholder="••••••••"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#0166fb] hover:bg-[#0166fb]/80 text-white font-medium rounded-lg active:scale-[0.98] transition-all duration-300"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </Button>
                </form>

                {/* Optional Footer/Branding */}
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">Secure Password Reset · EduBreezy</p>
                </div>
            </div>
        </div>
    );
}
