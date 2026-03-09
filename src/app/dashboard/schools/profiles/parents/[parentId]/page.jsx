'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    User, ArrowLeft, Mail, Phone, MapPin, Calendar, Users, Briefcase,
    GraduationCap, Heart, ShieldAlert, Loader2, ExternalLink, School,
    FileText, X, Check, Building2, CreditCard, BadgeInfo,
    PhoneCall, Globe, Hash, UserCheck, Clock, AlertCircle, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// Relation badge color map
const RELATION_COLORS = {
    FATHER: 'bg-blue-50 text-blue-700 border-blue-200',
    MOTHER: 'bg-pink-50 text-pink-700 border-pink-200',
    GUARDIAN: 'bg-purple-50 text-purple-700 border-purple-200',
    GRANDFATHER: 'bg-amber-50 text-amber-700 border-amber-200',
    GRANDMOTHER: 'bg-orange-50 text-orange-700 border-orange-200',
    UNCLE: 'bg-teal-50 text-teal-700 border-teal-200',
    AUNT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    SIBLING: 'bg-green-50 text-green-700 border-green-200',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

function RelationBadge({ relation }) {
    const color = RELATION_COLORS[relation] || RELATION_COLORS.OTHER;
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider', color)}>
            {relation || 'N/A'}
        </span>
    );
}

