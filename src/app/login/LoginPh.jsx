'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import image from '../../../public/edulogin.png';
import { Loader2, Eye, EyeOff, Lock, Mail, ArrowRight, Shield, CheckCircle2, Sparkles } from "lucide-react"
import animation from "../../../public/er.json";
import Lottie from "lottie-react"
import Link from "next/link"
import Image from "next/image"

export default function LoginPhoto({ className, ...props }) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMsg, setErrorMsg] = useState("")
    const [mode, setMode] = useState(false)
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false)
    const [loadingl, setLoadingl] = useState(true)
    const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)

    // schoolcode
    const searchParams = useSearchParams()
    const schoolCode = searchParams.get("schoolCode")
    const [school, setSchool] = useState(null)

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
            setLoadingl(false)
        } else {
            fetchSchool();
        }
    }, [schoolCode]);

    const fetchSchool = async () => {
        try {
            const res = await fetch(`/api/schools/by-code?schoolcode=${schoolCode}`);
            const data = await res.json();
            if (res.ok) {
                setSchool(data.school);
            } else if (res.status === 404) {
                setMode(true);
            } else {
                console.error("❌ API error:", data.error);
            }
            console.log('fetching');
        } catch (err) {
            console.error("❌ Fetch failed:", err);
        } finally {
            setLoadingl(false);
        }
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);

        try {
            // 1. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error || !data.user) {
                setErrorMsg(error?.message || "Login failed");
                toast.error("Authorization Failed", { description: error?.message });
                return;
            }

            // 2. Fetch user data securely from your API (by userId)
            const res = await fetch(`/api/auth/user?userId=${data.user.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${data.session?.access_token}`,
                },
            });

            const result = await res.json();

            if (!res.ok) {
                await supabase.auth.signOut();
                toast.error("Login Error", {
                    description: result.error,
                    classNames: {
                        description: "text-sm mt-1 !text-black dark:!text-white",
                    },
                });
                return;
            }

            // 3. Success → store user in local state/cache
            toast.success(`Welcome back, ${result.name || result.email}`);
            localStorage.setItem("user", JSON.stringify(result));

            // 4. Create Session Record
            try {
                await fetch('/api/auth/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: result.id,
                        rememberMe,
                        supabaseSessionToken: data.session?.access_token
                    })
                });
            } catch (sessionErr) {
                console.error("Failed to create session record:", sessionErr);
                // Don't block login if session tracking fails
            }

            router.push("/dashboard");
        } catch (err) {
            toast.error("Login Error", { description: err.message || "Something went wrong" });
            console.error("❌ Login failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{ backgroundColor: '#0c65f1' }}
                />
                <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-15 animate-pulse"
                    style={{ backgroundColor: '#0c65f1', animationDelay: '1s' }}
                />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-10 animate-pulse"
                    style={{ backgroundColor: '#0c65f1', animationDelay: '2s' }}
                />

                {/* Floating Particles */}
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-float"
                        style={{
                            backgroundColor: '#0c65f1',
                            opacity: Math.random() * 0.3,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 10}s`
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-6">
                <div className="w-full max-w-6xl">
                    {loadingl ? (
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <Loader2 size={64} className="animate-spin" />
                                {/* <div className="absolute inset-0 rounded-full blur-xl animate-pulse" 
                                    style={{ backgroundColor: '#0c65f1', opacity: 0.3 }} 
                                /> */}
                            </div>
                        </div>
                    ) : mode ? (
                        // Error State
                        <div className="text-center space-y-6 animate-fade-in-up">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse"
                                    style={{ backgroundColor: '#0c65f1' }}
                                />
                                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
                                    <Lottie
                                        animationData={animation}
                                        className="flex justify-center items-center w-96 mx-auto"
                                        loop={true}
                                    />
                                    <h2 className="text-4xl sm:text-5xl font-bold mb-4 capitalize" style={{ color: '#0c65f1' }}>
                                        Oops, School Doesn't Exist
                                    </h2>
                                    <p className="text-gray-600 text-lg mb-6 capitalize">
                                        Please Make Sure The School Code is Correct
                                    </p>
                                    <Link href="/">
                                        <Button
                                            size="lg"
                                            className="text-white font-bold shadow-lg hover:shadow-xl transition-all"
                                            style={{ background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)' }}
                                        >
                                            Back To Home
                                            <ArrowRight className="ml-2 w-5 h-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                            <Card className="overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-md">
                                <CardContent className="p-0">
                                    <div className="grid lg:grid-cols-2 gap-0">
                                        {/* Left Side - Login Form */}
                                        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                                            {/* Logo Section */}
                                            <div className="mb-8 text-center lg:text-left">
                                                <div className="inline-flex items-center gap-3 mb-6">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 rounded-xl"
                                                            style={{ backgroundColor: '#0c65f1' }}
                                                        />
                                                        <div className="relative bg-muted rounded-xl p-3 shadow-none">
                                                            <Image
                                                                src='/edu.png'
                                                                width={140}
                                                                height={50}
                                                                alt="EduBreezy"
                                                                priority
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <h1 className="text-3xl sm:text-4xl font-bold mb-3"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text'
                                                    }}
                                                >
                                                    Welcome Back
                                                </h1>
                                                <p className="text-gray-600 text-base sm:text-lg">
                                                    Login to your Edubreezy workspace!
                                                </p>
                                            </div>

                                            {/* Trust Badges */}
                                            <div className="flex flex-wrap gap-3 mb-8">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                                    <Shield className="w-4 h-4" style={{ color: '#0c65f1' }} />
                                                    <span className="text-xs font-semibold" style={{ color: '#0c65f1' }}>Secure Login</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    <span className="text-xs font-semibold text-green-700">Verified</span>
                                                </div>
                                            </div>

                                            {/* Login Form */}
                                            <form onSubmit={handleLogin} className="space-y-6">
                                                {/* Email Field */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                                        Email Address
                                                    </Label>
                                                    <div className="relative group">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                                        <Input
                                                            id="email"
                                                            type="email"
                                                            placeholder="you@example.com"
                                                            required
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="pl-12 h-12 bg-gray-50 border-2 border-gray-200 focus:border-[#0c65f1] focus:bg-white transition-all rounded-xl font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password Field */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                                            Password
                                                        </Label>
                                                        <a href="#" className="text-xs font-semibold hover:underline" style={{ color: '#0c65f1' }}>
                                                            Forgot?
                                                        </a>
                                                    </div>
                                                    <div className="relative group">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Enter your password"
                                                            required
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="pl-12 pr-12 h-12 bg-gray-50 border-2 border-gray-200 focus:border-[#0c65f1] focus:bg-white transition-all rounded-xl font-medium"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Remember Me Checkbox */}
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="rememberMe"
                                                        checked={rememberMe}
                                                        onChange={(e) => setRememberMe(e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[#0c65f1] focus:ring-[#0c65f1]"
                                                    />
                                                    <label
                                                        htmlFor="rememberMe"
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700"
                                                    >
                                                        Remember me for 90 days
                                                    </label>
                                                </div>

                                                {/* Submit Button */}
                                                <Button
                                                    type="submit"
                                                    disabled={loading || alreadyLoggedIn}
                                                    className="w-full h-12 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
                                                    style={{
                                                        background: loading || alreadyLoggedIn
                                                            ? '#cbd5e1'
                                                            : 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)'
                                                    }}
                                                >
                                                    {alreadyLoggedIn ? (
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                            Already Logged In
                                                        </span>
                                                    ) : loading ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Signing In...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            Log In
                                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                        </span>
                                                    )}
                                                </Button>
                                            </form>

                                            {/* Footer Links */}
                                            <div className="mt-8 text-center text-xs text-gray-600">
                                                By continuing, you agree to our{" "}
                                                <a href="#" className="font-semibold hover:underline" style={{ color: '#0c65f1' }}>
                                                    Terms of Service
                                                </a>
                                                {" "}and{" "}
                                                <a href="#" className="font-semibold hover:underline" style={{ color: '#0c65f1' }}>
                                                    Privacy Policy
                                                </a>
                                            </div>
                                        </div>

                                        {/* Right Side - Visual/Image */}
                                        <div className="relative rounded-l-2xl hidden lg:block overflow-hidden">
                                            {school ? (
                                                // School-specific view with logo and background
                                                <div className="relative w-full h-full">
                                                    <img
                                                        src={school.profilePicture}
                                                        alt="School Background"
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                                                    {/* School Logo and Info Overlay */}
                                                    <div className="relative h-full flex flex-col items-center justify-center p-12 text-white z-10">
                                                        {/* School Logo */}
                                                        <div className="relative mb-8">
                                                            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60 bg-white animate-pulse bg-white" />
                                                            <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
                                                                <img
                                                                    src={school.logo || school.profilePicture}
                                                                    alt={school.name}
                                                                    className="w-32 h-32 object-contain"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* School Name */}
                                                        <h2 className="text-3xl font-bold mb-3 text-center drop-shadow-lg">
                                                            {school.name}
                                                        </h2>

                                                        {school.address && (
                                                            <p className="text-base text-white/90 mb-8 text-center max-w-md drop-shadow">
                                                                {school.address}
                                                            </p>
                                                        )}

                                                        {/* Feature highlights for school */}
                                                        {/* <div className="space-y-3 w-full max-w-sm">
                                                            {[
                                                                "Secure student portal",
                                                                "Real-time updates",
                                                                "Digital attendance"
                                                            ].map((feature, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    className="flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                                                    <span className="text-sm font-medium">{feature}</span>
                                                                </div>
                                                            ))}
                                                        </div> */}
                                                    </div>
                                                </div>
                                            ) : (
                                                // Default admin/no-school view
                                                <div className="relative h-full">
                                                    {/* <img
                                                        src={image.src}
                                                        alt="EduBreezy"
                                                        className="absolute  inset-0 h-full w-full object-cover"
                                                    /> */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600" />

                                                    {/* Pattern Overlay */}
                                                    {/* <div className="absolute inset-0 opacity-10"
                                                        style={{
                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                                                        }}
                                                    /> */}

                                                    <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
                                                        {/* Animated Icon */}
                                                        <div className="relative inline-block mb-8">
                                                            <div className="absolute inset-0 rounded-full blur-2xl opacity-50 animate-pulse bg-white" />
                                                            <div className="relative bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                                                                <Sparkles className="w-20 h-20" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 mb-12">
                                                            <h2 className="text-4xl font-bold">
                                                                Manage Everything<br />In One Place
                                                            </h2>
                                                            <p className="text-lg text-white/90 max-w-md mx-auto">
                                                                Streamline your school operations with our comprehensive management system
                                                            </p>
                                                        </div>

                                                        {/* Feature List */}
                                                        <div className="space-y-3 w-full max-w-sm">
                                                            {[
                                                                "Real-time attendance tracking",
                                                                "Automated grade management",
                                                                "Parent-teacher communication",
                                                                "Secure data encryption"
                                                            ].map((feature, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-center gap-3 text-left bg-white/10 backdrop-blur-sm rounded-xl p-3 transform hover:scale-105 transition-transform"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                                                    <span className="text-sm font-medium">{feature}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px) translateX(0px);
                    }
                    33% {
                        transform: translateY(-20px) translateX(10px);
                    }
                    66% {
                        transform: translateY(20px) translateX(-10px);
                    }
                }

                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-float {
                    animation: float linear infinite;
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out;
                }
            `}</style>
        </div>
    );
}