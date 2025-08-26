'use client'

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
import { Loader2 } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPhoto({ className, ...props }) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMsg, setErrorMsg] = useState("")
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false)
    const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false)
    // schoolcode
    const searchParams = useSearchParams()
    const schoolCode = searchParams.get("schoolCode")
    const [school, setSchool] = useState(null)

    useEffect(() => {
        const cookies = document.cookie.split(";").map(cookie => cookie.trim());
        const loggedInCookie = cookies.find(cookie => cookie.startsWith("sb-user="));
        if (loggedInCookie) {
            setAlreadyLoggedIn(true)
            router.push("/dashboard")
        }
    }, []);


    useEffect(() => {
        const fetchSchool = async () => {
            if (!schoolCode) return // wait for hydration
            console.log("✅ schoolCode:", schoolCode)

            try {
                const res = await fetch(`/api/schools/by-code?schoolcode=${schoolCode}`);
                const data = await res.json();
                if (res.ok) {
                    setSchool(data.school);
                } else {
                    console.error("❌ API error:", data.error);
                }
            } catch (err) {
                console.error("❌ Fetch failed:", err);
            }
        }

        fetchSchool();
    }, [schoolCode]);

    const handleLogin = async (e) => {
        e.preventDefault()
        setErrorMsg("")
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error || !data.user) {
                setErrorMsg(error?.message || "Login failed")
                toast("Authorization Failed", { description: error?.message })
                return
            }

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    schoolCode ? { email, password, schoolCode } : { email, password }
                )
            })

            const result = await res.json()
            if (!res.ok) {
                toast("Login Error", {
                    description: "Only school users can login here",

                    classNames: {
                        description: "text-sm mt-1 !text-black dark:!text-white",
                    },
                });
                return
            }

            document.cookie = `sb-user=${result.user.email}; path=/; max-age=${30 * 24 * 60 * 60}`
            toast(`Welcome back, ${result.user.name || result.user.email}`)
            router.push("/dashboard")
        } catch (err) {
            toast("Login Error", { description: err.message || "Something went wrong" })
            console.log(err)
            toast(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative w-full overflow-hidden flex h-screen flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl z-40">
                <div className={cn("flex flex-col gap-6", className)} {...props}>
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            {/* {school ? (
                                <p>School: {school.name} ({school.schoolCode})</p>
                            ) : schoolCode ? (
                                <p>Looking for school: {schoolCode}...</p>
                            ) : (
                                <p>No school code in URL</p>
                            )} */}
                            <form className="p-6 md:p-8" onSubmit={handleLogin}>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">Welcome</h1>
                                        <p className="text-muted-foreground text-balance">
                                            Login to your Edubreezy workspace!
                                        </p>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter Your Email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Password</Label>
                                            <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                                                Forgot your password?
                                            </a>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter Your Password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>

                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full text-white"
                                            disabled={loading || alreadyLoggedIn}
                                        >
                                            {alreadyLoggedIn ? (
                                                "Already Logged In"
                                            ) : loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Logging in...
                                                </span>
                                            ) : (
                                                "Login"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            <div className="bg-muted relative hidden md:block">
                                {school ? (
                                    <img
                                        src={school.profilePicture}
                                        alt="Image"
                                        className="absolute pointer-events-none inset-0 h-full w-full object-cover"
                                    />
                                ) : schoolCode ? (
                                    <p></p>
                                ) : (
                                    <img
                                        src={image.src}
                                        alt="Image"
                                        className="absolute pointer-events-none inset-0 h-full w-full object-cover"
                                    />
                                )}

                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
                        By clicking continue, you agree to our <a href="#">Terms of Service</a> and{" "}
                        <a href="#">Privacy Policy</a>.
                    </div>
                </div>
            </div>
        </div>
    )
}