function EditableField({ label, value, field, editingField, editValues, onEdit, onSave, onCancel, onChange, placeholder, icon: Icon, type }) {
    const isEditing = editingField === field;
    return (
        <div className="group">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                {Icon && <Icon className="h-3 w-3" />}{label}
            </p>
            {isEditing ? (
                <div className="flex items-center gap-1.5">
                    <Input
                        type={type || 'text'}
                        value={editValues[field] ?? ''}
                        onChange={(e) => onChange(field, e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') onSave(field); if (e.key === 'Escape') onCancel(); }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-green-600 hover:bg-green-50" onClick={() => onSave(field)}>
                        <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10" onClick={onCancel}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 min-h-[2rem]">
                    <span className={cn('text-sm font-medium flex-1 break-all', !value && 'text-muted-foreground italic text-xs')}>
                        {value || (placeholder || 'Not specified')}
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" onClick={() => onEdit(field, value || '')}>
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value, icon: Icon, mono }) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                {Icon && <Icon className="h-3 w-3" />}{label}
            </p>
            <p className={cn('text-sm font-medium break-all', !value && 'text-muted-foreground italic text-xs', mono && 'font-mono text-xs')}>
                {value || 'Not specified'}
            </p>
        </div>
    );
}

function SectionCard({ title, icon: Icon, children, className, accent }) {
    return (
        <Card className={cn('border py-0 border-border/50', className)}>
            <CardHeader className={cn('py-3 px-5 border-b', accent ? 'bg-red-50/50' : 'bg-muted/30')}>
                <CardTitle className={cn('text-sm font-semibold flex items-center gap-2', accent && 'text-red-600')}>
                    <Icon className="h-4 w-4" />{title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5">{children}</CardContent>
        </Card>
    );
}

// Co-parent card shown inside a student's section
function CoParentCard({ link, currentParentId, onNavigate }) {
    if (link.parent.id === currentParentId) return null;
    return (
        <div
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group"
            onClick={() => onNavigate(link.parent.id)}
        >
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={link.parent.user?.profilePicture} />
                <AvatarFallback className="text-xs bg-muted font-bold">{link.parent.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{link.parent.name}</p>
                    <RelationBadge relation={link.relation} />
                    {link.isPrimary && <span className="text-[9px] text-primary font-bold uppercase">Primary</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{link.parent.email || link.parent.user?.email}</p>
                <p className="text-xs text-muted-foreground">{link.parent.contactNumber}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
        </div>
    );
}

export default function ParentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const parentId = params.parentId;

    const [activeTab, setActiveTab] = useState('overview');
    const [editingField, setEditingField] = useState(null);
    const [editValues, setEditValues] = useState({});

    const { data: parent, isLoading } = useQuery({
        queryKey: ['parent-profile', parentId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/parents/${parentId}`);
            return res.data;
        },
        enabled: !!schoolId && !!parentId,
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.patch(`/api/schools/${schoolId}/parents/${parentId}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-profile', parentId] });
            toast.success('Updated successfully');
            setEditingField(null);
        },
        onError: () => toast.error('Failed to update'),
    });

    const handleEdit = (field, value) => { setEditingField(field); setEditValues((p) => ({ ...p, [field]: value })); };
    const handleChange = (field, val) => setEditValues((p) => ({ ...p, [field]: val }));
    const handleSave = (field) => updateMutation.mutate({ [field]: editValues[field] });
    const handleCancel = () => { setEditingField(null); setEditValues({}); };
    const ep = { editingField, editValues, onEdit: handleEdit, onSave: handleSave, onCancel: handleCancel, onChange: handleChange };

    if (isLoading) {
        return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!parent) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <User className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Parent Not Found</h2>
                <Button onClick={() => router.back()} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Go Back</Button>
            </div>
        );
    }

    const studentCount = parent.studentLinks?.length || 0;

    // Figure out this parent's relation from first student link (for hero display)
    const thisParentRelation = parent.studentLinks?.[0]?.relation || null;

    return (
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => router.push('/dashboard/schools/manage-parent')}>Parents</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">{parent.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 shrink-0 text-primary" />Parent Profile
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">View and manage all details for this parent account</p>
                </div>
                <Button onClick={() => router.back()} variant="outline" size="sm" className="shrink-0">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
            </div>

            {/* Hero */}
            <Card className="border py-0 border-border/50  overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-primary/20" />
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                        <Avatar className="h-20 w-20 shrink-0 ring-2 ring-border">
                            <AvatarImage src={parent.user?.profilePicture} className="object-cover" />
                            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{parent.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center sm:text-left space-y-2.5">
                            <div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                    <h2 className="text-xl font-bold">{parent.name}</h2>
                                    <Badge variant={parent.user?.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px] uppercase tracking-wider">
                                        {parent.user?.status || 'UNKNOWN'}
                                    </Badge>
                                    {thisParentRelation && <RelationBadge relation={thisParentRelation} />}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />{parent.user?.email || parent.email}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                <span className="inline-flex items-center gap-1.5 bg-muted text-xs font-medium px-2.5 py-1 rounded-full">
                                    <Phone className="h-3 w-3 text-primary" />{parent.contactNumber}
                                </span>
                                {parent.alternateNumber && (
                                    <span className="inline-flex items-center gap-1.5 bg-muted text-xs font-medium px-2.5 py-1 rounded-full">
                                        <PhoneCall className="h-3 w-3 text-muted-foreground" />{parent.alternateNumber}
                                    </span>
                                )}
                                {parent.bloodGroup && (
                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 text-xs font-medium px-2.5 py-1 rounded-full">
                                        <Heart className="h-3 w-3" />{parent.bloodGroup}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 bg-muted text-xs px-2.5 py-1 rounded-full text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Joined {new Date(parent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                                    <GraduationCap className="h-3 w-3" />{studentCount} student{studentCount !== 1 ? 's' : ''} linked
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9 bg-[#ebeef0] dark:bg-muted p-0.5 gap-0.5  flex-wrap">
                    {['overview', 'personal', 'address', 'professional', 'emergency'].map((tab) => (
                        <TabsTrigger key={tab} value={tab} className="h-8 text-xs capitalize data-[state=active]:bg-background  px-3">
                            {tab}
                        </TabsTrigger>
                    ))}
                    <TabsTrigger value="students" className="h-8 text-xs data-[state=active]:bg-background  px-3">
                        Students{' '}
                        <span className="ml-1 bg-muted-foreground/20 text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{studentCount}</span>
                    </TabsTrigger>
                </TabsList>

                {/* ═══ OVERVIEW ═══ */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                        <SectionCard title="Contact Information" icon={Phone}>
                            <div className="space-y-3">
                                <InfoRow label="Primary Phone" value={parent.contactNumber} icon={Phone} />
                                <Separator />
                                <InfoRow label="Alternate Phone" value={parent.alternateNumber} icon={PhoneCall} />
                                <Separator />
                                <InfoRow label="Email" value={parent.email} icon={Mail} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Professional" icon={Briefcase}>
                            <div className="space-y-3">
                                <InfoRow label="Occupation" value={parent.occupation} icon={Briefcase} />
                                <Separator />
                                <InfoRow label="Qualification" value={parent.qualification} icon={GraduationCap} />
                                <Separator />
                                <InfoRow label="Annual Income" value={parent.annualIncome} icon={CreditCard} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Account Info" icon={BadgeInfo}>
                            <div className="space-y-3">
                                <InfoRow label="System Email" value={parent.user?.email} icon={Mail} />
                                <Separator />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Status</p>
                                    <Badge variant={parent.user?.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px] uppercase">{parent.user?.status}</Badge>
                                </div>
                                <Separator />
                                <InfoRow label="Blood Group" value={parent.bloodGroup} icon={Heart} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Address" icon={MapPin}>
                            <div className="space-y-1.5">
                                {parent.address && <p className="text-sm font-medium">{parent.address}</p>}
                                <p className="text-sm text-muted-foreground">
                                    {[parent.city, parent.state, parent.postalCode, parent.country].filter(Boolean).join(', ') || 'No address on record'}
                                </p>
                            </div>
                        </SectionCard>

                        <SectionCard title="Emergency Contact" icon={ShieldAlert} accent>
                            <div className="space-y-3">
                                <InfoRow label="Name" value={parent.emergencyContactName} icon={User} />
                                <Separator />
                                <InfoRow label="Phone" value={parent.emergencyContactNumber} icon={Phone} />
                                <Separator />
                                <InfoRow label="Relation" value={parent.emergencyContactRelation} icon={Users} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Linked Students" icon={GraduationCap}>
                            {studentCount > 0 ? (
                                <div className="space-y-2">
                                    {parent.studentLinks.map((link) => (
                                        <div key={link.student.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors" onClick={() => router.push(`/dashboard/schools/profiles/students/${link.student.userId}`)}>
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={link.student.user?.profilePicture} />
                                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{link.student.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-semibold truncate">{link.student.name}</p>
                                                    <RelationBadge relation={link.relation} />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Class {link.student.class?.className} – {link.student.section?.name}</p>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No students linked</p>
                            )}
                        </SectionCard>
                    </div>
                </TabsContent>

                {/* ═══ PERSONAL ═══ */}
                <TabsContent value="personal" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <SectionCard title="Basic Information" icon={User}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                <EditableField label="Full Name" value={parent.name} field="name" {...ep} icon={User} />
                                <EditableField label="Email Address" value={parent.email} field="email" type="email" {...ep} icon={Mail} />
                                <EditableField label="Primary Phone" value={parent.contactNumber} field="contactNumber" type="tel" {...ep} icon={Phone} />
                                <EditableField label="Alternate Phone" value={parent.alternateNumber} field="alternateNumber" type="tel" {...ep} icon={PhoneCall} placeholder="Not provided" />
                                <EditableField label="Blood Group" value={parent.bloodGroup} field="bloodGroup" {...ep} icon={Heart} placeholder="e.g. O+" />
                            </div>
                        </SectionCard>
                        <SectionCard title="System Account (Read-only)" icon={BadgeInfo}>
                            <div className="space-y-4">
                                <InfoRow label="Login Email" value={parent.user?.email} icon={Mail} />
                                <Separator />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                                        <UserCheck className="h-3 w-3" />Account Status
                                    </p>
                                    <Badge variant={parent.user?.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px] uppercase">{parent.user?.status}</Badge>
                                </div>
                                <Separator />
                                <InfoRow label="Parent ID" value={parent.id} icon={Hash} mono />
                                <Separator />
                                <InfoRow label="Created" value={new Date(parent.createdAt).toLocaleString('en-IN')} icon={Calendar} />
                                <InfoRow label="Last Updated" value={new Date(parent.updatedAt).toLocaleString('en-IN')} icon={Clock} />
                            </div>
                        </SectionCard>
                    </div>
                </TabsContent>

                {/* ═══ ADDRESS ═══ */}
                <TabsContent value="address" className="mt-4">
                    <SectionCard title="Address Details" icon={MapPin}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            <div className="sm:col-span-2 lg:col-span-4">
                                <EditableField label="Street / House Address" value={parent.address} field="address" {...ep} icon={MapPin} placeholder="House no., Street, Area, Locality" />
                            </div>
                            <EditableField label="City" value={parent.city} field="city" {...ep} icon={Building2} />
                            <EditableField label="State" value={parent.state} field="state" {...ep} icon={MapPin} />
                            <EditableField label="PIN / Postal Code" value={parent.postalCode} field="postalCode" {...ep} icon={Hash} />
                            <EditableField label="Country" value={parent.country} field="country" {...ep} icon={Globe} />
                        </div>
                    </SectionCard>
                </TabsContent>

                {/* ═══ PROFESSIONAL ═══ */}
                <TabsContent value="professional" className="mt-4">
                    <SectionCard title="Professional Information" icon={Briefcase}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                            <EditableField label="Occupation" value={parent.occupation} field="occupation" {...ep} icon={Briefcase} placeholder="e.g. Engineer, Doctor" />
                            <EditableField label="Qualification" value={parent.qualification} field="qualification" {...ep} icon={GraduationCap} placeholder="e.g. B.Tech, MBA" />
                            <EditableField label="Annual Income" value={parent.annualIncome} field="annualIncome" {...ep} icon={CreditCard} placeholder="e.g. 5-10 LPA" />
                        </div>
                    </SectionCard>
                </TabsContent>

                {/* ═══ EMERGENCY ═══ */}
                <TabsContent value="emergency" className="mt-4">
                    <SectionCard title="Emergency Contact" icon={ShieldAlert} accent>
                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5 text-amber-800">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                This contact will be reached in case of an emergency. Hover any field and click the pencil icon to edit.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                            <EditableField label="Contact Name" value={parent.emergencyContactName} field="emergencyContactName" {...ep} icon={User} placeholder="Full name" />
                            <EditableField label="Phone Number" value={parent.emergencyContactNumber} field="emergencyContactNumber" type="tel" {...ep} icon={Phone} placeholder="10-digit number" />
                            <EditableField label="Relationship" value={parent.emergencyContactRelation} field="emergencyContactRelation" {...ep} icon={Users} placeholder="e.g. Spouse, Brother" />
                        </div>
                    </SectionCard>
                </TabsContent>

                {/* ═══ STUDENTS ═══ */}
                <TabsContent value="students" className="mt-4 space-y-5">
                    {studentCount > 0 ? (
                        parent.studentLinks.map((link) => {
                            const student = link.student;
                            // Other parents of this student (excluding current parent)
                            const otherParents = student.studentParentLinks?.filter(
                                (spl) => spl.parent.id !== parentId
                            ) || [];

                            return (
                                <Card key={student.userId} className="border border-border/50 overflow-hidden">
                                    {/* Student header */}
                                    <div className={cn('px-5 py-3 border-b flex flex-col sm:flex-row items-center sm:items-start gap-4', 'bg-muted/20')}>
                                        <Avatar
                                            className="h-14 w-14 shrink-0 ring-2 ring-border cursor-pointer"
                                            onClick={() => router.push(`/dashboard/schools/profiles/students/${student.userId}`)}
                                        >
                                            <AvatarImage src={student.user?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{student.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-center sm:text-left">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                                <h3
                                                    className="font-bold text-base hover:text-primary cursor-pointer transition-colors"
                                                    onClick={() => router.push(`/dashboard/schools/profiles/students/${student.userId}`)}
                                                >
                                                    {student.name}
                                                </h3>
                                                {/* This parent's relation to this student */}
                                                <RelationBadge relation={link.relation} />
                                                {link.isPrimary && (
                                                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Primary Contact</span>
                                                )}
                                                <Badge variant="outline" className={cn('text-[9px]', student.user?.status === 'ACTIVE' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50')}>
                                                    {student.user?.status || 'N/A'}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><School className="h-3 w-3" />Class {student.class?.className} – {student.section?.name}</span>
                                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Adm: {student.admissionNo}</span>
                                                {student.rollNumber && <span className="flex items-center gap-1"><Hash className="h-3 w-3" />Roll: {student.rollNumber}</span>}
                                                {student.gender && <span className="flex items-center gap-1"><User className="h-3 w-3" />{student.gender}</span>}
                                                {student.dob && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />DOB: {student.dob}</span>}
                                                {student.bloodGroup && <span className="flex items-center gap-1 text-red-600"><Heart className="h-3 w-3" />{student.bloodGroup}</span>}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 text-xs gap-1.5"
                                            onClick={() => router.push(`/dashboard/schools/profiles/students/${student.userId}`)}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />View Profile
                                        </Button>
                                    </div>

                                    <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        {/* Left: This parent's permissions for this student */}
                                        {/* <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Permissions for this Student</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border text-center', link.canPickup ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border/50 opacity-50')}>
                                                    <span className="text-lg">{link.canPickup ? '✅' : '🚫'}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight">Can Pickup</span>
                                                </div>
                                                <div className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border text-center', link.canViewReports ? 'bg-blue-50 border-blue-200' : 'bg-muted/30 border-border/50 opacity-50')}>
                                                    <span className="text-lg">{link.canViewReports ? '✅' : '🚫'}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight">View Reports</span>
                                                </div>
                                                <div className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border text-center', link.canViewFees ? 'bg-violet-50 border-violet-200' : 'bg-muted/30 border-border/50 opacity-50')}>
                                                    <span className="text-lg">{link.canViewFees ? '✅' : '🚫'}</span>
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-tight">View Fees</span>
                                                </div>
                                            </div>
                                        </div> */}

                                        {/* Right: Other parents of this same student */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                                                Other Parents / Guardians of {student.name.split(' ')[0]}
                                            </p>
                                            {otherParents.length > 0 ? (
                                                <div className="space-y-2">
                                                    {otherParents.map((spl) => (
                                                        <CoParentCard
                                                            key={spl.parent.id}
                                                            link={spl}
                                                            currentParentId={parentId}
                                                            onNavigate={(id) => router.push(`/dashboard/schools/profiles/parents/${id}`)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground">
                                                    No other parents linked to this student
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="py-16 text-center space-y-2">
                            <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                            <p className="font-semibold text-muted-foreground text-sm">No Students Linked</p>
                            <p className="text-xs text-muted-foreground">No students are linked to this parent account.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}