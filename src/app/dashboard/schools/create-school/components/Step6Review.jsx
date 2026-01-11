'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, School, Globe, User, UserCog, GraduationCap, Mail, Phone, MapPin, Lock, Link2, Code, Users, IndianRupee, Calendar, Sparkles } from 'lucide-react';

export default function Step6Review({ data }) {
    const domain = data.domainMode === 'tenant'
        ? `${data.tenantName}.edubreezy.com`
        : data.customDomain;

    const subscriptionLabels = {
        'A': 'Per Student',
        'B': 'Up to 500 Students',
        'C': '501 - 1000 Students'
    };

    const languageLabels = {
        'en': 'English',
        'hi': 'Hindi'
    };

    const InfoItem = ({ icon: Icon, label, value, valueClass = '' }) => (
        <div className="flex items-start gap-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={`font-medium text-sm truncate ${valueClass}`}>{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-300 text-lg">Ready to Create School</h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                        Please review all information below before submitting.
                    </p>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School Information Card */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <School className="w-4 h-4 text-blue-600" />
                            School Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                        <InfoItem icon={School} label="School Name" value={data.name} />
                        <InfoItem icon={Mail} label="Email" value={data.email} />
                        <InfoItem icon={Phone} label="Phone" value={data.phone} />
                        <InfoItem icon={MapPin} label="Location" value={data.location} />
                        <div className="flex items-center justify-between pt-3 border-t mt-3">
                            <span className="text-sm text-muted-foreground">Subscription</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                {subscriptionLabels[data.subscriptionType] || data.subscriptionType}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">Language</span>
                            <Badge variant="outline">{languageLabels[data.language] || data.language}</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Domain Configuration Card */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="w-4 h-4 text-purple-600" />
                            Domain Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                        <InfoItem
                            icon={Link2}
                            label="Domain"
                            value={domain}
                            valueClass="text-blue-600 dark:text-blue-400 font-mono text-xs"
                        />
                        <InfoItem
                            icon={Code}
                            label="School Code"
                            value={`EB-${data.schoolCode}`}
                            valueClass="font-mono"
                        />
                        <div className="flex items-center justify-between pt-3 border-t mt-3">
                            <span className="text-sm text-muted-foreground">Generate Website</span>
                            <Badge variant={data.generateWebsite ? 'default' : 'secondary'}>
                                {data.generateWebsite ? 'Yes' : 'No'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">Domain Type</span>
                            <Badge variant="outline">
                                {data.domainMode === 'tenant' ? 'Subdomain' : 'Custom'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Admin Profile Card */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserCog className="w-4 h-4 text-orange-600" />
                            Admin Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                        <InfoItem icon={User} label="Name" value={data.adminName} />
                        <InfoItem icon={Mail} label="Email" value={data.adminEmail} />
                        <InfoItem icon={Lock} label="Password" value="••••••••" valueClass="font-mono text-xs" />
                        <div className="pt-3 border-t mt-3">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                Full System Access
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Director Profile Card */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-600" />
                            Director Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                        <InfoItem icon={User} label="Name" value={data.directorName} />
                        <InfoItem icon={Mail} label="Email" value={data.directorEmail} />
                        <InfoItem icon={Lock} label="Password" value="••••••••" valueClass="font-mono text-xs" />
                        <div className="pt-3 border-t mt-3">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                Payroll & Library Approvals
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Principal Profile Card (Conditional) */}
                {data.createPrincipal && (
                    <Card className="border-0 shadow-md md:col-span-2">
                        <CardHeader className="pb-3 border-b bg-muted/30">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-teal-600" />
                                Principal Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InfoItem icon={User} label="Name" value={data.principalName} />
                                <InfoItem icon={Mail} label="Email" value={data.principalEmail} />
                                <InfoItem icon={Lock} label="Password" value="••••••••" valueClass="font-mono text-xs" />
                            </div>
                            <div className="pt-3 border-t mt-3">
                                <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                                    Academic & Staff Management
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ERP Plan & Billing Card */}
                <Card className="border-0 shadow-md md:col-span-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            ERP Plan & Billing
                            <Badge variant="secondary" className="ml-auto text-xs">Super Admin Controlled</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase">Expected Students</p>
                                <p className="text-xl font-bold">{data.expectedStudents?.toLocaleString() || 0}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase">Units Purchased</p>
                                <p className="text-xl font-bold">{data.unitsPurchased || 1}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase">Capacity (with buffer)</p>
                                <p className="text-xl font-bold">{data.softCapacity?.toLocaleString() || 105}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase">Yearly Amount</p>
                                <p className="text-xl font-bold text-green-600">₹{data.yearlyAmount?.toLocaleString() || 10500}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                            <InfoItem
                                icon={Calendar}
                                label="Billing Start"
                                value={data.billingStartDate ? format(new Date(data.billingStartDate), 'PPP') : 'Not set'}
                            />
                            <InfoItem
                                icon={Calendar}
                                label="Billing End"
                                value={data.billingEndDate ? format(new Date(data.billingEndDate), 'PPP') : 'Auto (1 year)'}
                            />
                            <div className="flex items-center gap-2">
                                <Badge variant={data.isTrial ? 'default' : 'outline'} className={data.isTrial ? 'bg-amber-500' : ''}>
                                    {data.isTrial ? `Trial: ${data.trialDays} days` : 'No Trial'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                    Click <span className="font-semibold text-primary">"Create School"</span> below to finalize the school creation.
                </p>
            </div>
        </div>
    );
}
