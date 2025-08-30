"use client"

import { useState } from "react"
import Image from "next/image"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function OnboardingDialog() {
    const [step, setStep] = useState(1)
    const { fullUser } = useAuth();
    const [open, setOpen] = useState(true)
    const [feeMode, setFeeMode] = useState("")

    const handleNext = () => setStep(step + 1)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {step === 1 && (
                <DialogContent className="max-w-md bg-muted border-none" showCloseButton={false}>
                    <DialogHeader className="text-center">
                        <img
                            src={fullUser?.school.profilePicture} // your school logo path
                            alt="School Logo"
                            width={80}
                            height={80}
                            className="mx-auto mb-4 rounded-full object-cover"
                        />
                        <DialogTitle className='text-center font-semibold'>Hi {fullUser?.name
                            ? fullUser.name.charAt(0).toUpperCase() + fullUser.name.slice(1).toLowerCase()
                            : ""}, Welcome to your Dashboard</DialogTitle>
                        <DialogDescription className="mt-1 text-center ">
                            We’re excited to have you onboard. Let’s quickly set up your
                            school.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={handleNext} className='gap-1.5 dark:text-white text-black cursor-pointer  w-full flex items-center justify-center'>
                            Start
                            <ArrowRight strokeWidth={3} />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}

            {step === 2 && (
                <DialogContent className="max-w-md bg-muted border-none" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Select Fee Structure</DialogTitle>
                        <DialogDescription>
                            Choose how you want to collect fees for your school.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        <Select value={feeMode} onValueChange={setFeeMode}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder="Select fee mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                                <SelectItem value="YEARLY">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        {/* <Button onClick={handleNext} variant='outline' >
                            Skip
                        </Button> */}
                        <Button onClick={handleNext} className='w-full dark:text-white text-black' disabled={!feeMode}>
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}

            {step === 3 && (
                <DialogContent className="max-w-md text-center bg-muted border-none" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>🎊 Setup Complete!</DialogTitle>
                        <DialogDescription>
                            School successfully initialized with{" "}
                            <span className="font-medium">{feeMode}</span> fee structure.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="justify-center">
                        <Button onClick={() => setOpen(false)} className=' dark:text-white text-black'>Finish</Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
