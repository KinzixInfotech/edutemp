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
import animation from "../../../public/er.json";
import { Eye, EyeOff } from "lucide-react";
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
            console.log('fetchig');

        } catch (err) {
            console.error("❌ Fetch failed:", err);
        } finally {
            setLoadingl(false);
        }
    }


    // const handleLogin = async (e) => {
    //     e.preventDefault()
    //     setErrorMsg("")
    //     setLoading(true)

    //     try {
    //         const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    //         if (error || !data.user) {
    //             setErrorMsg(error?.message || "Login failed")
    //             toast("Authorization Failed", { description: error?.message })
    //             return
    //         }

    //         const res = await fetch("/api/auth/login", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify(
    //                 schoolCode
    //                     ? { email, password, schoolCode, userId: data.user.id }
    //                     : { email, password, userId: data.user.id }
    //             )
    //         })

    //         const result = await res.json()
    //         console.log(res);

    //         if (!res.ok) {
    //             const { error } = await supabase.auth.signOut()

    //             toast.error("Login Error", {
    //                 description: result.error,
    //                 classNames: {
    //                     description: "text-sm mt-1 !text-black dark:!text-white",
    //                 },
    //             });
    //             return
    //         }
    //         toast.success(`Welcome back, ${result.user.name || result.user.email}`)
    //         router.push("/dashboard")
    //     } catch (err) {
    //         toast("Login Error", { description: err.message || "Something went wrong" })
    //         console.log(err)
    //         toast(err)
    //     } finally {
    //         setLoading(false)
    //     }
    // }
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
                toast("Authorization Failed", { description: error?.message });
                return;
            }

            // 2. Fetch user data securely from your API (by userId)
            const res = await fetch(`/api/auth/user?userId=${data.user.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    // optional: include supabase session token for verification
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

            // 3. Success → store user in local state/cache (or context/Redux)
            toast.success(`Welcome back, ${result.name || result.email}`);

            // store in localStorage (optional)
            localStorage.setItem("user", JSON.stringify(result));

            // redirect
            router.push("/dashboard");
        } catch (err) {
            toast("Login Error", { description: err.message || "Something went wrong" });
            console.error("❌ Login failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="relative w-full  flex h-screen flex-col  p-6 md:p-10">

                <div className="flex flex-col items-center justify-center">
                    <div className="bg-muted w-fit py-1.5 rounded-lg px-5  mb-3  ">
                        <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority />
                    </div>
                    {loadingl ? (
                        <div>
                            <Loader2 size={45} className="animate-spin" />
                        </div>
                    ) : (
                        <div className="w-full max-w-sm md:max-w-3xl z-40">
                            {
                                mode ? (
                                    <div className="w-full gap-2 h-full flex  flex-col items-center justify-center" >
                                        <Lottie
                                            animationData={animation}
                                            className="flex justify-center items-center w-96"
                                            loop={true}
                                        />

                                        <span className="text-5xl text-center font-bold capitalize">Oops, School Doesn't exist</span>
                                        <span className="text-muted-foreground text-center text-lg capitalize ">
                                            Please Make Sure The School code is correct
                                        </span>
                                        <Link href="/schoollogin">
                                            <Button className='mb-3.5 rounded-sm hover:border-black border-2 border-primary transition-all font-bold cursor-pointer  hover:bg-muted hover:text-black' size="lg">Back To Login</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className={cn("flex flex-col gap-6", className)} {...props}>
                                        <Card className="overflow-hidden p-0 border-none">
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
                                                                className='bg-muted border-none py-6 font-semibold'
                                                                onChange={(e) => setEmail(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="grid gap-3">
                                                            <div className="flex items-center">
                                                                <Label htmlFor="password">Password</Label>
                                                                {/* <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                                                            Forgot your password?
                                                        </a> */}
                                                            </div>
                                                            <div className="relative">
                                                                <Input
                                                                    id="password"
                                                                    type={showPassword ? "text" : "password"}
                                                                    placeholder="Enter Your Password"
                                                                    required
                                                                    className='bg-muted border-none py-6 font-semibold'
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
                                                            className="absolute pointer-events-none inset-0 h-full w-full object-fit"
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
                                            By clicking Login, you agree to our <a href="#">Terms of Service</a> and{" "}
                                            <a href="#">Privacy Policy</a>.
                                        </div>
                                    </div>
                                )
                            }

                        </div >
                    )}
                </div>

            </div >

        </div>
    )
}
