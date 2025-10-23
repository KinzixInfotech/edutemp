"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle, Info, Mail, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
    const [step, setStep] = useState("initial"); // initial, verify-current, new-password, email, otp
    const [email, setEmail] = useState("");
    const router = useRouter();
    const [otp, setOtp] = useState("");
    const [session, setSession] = useState(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [strengthLabel, setStrengthLabel] = useState("");
    const [strengthColor, setStrengthColor] = useState("");
    const [verified, setVerified] = useState(false);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const queryClient = useQueryClient();

    // Get session on component mount
    // useEffect(() => {
    //     supabase.auth.getSession().then(({ data: { session }, error }) => {
    //         if (error) {
    //             console.error(error);
    //         } else {
    //             setSession(session);
    //             if (session) {
    //                 setStep("initial");
    //             } else {
    //                 setStep("email");
    //             }
    //         }
    //     });

    //     // Listen for auth changes
    //     const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    //         setSession(session);
    //         if (session && step === "initial") {
    //             setStep("initial");
    //         }
    //     });

    //     return () => subscription.unsubscribe();
    // }, []);
    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!isMounted) return;
            if (error) console.error(error);
            else if (session) {
                setSession(session);
                // ✅ Only set step if not already in a deeper step
                setStep((prev) => (prev === "email" || prev === "initial" ? "initial" : prev));
            } else {
                setStep("email");
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;
            // ✅ Only update session if it actually changed
            setSession((prev) => (JSON.stringify(prev) !== JSON.stringify(session) ? session : prev));
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const isAuthenticated = !!session;

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 20;
        if (password.match(/[a-z]/)) strength += 20;
        if (password.match(/[A-Z]/)) strength += 20;
        if (password.match(/[0-9]/)) strength += 20;
        if (password.match(/[^a-zA-Z0-9]/)) strength += 20;

        let label = "Weak";
        let color = "bg-red-500";
        if (strength >= 80) {
            label = "Strong";
            color = "bg-green-500";
        } else if (strength >= 60) {
            label = "Medium";
            color = "bg-yellow-500";
        } else if (strength >= 40) {
            label = "Fair";
            color = "bg-orange-500";
        }

        setPasswordStrength(strength);
        setStrengthLabel(label);
        setStrengthColor(color);
    };

    // Verify current password mutation (for authenticated users)
    const verifyCurrentPasswordMutation = useMutation({
        mutationFn: async (currentPassword) => {
            if (!session?.user || !session.access_token) {
                throw new Error("Not logged in");
            }

            const res = await fetch("/api/auth/verify-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    userId: session.user.id,
                    currentPassword,
                }),
            });

            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || "Verification failed");
            }

            return res.json();
        },
        onSuccess: () => {
            setVerified(true);
            setStep("new-password");
            toast.success("Current password verified");
        },
        onError: (error) => {
            toast.error(error.message || "Current password is incorrect");
        },
    });

    // Change password mutation (after verification)
    const changePasswordMutation = useMutation({
        mutationFn: async (data) => {
            if (!session?.user || !session.access_token) {
                throw new Error("Not logged in");
            }

            if (newPassword !== confirmPassword) {
                throw new Error("New passwords do not match");
            }

            if (passwordStrength < 60) {
                throw new Error("Please choose a stronger password");
            }

            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    userId: session.user.id,
                    newPassword,
                }),
            });

            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || "Password update failed");
            }

            return res.json();
        },
        onSuccess: async () => {
            // Clear local Supabase session manually
            toast.success("Password updated successfully");
            // toast.info("Please login with your new password");
            router.push('/dashboard');
            // const { error } = await supabase.auth.signOut();
            // if (error) {
            //     toast.error("Logout error:", error);
            //     console.error("Logout error:", error);
            // } else {
            //     localStorage.removeItem("user");
            //     toast.success("Logged Out Successfully");
            //     router.push('/login');
            // }
            // window.location.href = "/login";
        },
        onError: (error) => {
            toast.error(error.message || "Password update failed");
        },
    });

    // Send OTP mutation (for unauthenticated users)
    const sendOtpMutation = useMutation({
        mutationFn: async (email) => {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {

                    emailRedirectTo: `${window.location.origin}/ChangePassword`,
                },
            });
            if (error) throw error;
            return { success: true };
        },
        onSuccess: () => {
            setStep("otp");
            toast.success("OTP sent to your email");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send OTP");
        },
    });
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //     if (session) {
    //         setSession(session);
    //         setStep("initial"); // or "new-password" if you want to skip verification
    //     } else {
    //         setStep("email");
    //     }
    // });
    // Verify OTP mutation
    const verifyOtpMutation = useMutation({
        mutationFn: async ({ email, otp }) => {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup', // or 'recovery'
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            setSession(data.session);
            setStep("new-password");
            toast.success("OTP verified successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Invalid OTP");
        },
    });

    const handleContinue = () => {
        setStep("verify-current");
    };

    const handleVerifyCurrent = () => {
        verifyCurrentPasswordMutation.mutate(currentPassword);
    };

    const handleChangePassword = () => {
        changePasswordMutation.mutate({ newPassword });
    };

    const handleSendOtp = async () => {
        sendOtpMutation.mutate(email);
    };

    const handleVerifyOtp = async () => {
        verifyOtpMutation.mutate({ email, otp });
    };

    const isLoading = verifyCurrentPasswordMutation.isPending || changePasswordMutation.isPending || sendOtpMutation.isPending || verifyOtpMutation.isPending;

    if (!session && step === "initial") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center  bg-gray-100 px-4">
            <Card className="w-full bg-white max-w-4xl border overflow-hidden rounded-lg shadow-lg">
                <div className="grid md:grid-cols-2">
                    <div className="p-8">
                        <CardHeader className="pb-6">
                            <CardTitle className="text-2xl font-sans text-black font-semibold">
                                {step === "initial" && "Reset your password"}
                                {step === "verify-current" && "Verify current password"}
                                {step === "new-password" && "Set new password"}
                                {step === "email" && "Enter your email"}
                                {step === "otp" && "Verify"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={'text-black'}>
                            {step === "initial" && isAuthenticated ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="id" className="text-sm font-sans">User ID</Label>
                                        <Input
                                            id="id"
                                            type="text"
                                            value={session.user.id}
                                            disabled={true}
                                            className="font-sans bg-muted py-5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-sans">User Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={session.user.email}
                                            disabled={true}
                                            className="font-sans bg-muted py-5"
                                        />
                                    </div>
                                    <Button onClick={handleContinue} disabled={isLoading} className="w-full font-sans">
                                        Continue
                                    </Button>
                                </div>
                            ) : step === "verify-current" ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password" className="text-sm font-sans">
                                            Current password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="current-password"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pr-10 font-sans"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                disabled={isLoading}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                            >
                                                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleVerifyCurrent}
                                        disabled={isLoading || !currentPassword}
                                        className="w-full font-sans"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                                            </span>
                                        ) : (
                                            "Verify"
                                        )}
                                    </Button>
                                </div>
                            ) : step === "new-password" ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password" className="text-sm font-sans">New password</Label>
                                        <div className="relative">
                                            <Input
                                                id="new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => {
                                                    setNewPassword(e.target.value);
                                                    calculatePasswordStrength(e.target.value);
                                                }}
                                                required
                                                disabled={isLoading}
                                                className="pr-10 font-sans"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                disabled={isLoading}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                            >
                                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        <div className="mt-2">
                                            <Progress value={passwordStrength} className={`h-2 ${strengthColor}`} />
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                {passwordStrength > 0 && (
                                                    <>
                                                        {passwordStrength >= 80 ? (
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        ) : passwordStrength >= 40 ? (
                                                            <Info className="h-4 w-4 text-yellow-500" />
                                                        ) : (
                                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                                        )}
                                                        <span>{strengthLabel}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password" className="text-sm font-sans">
                                            Confirm new password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pr-10  font-sans"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                disabled={isLoading}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleChangePassword}
                                        disabled={isLoading || !newPassword || !confirmPassword || passwordStrength < 60}
                                        className="w-full font-sans"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                                            </span>
                                        ) : (
                                            "Change password"
                                        )}
                                    </Button>
                                </div>
                            ) : step === "email" ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-sans">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            className="font-sans"
                                        />
                                    </div>
                                    <Button onClick={handleSendOtp} disabled={isLoading || !email} className="w-full font-sans">
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...
                                            </span>
                                        ) : (
                                            <>
                                                <Mail className="h-4 w-4 mr-2" />
                                                Send OTP
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : step === "otp" ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-sans">
                                            Enter OTP sent to {email}
                                        </Label>
                                        <InputOTP
                                            maxLength={6}
                                            value={otp}
                                            onComplete={(value) => setOtp(value)}
                                            disabled={isLoading}
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSeparator />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSeparator />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSeparator />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSeparator />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSeparator />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <Button
                                        onClick={handleVerifyOtp}
                                        disabled={isLoading || otp.length !== 6}
                                        className="w-full font-sans"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                                            </span>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Verify OTP
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : null}
                        </CardContent>
                    </div>

                    {/* Right panel - password tips */}
                    <div className="hidden md:block bg-gray-50 p-8">
                        <CardHeader className="pb-6">
                            <CardTitle className="text-xl text-black font-sans font-normal">
                                Create a secure password
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-600 font-sans">
                            <p>Follow these steps to make your password strong and secure:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Use at least 8 characters.</li>
                                <li>Include uppercase and lowercase letters.</li>
                                <li>Add numbers and special characters (e.g., !@#$%).</li>
                                <li>Avoid common words or personal information.</li>
                                <li>Don't reuse passwords from other sites.</li>
                                <li>Consider using a password manager.</li>
                            </ul>
                        </CardContent>
                    </div>
                </div>
            </Card>
        </div>
    );
}