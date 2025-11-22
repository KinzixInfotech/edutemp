// app/partnerprogram/profile/page.jsx
'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import axios from "axios";
import {
    Loader2, Save, Upload, CheckCircle2,
    Building, Phone, Mail, MapPin, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PdfUploadButton = dynamic(() => import('@/components/upload'), { ssr: false });

export default function PartnerProfile() {
    const { fullUser } = useAuth();
    console.log(fullUser);

    const queryClient = useQueryClient();
    const [partnerId] = useState(fullUser?.id);

    const [personalData, setPersonalData] = useState({
        companyName: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        alternatePhone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        gstin: '',
        panNumber: ''
    });

    const [bankData, setBankData] = useState({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        ifscCode: '',
        upiId: ''
    });

    const [kycDocument, setKycDocument] = useState(null);
    const [resetKey, setResetKey] = useState(0);

    // Fetch partner profile
    const { data: partnerData, isLoading: loading } = useQuery({
        queryKey: ['partner-profile', partnerId],
        queryFn: async () => {
            const res = await axios.get(`/api/partners/profile?partnerId=${partnerId}`);
            return res.data.partner;
        },
        enabled: !!partnerId,
        onSuccess: (data) => {
            setPersonalData({
                companyName: data.companyName || '',
                contactPerson: data.contactPerson || '',
                contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '',
                alternatePhone: data.alternatePhone || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                postalCode: data.postalCode || '',
                gstin: data.gstin || '',
                panNumber: data.panNumber || ''
            });

            setBankData({
                bankName: data.bankName || '',
                accountNumber: data.accountNumber || '',
                accountHolder: data.accountHolder || '',
                ifscCode: data.ifscCode || '',
                upiId: data.upiId || ''
            });
        }
    });

    const handlePersonalChange = (name, value) => {
        setPersonalData({ ...personalData, [name]: value });
    };

    const handleBankChange = (name, value) => {
        setBankData({ ...bankData, [name]: value });
    };

    const updateProfileMutation = useMutation({
        mutationFn: async () => {
            return axios.patch('/api/partners/profile', {
                partnerId,
                ...personalData,
                ...bankData
            }).then(res => res.data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['partner-profile']);

            toast.success("Success!", {
                description: data.message || "Profile updated successfully",
            });
        },
        onError: (err) => {
            toast.error("Failed", {
                description: err.message || "Failed to update profile",
            });
        },
    });

    const handleSave = () => updateProfileMutation.mutate();

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold tracking-tight">Partner Profile</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account information and settings
                </p>
            </motion.div>
            {/* Profile Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Building className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Account Status</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Your partner account status and level
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Badge
                                    variant="secondary"
                                    className={
                                        partnerData?.status === 'ACTIVE' ? 'bg-green-500 text-white' :
                                            partnerData?.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                                                'bg-red-500 text-white'
                                    }
                                >
                                    {partnerData?.status || 'PENDING'}
                                </Badge>
                                <Badge className="bg-primary">
                                    {partnerData?.level || 'SILVER'} Partner
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
            {/* Personal Information */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Business Information
                        </CardTitle>
                        <CardDescription>
                            Update your company and contact details
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="companyName">Company Name *</Label>
                                    <Input
                                        id="companyName"
                                        value={personalData.companyName}
                                        onChange={(e) => handlePersonalChange('companyName', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contactPerson">Contact Person *</Label>
                                    <Input
                                        id="contactPerson"
                                        value={personalData.contactPerson}
                                        onChange={(e) => handlePersonalChange('contactPerson', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contactEmail">Email *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactEmail"
                                            type="email"
                                            className="pl-10"
                                            value={personalData.contactEmail}
                                            onChange={(e) => handlePersonalChange('contactEmail', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contactPhone">Phone *</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="contactPhone"
                                            className="pl-10"
                                            value={personalData.contactPhone}
                                            onChange={(e) => handlePersonalChange('contactPhone', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                                    <Input
                                        id="alternatePhone"
                                        value={personalData.alternatePhone}
                                        onChange={(e) => handlePersonalChange('alternatePhone', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input
                                        id="gstin"
                                        value={personalData.gstin}
                                        onChange={(e) => handlePersonalChange('gstin', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="panNumber">PAN Number</Label>
                                    <Input
                                        id="panNumber"
                                        value={personalData.panNumber}
                                        onChange={(e) => handlePersonalChange('panNumber', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="address">Address *</Label>
                                    <Input
                                        id="address"
                                        value={personalData.address}
                                        onChange={(e) => handlePersonalChange('address', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        value={personalData.city}
                                        onChange={(e) => handlePersonalChange('city', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="state">State *</Label>
                                    <Input
                                        id="state"
                                        value={personalData.state}
                                        onChange={(e) => handlePersonalChange('state', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="postalCode">Postal Code *</Label>
                                    <Input
                                        id="postalCode"
                                        value={personalData.postalCode}
                                        onChange={(e) => handlePersonalChange('postalCode', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Bank Details */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Details
                        </CardTitle>
                        <CardDescription>
                            Required for payout processing
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="bankName">Bank Name *</Label>
                                <Input
                                    id="bankName"
                                    value={bankData.bankName}
                                    onChange={(e) => handleBankChange('bankName', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="accountHolder">Account Holder Name *</Label>
                                <Input
                                    id="accountHolder"
                                    value={bankData.accountHolder}
                                    onChange={(e) => handleBankChange('accountHolder', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="accountNumber">Account Number *</Label>
                                <Input
                                    id="accountNumber"
                                    type="password"
                                    value={bankData.accountNumber}
                                    onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ifscCode">IFSC Code *</Label>
                                <Input
                                    id="ifscCode"
                                    value={bankData.ifscCode}
                                    onChange={(e) => handleBankChange('ifscCode', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="upiId">UPI ID</Label>
                                <Input
                                    id="upiId"
                                    placeholder="username@bankname"
                                    value={bankData.upiId}
                                    onChange={(e) => handleBankChange('upiId', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* KYC Documents */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>KYC Documents</CardTitle>
                        <CardDescription>
                            Upload identity and business documents for verification
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <PdfUploadButton
                                        field="kyc"
                                        onFileChange={setKycDocument}
                                        resetKey={resetKey}
                                    />
                                </div>
                                {partnerData?.kycStatus && (
                                    <Badge
                                        variant={partnerData.kycStatus === 'VERIFIED' ? 'default' : 'secondary'}
                                        className={
                                            partnerData.kycStatus === 'VERIFIED' ? 'bg-green-500' :
                                                partnerData.kycStatus === 'PENDING' ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                        }
                                    >
                                        {partnerData.kycStatus}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-end"
            >
                <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    size="lg"
                    className="gap-2"
                >
                    {updateProfileMutation.isPending ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Save Profile
                        </>
                    )}
                </Button>
            </motion.div>
        </div>
    );
}