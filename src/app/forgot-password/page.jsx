'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

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
            <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/edu.png"
                                width={160}
                                height={54}
                                alt="EduBreezy"
                                priority
                                className="mx-auto"
                            />
                        </Link>
                    </div>

                    <Card className="border-0 shadow-lg bg-white dark:bg-gray-900">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Check your email</h2>
                                <p className="text-muted-foreground">
                                    We've sent a password reset link to <br />
                                    <span className="font-medium text-foreground">{email}</span>
                                </p>
                            </div>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/login">
                                    Back to Login
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Image
                            src="/edu.png"
                            width={160}
                            height={54}
                            alt="EduBreezy"
                            priority
                            className="mx-auto"
                        />
                    </Link>
                </div>

                <Card className="border-0 shadow-xl bg-gray-50 dark:bg-gray-900">
                    <CardContent className="p-8 sm:p-10">
                        <div className="mb-8">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
                                Forgot Password?
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                Enter your email address and we'll send you a link to reset your password
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
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

                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-2 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
