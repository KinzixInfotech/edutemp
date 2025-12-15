'use client';
export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info } from "lucide-react";

// Transport fees are now managed through the main fee module
// This page redirects users to the appropriate location

export default function TransportFeesRedirect() {
    const router = useRouter();

    return (
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-lg w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                        <Info className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">Transport Fees Integrated</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        Transport fees are now managed through the <strong>main Fee Structure</strong> as a fee particular with the <code className="bg-muted px-1 rounded">TRANSPORT</code> category.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This provides a single source of truth for all fees and automatically shows transport fees in parent profiles.
                    </p>
                    <div className="pt-4 space-y-2">
                        <Button onClick={() => router.push("/dashboard/fees/manage-fee-structure")} className="w-full">
                            <ArrowRight className="h-4 w-4 mr-2" /> Go to Fee Structure
                        </Button>
                        <Button variant="outline" onClick={() => router.back()} className="w-full">
                            Go Back
                        </Button>
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            <strong>Tip:</strong> When creating a fee structure, add a fee particular with category "TRANSPORT" to include transport fees.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
