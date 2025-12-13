'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            // 1. Check if email exists in our database
            const checkRes = await fetch('/api/auth/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const checkData = await checkRes.json();

            if (!checkRes.ok) {
                throw new Error(checkData.error || 'Failed to verify email');
            }

            if (!checkData.exists) {
                toast.error('Email not found', {
                    description: 'No account found with this email address.'
                });
                setLoading(false);
                return;
            }

            // 2. If exists, send reset link via Supabase
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            });

            if (error) {
                throw error;
            }

            setSubmitted(true);
            toast.success('Reset link sent', {
                description: 'Check your email for the password reset link'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error('Failed to send reset link', {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-white rounded-lg shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                    <p className="text-gray-500 mb-8">
                        We've sent a password reset link to <br />
                        <span className="font-medium text-gray-900">{email}</span>
                    </p>
                    <Link href="/login">
                        <Button variant="outline" className="w-full h-11 border-gray-200 hover:bg-gray-50 text-gray-700">
                            Back to Login
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
                    <div className="w-14 h-14 bg-[#0166fb] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Email Address</Label>
                        <div className="relative">
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 bg-gray-50 border focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-[#0068fe] hover:bg-[#0068fe]/80 text-white font-medium rounded-lg active:scale-[0.98] transition-all duration-300"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending Link...
                            </>
                        ) : (
                            <>
                                Send Reset Link
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
