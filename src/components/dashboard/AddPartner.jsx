'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function AddPartner({ onBack }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        contactPerson: '',
        contactPhone: '',
        companyName: '',
        role: 'AFFILIATE' // Default role
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/partners/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to register partner');
            }

            toast.success('Partner registered successfully!');
            setFormData({
                name: '',
                email: '',
                password: '',
                contactPerson: '',
                contactPhone: '',
                companyName: '',
                role: 'AFFILIATE'
            });
            if (onBack) onBack();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Register New Partner</CardTitle>
                    <CardDescription>Create a new partner account. They will receive an email to verify.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="********"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Phone Number</Label>
                                <Input
                                    id="contactPhone"
                                    name="contactPhone"
                                    placeholder="+91 9876543210"
                                    value={formData.contactPhone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name (Optional)</Label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    placeholder="Acme Corp"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPerson">Contact Person</Label>
                                <Input
                                    id="contactPerson"
                                    name="contactPerson"
                                    placeholder="Jane Doe"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                'Register Partner'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
