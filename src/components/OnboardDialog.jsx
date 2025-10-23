"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function OnboardingDialog() {
    const [open, setOpen] = useState(false)
    const { fullUser } = useAuth()

    useEffect(() => {
        const seen = localStorage.getItem("onboardingSeen")
        if (!seen) {
            setOpen(true) // open only first time
        }
    }, [])

    const handleContinue = () => {
        localStorage.setItem("onboardingSeen", "true") // mark as seen
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md bg-muted border-none" showCloseButton={false}>
                <DialogHeader className="text-center">
                    <img
                        src={fullUser?.profilePicture}
                        alt="School Logo"
                        width={80}
                        height={80}
                        className="mx-auto mb-1 rounded-full object-cover  border-accent border-4"
                    />
                    <DialogTitle className="text-center flex flex-col gap-1">
                        <span className="text-2xl font-semibold">
                            Hi{" "}
                            {fullUser?.name
                                ? fullUser.name.charAt(0).toUpperCase() +
                                fullUser.name.slice(1).toLowerCase()
                                : ""}
                        </span>
                        <span className="text-md font-normal text-muted-foreground">
                            Welcome to your Dashboard
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        onClick={handleContinue}
                        className="gap-1.5 shadow-xl dark:text-white text-black cursor-pointer w-full flex items-center justify-center"
                    >
                        Continue
                        <ArrowRight strokeWidth={3} />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
