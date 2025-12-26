'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

export default function Step5Review({ data }) {
    const domain = data.domainMode === 'tenant'
        ? `${data.tenantName}.edubreezy.com`
        : data.customDomain;

    return (
        <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-green-900">Ready to Create School</h4>
                    <p className="text-sm text-green-700 mt-1">
                        Please review all information below before submitting.
                    </p>
                </div>
            </div>

            {/* School Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">School Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{data.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{data.email}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{data.phone}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{data.location}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subscription:</span>
                        <Badge variant="outline">
                            {data.subscriptionType === 'A' && 'Per Student'}
                            {data.subscriptionType === 'B' && 'Up to 500'}
                            {data.subscriptionType === 'C' && '501-1000'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Domain Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Domain Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Domain:</span>
                        <span className="font-medium font-mono text-blue-600">{domain}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">School Code:</span>
                        <span className="font-medium font-mono">EB-{data.schoolCode}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Website:</span>
                        <Badge variant={data.generateWebsite ? 'default' : 'secondary'}>
                            {data.generateWebsite ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Admin Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Admin Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{data.adminName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{data.adminem}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Password:</span>
                        <span className="font-mono text-xs">••••••••</span>
                    </div>
                </CardContent>
            </Card>

            {/* Director Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Director Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{data.directorName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{data.directorEmail}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Password:</span>
                        <span className="font-mono text-xs">••••••••</span>
                    </div>
                </CardContent>
            </Card>

            {/* Principal Info */}
            {data.createPrincipal && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Principal Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{data.principalName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{data.principalEmail}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Password:</span>
                            <span className="font-mono text-xs">••••••••</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <p className="text-sm text-muted-foreground text-center pt-4">
                Click "Create School" below to finalize the school creation.
            </p>
        </div>
    );
}
