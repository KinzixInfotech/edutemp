"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Check, School, ArrowRight, CalendarDays } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const steps = [
    { number: 1, title: "Welcome", icon: School },
    { number: 2, title: "Academic Year", icon: CalendarDays }
]

export default function OnboardingModal({ fullUser, onSuccess }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        schoolId: fullUser?.schoolId
    })

    const handleCreateYear = async () => {
        try {
            setLoading(true)
            const payload = {
                ...form,
                schoolId: fullUser?.schoolId || fullUser?.school?.id
            }

            if (!payload.schoolId) {
                toast.error("School ID is missing")
                return
            }

            const res = await fetch("/api/schools/academic-years", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Failed to create")
            }

            toast.success("Academic Year Created Successfully!")
            onSuccess();

        } catch (err) {
            toast.error(err.message || "Failed to create academic year")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={true} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 border-none bg-white dark:bg-[#121212]" hideClose>

                {/* Big Tab Stepper Header */}
                <div className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 p-2">
                    <div className="grid grid-cols-2 gap-2">
                        {steps.map((s) => {
                            const isActive = step === s.number
                            const isCompleted = step > s.number
                            const Icon = s.icon

                            return (
                                <div
                                    key={s.number}
                                    className={cn(
                                        "relative flex items-center justify-center gap-3 py-4 rounded-lg transition-all duration-300 border",
                                        isActive
                                            ? "bg-white dark:bg-[#222] border-gray-200 dark:border-gray-700"
                                            : "bg-transparent border-transparent opacity-60 grayscale"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                        isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                            isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                                "bg-gray-100 text-gray-400 dark:bg-gray-800"
                                    )}>
                                        {isCompleted ? <Check className="w-6 h-6" /> : <span className="text-lg font-bold">{s.number}</span>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-bold uppercase tracking-wider",
                                            isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
                                        )}>
                                            {s.title}
                                        </span>
                                        {isActive && <span className="text-[10px] text-muted-foreground font-medium">In Progress</span>}
                                        {isCompleted && <span className="text-[10px] text-green-600 font-medium">Completed</span>}
                                    </div>

                                    {/* Active Indicator Line */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-b-lg"
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center space-y-8"
                            >
                                <div className="space-y-4">
                                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center rotate-3 transition-transform hover:rotate-6">
                                        <School className="h-12 w-12 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Welcome, Administrator!</h2>
                                    <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                                        Your school dashboard is almost ready. Let's set up the <strong>Academic Year</strong> to start managing classes and fees.
                                    </p>
                                </div>
                                <Button className="w-full max-w-sm h-14 text-lg font-semibold hover:-translate-y-0.5 transition-all bg-blue-600 hover:bg-blue-700" size="lg" onClick={() => setStep(2)}>
                                    Start Setup <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Define Academic Year</h3>
                                    <p className="text-muted-foreground">Set the timeframe for your new academic session.</p>
                                </div>

                                <div className="space-y-6 bg-gray-50/50 dark:bg-[#1a1a1a]/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. 2024-2025"
                                            value={form.name}
                                            className="h-12 text-lg bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="start" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date</Label>
                                            <Input
                                                id="start"
                                                type="date"
                                                value={form.startDate}
                                                className="h-12 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
                                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end" className="text-sm font-semibold text-gray-700 dark:text-gray-300">End Date</Label>
                                            <Input
                                                id="end"
                                                type="date"
                                                value={form.endDate}
                                                className="h-12 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
                                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <Button variant="outline" size="lg" onClick={() => setStep(1)} disabled={loading} className="flex-1 h-14 text-base border-gray-200 dark:border-gray-700">
                                        Back
                                    </Button>
                                    <Button onClick={handleCreateYear} disabled={loading} size="lg" className="flex-[2] h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                                        {loading ? "Creating Session..." : "Create Academic Year"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    )
}
