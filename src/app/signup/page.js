'use client';
export const dynamic = 'force-dynamic';


import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SignupPhoto({ className, ...props }) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [role, setRole] = useState("viewer")
    const [errorMsg, setErrorMsg] = useState("")

    const handleSignup = async (e) => {
        e.preventDefault()
        setErrorMsg("")

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, role }),
        })

        const result = await res.json()

        if (!res.ok) {
            toast("Signup failed", { description: result.error })
            return
        }

        toast("Signup Successful!")
        router.push("/")
    }

    return (
        <div className=" flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-fit max-w-sm md:max-w-3xl">
                <div className={cn("flex flex-col gap-6", className)} {...props}>
                    <Card className="overflow-hidden p-0">
                        <CardContent className="grid p-0">
                            <form className="p-6 md:p-8 w-[30em]" onSubmit={handleSignup}>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">Create your account</h1>
                                        <p className="text-muted-foreground text-balance">
                                            Sign up for EduBreezy Platform Admin
                                        </p>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={role}  onValueChange={setRole}>
                                            <SelectTrigger className={'w-full'}>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="master">Master</SelectItem>
                                                <SelectItem value="editor">Editor</SelectItem>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button type="submit" className="w-full text-white">
                                        Sign Up
                                    </Button>


                                </div>
                            </form>

                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
