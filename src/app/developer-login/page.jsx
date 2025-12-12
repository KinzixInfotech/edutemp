'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Code, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

export default function DeveloperLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Step 1: Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
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

            // Success - redirect to dashboard
            toast.success('Welcome back!');
            router.push('/dashboard');

        } catch (error) {
            console.error('Developer login error:', error);
            setError('An unexpected error occurred');
            toast.error('Login failed', { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                {/* <div className="text-center mb-8">
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
                </div> */}

                {/* Main Card */}
                <Card className="border-0 shadow-none  mt-20 border bg-white dark:bg-gray-900">
                    <CardContent className="p-8 sm:p-10">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Code className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
                                Developer Login
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                Super Admin access only
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="h-11"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        className="h-11 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-medium"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Footer Links */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <span className="text-muted-foreground">School user?</span>
                                <Link href="/schoollogin" className="text-primary hover:underline font-medium">
                                    Go to School Login
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Notice */}
                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-800">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Restricted access · Authorized personnel only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
