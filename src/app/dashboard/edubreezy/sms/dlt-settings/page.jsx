'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Settings,
    AlertCircle,
    CheckCircle,
    ExternalLink,
    Copy,
    Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DltSettingsPage() {
    // Placeholder state - in production, this would come from database/env
    const [dltConfig, setDltConfig] = useState({
        entityId: '',
        senderId: 'EDUBZY',
        isRegistered: false,
    });

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">DLT Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Configure DLT registration details for SMS compliance
                </p>
            </div>

            <Separator />

            {/* Registration Status */}
            <Alert variant={dltConfig.isRegistered ? "default" : "destructive"}>
                {dltConfig.isRegistered ? (
                    <CheckCircle className="h-4 w-4" />
                ) : (
                    <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                    {dltConfig.isRegistered ? 'DLT Registered' : 'DLT Not Registered'}
                </AlertTitle>
                <AlertDescription>
                    {dltConfig.isRegistered
                        ? 'Your DLT registration is complete. SMS templates can be sent.'
                        : 'DLT registration is pending. SMS will not be delivered until registration is complete.'}
                </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
                {/* DLT Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            DLT Configuration
                        </CardTitle>
                        <CardDescription>
                            Your DLT registration details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Entity ID (Principal Entity ID)</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={dltConfig.entityId || 'Not configured'}
                                    disabled
                                    className="bg-muted"
                                />
                                {dltConfig.entityId && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(dltConfig.entityId)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This is your unique entity ID from the DLT portal
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Sender ID (Header)</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={dltConfig.senderId || 'Not configured'}
                                    disabled
                                    className="bg-muted"
                                />
                                {dltConfig.senderId && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => copyToClipboard(dltConfig.senderId)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                6-character sender ID that appears on SMS (e.g., EDUBZY)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Registration Status</Label>
                            <div>
                                <Badge variant={dltConfig.isRegistered ? "default" : "secondary"}>
                                    {dltConfig.isRegistered ? 'Active' : 'Pending'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Registration Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            DLT Registration Guide
                        </CardTitle>
                        <CardDescription>
                            Steps to complete DLT registration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    1
                                </div>
                                <div>
                                    <p className="font-medium">Register on DLT Portal</p>
                                    <p className="text-sm text-muted-foreground">
                                        Visit any telecom operator's DLT portal (Jio, Airtel, Vi, BSNL)
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    2
                                </div>
                                <div>
                                    <p className="font-medium">Get Entity ID & Sender ID</p>
                                    <p className="text-sm text-muted-foreground">
                                        Complete registration to receive your Principal Entity ID
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    3
                                </div>
                                <div>
                                    <p className="font-medium">Register Templates</p>
                                    <p className="text-sm text-muted-foreground">
                                        Submit each SMS template for approval on DLT portal
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    4
                                </div>
                                <div>
                                    <p className="font-medium">Add Templates Here</p>
                                    <p className="text-sm text-muted-foreground">
                                        Once approved, add templates with their DLT IDs in Manage Templates
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Useful Links:</p>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://trueconnect.jio.com" target="_blank" rel="noopener noreferrer">
                                        Jio DLT <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://www.airtel.in/business/commercial-communication" target="_blank" rel="noopener noreferrer">
                                        Airtel DLT <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://vilpower.in" target="_blank" rel="noopener noreferrer">
                                        Vi DLT <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Note */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Development Mode</AlertTitle>
                <AlertDescription>
                    DLT registration is not yet complete. Dummy templates with placeholder IDs are being used for testing.
                    SMS delivery will not work until DLT is registered and templates are updated with real DLT IDs.
                </AlertDescription>
            </Alert>
        </div>
    );
}
