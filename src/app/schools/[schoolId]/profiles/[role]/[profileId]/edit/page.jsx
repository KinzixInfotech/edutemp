"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export default function NewProfilePage() {
    const { schoolId, role } = useParams()
    const router = useRouter()
    const [form, setForm] = useState({
        name: "",
        class: "",
        dob: "",
        email: "",
        bloodGroup: ""
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/schools/${schoolId}/profiles/${role}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            })
            if (!res.ok) throw new Error("Failed to create profile")
            toast.success(`${role} profile created`)
            router.push(`/schools/${schoolId}/manage`)
        } catch {
            toast.error("Creation failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto p-6">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <Input
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <Input
                        placeholder="Class"
                        value={form.class}
                        onChange={(e) => setForm({ ...form, class: e.target.value })}
                    />
                    <Input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                    <Input
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <Input
                        placeholder="Blood Group"
                        value={form.bloodGroup}
                        onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    />
                    <Button onClick={handleSubmit} disabled={loading} className="w-full">
                        {loading ? "Creating..." : "Create"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
