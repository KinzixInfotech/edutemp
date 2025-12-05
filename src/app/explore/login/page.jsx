'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Mail, Lock, ArrowLeft, AlertCircle, User } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/explore';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Call our parent login API
            const response = await fetch('/api/explore/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Login failed');
                setIsLoading(false);
                return;
            }

            // Set Supabase session in browser
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            if (data.session) {
                const { error: sessionError } = await supabase.auth.setSession(data.session);
                if (sessionError) {
                    console.error('Session set error:', sessionError);
                    // Continue anyway as localStorage might be enough for some parts, 
                    // but logging the error is important
                }
            }

            // Store user data in localStorage for quick access
            if (typeof window !== 'undefined') {
                localStorage.setItem('parentUser', JSON.stringify(data.user));
            }

            // Force full refresh to ensure header updates
            window.location.href = returnTo;
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Login error:', err);
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md shadow-xl border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90">
            <div className="p-8 md:p-10 space-y-6">
                {/* Back Button */}
                <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Explorer
                </Link>

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto shadow-lg" style={{ backgroundColor: '#0766fe' }}>
                        <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Welcome Back</h1>
                        <p className="text-muted-foreground mt-2">
                            Login to write reviews and explore schools
                        </p>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="pl-11 h-11 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-offset-0"
                                style={{ '--tw-ring-color': '#0766fe' }}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pl-11 h-11 border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-offset-0"
                                style={{ '--tw-ring-color': '#0766fe' }}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                        style={{ backgroundColor: '#0766fe' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Logging in...
                            </>
                        ) : (
                            <>
                                <LogIn className="h-5 w-5 mr-2" />
                                Login to Continue
                            </>
                        )}
                    </Button>
                </form>

                {/* Footer Links */}
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-center text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/contact" className="font-medium hover:underline" style={{ color: '#0766fe' }}>
                            Contact your school
                        </Link>
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                        School administrator?{' '}
                        <Link href="/login" className="font-medium hover:underline" style={{ color: '#0766fe' }}>
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </Card>
    );
}

export default function PublicLoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/10">
            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4 py-12">
                <Suspense fallback={<div className="text-center p-8">Loading login...</div>}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
