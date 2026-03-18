
'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
    User, ArrowLeft, Mail, Phone, MapPin, Calendar, Users, Briefcase,
    GraduationCap, Heart, ShieldAlert, Loader2, ExternalLink, School,
    FileText, X, Check, Building2, CreditCard, BadgeInfo,
    PhoneCall, Globe, Hash, UserCheck, Clock, AlertCircle, Pencil,
    Plus, Search, Link as LinkIcon, BookOpen, IndianRupee, TrendingUp, Camera, Save
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";
import { uploadFilesToR2 } from '@/hooks/useR2Upload';

// --- Shared Inline Components ---

const RELATION_COLORS = {
    FATHER: 'bg-blue-50 text-blue-700 border-blue-200',
    MOTHER: 'bg-pink-50 text-pink-700 border-pink-200',
    GUARDIAN: 'bg-purple-50 text-purple-700 border-purple-200',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

function RelationBadge({ relation }) {
    const color = RELATION_COLORS[relation?.toUpperCase()] || RELATION_COLORS.OTHER;
    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider', color)}>
            {relation || 'N/A'}
        </span>
    );
}

function EditableField({ label, value, field, editingField, editValues, onEdit, onSave, onCancel, onChange, placeholder, icon: Icon, type, customInput }) {
    const isEditing = editingField === field;
    return (
        <div className="group">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                {Icon && <Icon className="h-3 w-3" />}{label}
            </p>
            {isEditing ? (
                <div className="flex items-center gap-1.5">
                    {customInput ? customInput : (
                        <Input
                            type={type || 'text'}
                            value={editValues[field] ?? ''}
                            onChange={(e) => onChange(field, e.target.value)}
                            className="h-8 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') onSave(field); if (e.key === 'Escape') onCancel(); }}
                        />
                    )}
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

// ------------------------------------------

export default function StudentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const studentId = params.studentId;

    const [activeTab, setActiveTab] = useState('overview');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
    
    // Inline Edit State
    const [editingField, setEditingField] = useState(null);
    const [editValues, setEditValues] = useState({});

    // Fetch Student Data
    const { data: student, isLoading } = useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: async () => {
            const res = await axios.get(`/api/students/${studentId}`);
            return res.data;
        },
        enabled: !!schoolId && !!studentId,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: true,
    });

    // Fetch Classes for editing
    const { data: schoolClasses } = useQuery({
        queryKey: ['school-classes', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            return Array.isArray(res.data) ? res.data : res.data?.data || [];
        },
        enabled: !!schoolId,
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.patch(`/api/students/${studentId}`, data);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setEditingField(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to update');
        }
    });

    // Image upload handler
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        try {
            setIsUploadingImage(true);
            const res = await uploadFilesToR2('profiles', {
                files: [file],
                input: { schoolId },
            });

            if (res?.[0]?.url) {
                await axios.patch(`/api/students/${studentId}`, {
                    profilePicture: res[0].url,
                });
                queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
                queryClient.invalidateQueries({ queryKey: ['students'] });
                toast.success('Profile picture updated!');
            }
        } catch (err) {
            toast.error('Failed to upload image');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEdit = (field, value) => { setEditingField(field); setEditValues((p) => ({ ...p, [field]: value })); };
    const handleChange = (field, val) => setEditValues((p) => ({ ...p, [field]: val }));
    const handleSave = (field) => {
        let val = editValues[field];
        if (field === 'classId' || field === 'sectionId') val = parseInt(val);
        updateMutation.mutate({ [field]: val });
    };
    const handleCancel = () => { setEditingField(null); setEditValues({}); };
    const ep = { editingField, editValues, onEdit: handleEdit, onSave: handleSave, onCancel: handleCancel, onChange: handleChange };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <GraduationCap className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Student Not Found</h2>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }
    
    const parentsLinkedCount = student.studentParentLinks?.length || 0;

    return (
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => router.push('/dashboard/schools/manage-student')}>Students</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">{student.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 shrink-0 text-primary" />Student Profile
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">View and manage all details for this student account</p>
                </div>
                <Button onClick={() => router.back()} variant="outline" size="sm" className="shrink-0">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
            </div>

            {/* Hero */}
            <Card className="border py-0 border-border/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-primary/20" />
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                        <div className="relative group">
                            <Avatar className="h-20 w-20 shrink-0 ring-2 ring-border">
                                <AvatarImage src={student.user?.profilePicture} className="object-cover" />
                                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{student.name?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                {isUploadingImage ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-2.5">
                            <div>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                    <h2 className="text-xl font-bold">{student.name}</h2>
                                    <Badge variant={student.user?.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px] uppercase tracking-wider">
                                        {student.user?.status || 'UNKNOWN'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />{student.user?.email || student.email || 'No email linked'}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 bg-muted font-medium px-2.5 py-1 rounded-full text-foreground">
                                    <School className="h-3 w-3 text-primary" /> Class {student.class?.className || 'N/A'} - {student.section?.name || 'N/A'}
                                </span>
                                {student.rollNumber && (
                                    <span className="inline-flex items-center gap-1.5 bg-muted font-medium px-2.5 py-1 rounded-full text-foreground">
                                        <Hash className="h-3 w-3 text-primary" /> Roll #{student.rollNumber}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 bg-muted font-medium px-2.5 py-1 rounded-full text-foreground">
                                    <FileText className="h-3 w-3 text-muted-foreground" /> Adm: {student.admissionNo || 'N/A'}
                                </span>
                                {student.bloodGroup && (
                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 font-medium px-2.5 py-1 rounded-full">
                                        <Heart className="h-3 w-3" />{student.bloodGroup}
                                    </span>
                                )}
                                {student.admissionDate && (
                                    <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                                        <Calendar className="h-3 w-3" />
                                        Joined {new Date(student.admissionDate).toLocaleDateString()}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                                    <Users className="h-3 w-3" />{parentsLinkedCount} Parent{parentsLinkedCount !== 1 ? 's' : ''} linked
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9 bg-[#ebeef0] dark:bg-muted p-0.5 gap-0.5 flex-wrap">
                    {['overview', 'personal', 'address'].map((tab) => (
                        <TabsTrigger key={tab} value={tab} className="h-8 text-xs capitalize data-[state=active]:bg-background px-3">
                            {tab}
                        </TabsTrigger>
                    ))}
                    <TabsTrigger value="guardians" className="h-8 text-xs data-[state=active]:bg-background px-3">
                        Guardians{' '}
                        <span className="ml-1 bg-muted-foreground/20 text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">{parentsLinkedCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="fees" className="h-8 text-xs data-[state=active]:bg-background px-3">Fees</TabsTrigger>
                    <TabsTrigger value="academics" className="h-8 text-xs data-[state=active]:bg-background px-3">Academics</TabsTrigger>
                    <TabsTrigger value="documents" className="h-8 text-xs data-[state=active]:bg-background px-3">Documents</TabsTrigger>
                </TabsList>

                {/* ═══ OVERVIEW ═══ */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {student.hasFees && student.stats?.feeStatus && (
                            <Card className={cn(
                                student.stats.feeStatus === 'Paid'
                                    ? "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20"
                                    : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"
                            )}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fee Status</p>
                                        <p className={cn("text-2xl font-bold", student.stats.feeStatus === 'Paid' ? "text-green-600" : "text-red-600")}>
                                            {student.stats.feeStatus}
                                        </p>
                                    </div>
                                    <div className={cn("p-3 rounded-full", student.stats.feeStatus === 'Paid' ? "bg-green-500/20" : "bg-red-500/20")}>
                                        <IndianRupee className={cn("h-6 w-6", student.stats.feeStatus === 'Paid' ? "text-green-500" : "text-red-500")} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Attendance</p>
                                    <p className="text-2xl font-bold">{student.stats?.attendance || 0}%</p>
                                </div>
                                <div className="p-3 rounded-full bg-blue-500/20">
                                    <Clock className="h-6 w-6 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>

                        {student.hasExams && student.stats?.performance && (
                            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Performance</p>
                                        <p className="text-2xl font-bold">{student.stats.performance}</p>
                                    </div>
                                    <div className="p-3 rounded-full bg-purple-500/20">
                                        <TrendingUp className="h-6 w-6 text-purple-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {student.stats?.pendingTasks > 0 && (
                            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pending Tasks</p>
                                        <p className="text-2xl font-bold">{student.stats.pendingTasks}</p>
                                    </div>
                                    <div className="p-3 rounded-full bg-amber-500/20">
                                        <FileText className="h-6 w-6 text-amber-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <SectionCard title="Contact Information" icon={Phone}>
                            <div className="space-y-3">
                                <InfoRow label="Primary Phone" value={student.contactNumber} icon={Phone} />
                                <Separator />
                                <InfoRow label="Email" value={student.user?.email || student.email} icon={Mail} />
                                <Separator />
                                <InfoRow label="Address Details" value={student.Address || [student.city, student.state].filter(Boolean).join(", ")} icon={MapPin} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Academic Assignment" icon={School}>
                            <div className="space-y-3">
                                <InfoRow label="Class & Section" value={`${student.class?.className || '-'} ${student.section?.name ? '- ' + student.section?.name : ''}`} icon={School} />
                                <Separator />
                                <InfoRow label="Admission No." value={student.admissionNo} icon={Hash} />
                                <Separator />
                                <InfoRow label="Roll Number" value={student.rollNumber} icon={Hash} />
                            </div>
                        </SectionCard>

                        <SectionCard title="Guardians / Parents" icon={Users}>
                            {parentsLinkedCount > 0 ? (
                                <div className="space-y-2">
                                    {student.studentParentLinks.map((link) => (
                                        <div key={link.parent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer group transition-colors" onClick={() => router.push(`/dashboard/schools/profiles/parents/${link.parent.id}`)}>
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={link.parent.user?.profilePicture} />
                                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{link.parent.user?.name?.[0] || link.parent.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-semibold truncate">{link.parent.user?.name || link.parent.name}</p>
                                                    <RelationBadge relation={link.relation} />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">{link.parent.primaryPhone || link.parent.contactNumber || 'No phone listed'}</p>
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3 mt-1">
                                    {student.FatherName && <InfoRow label="Father (Legacy Data)" value={student.FatherName} mono={false} />}
                                    {student.MotherName && <InfoRow label="Mother (Legacy Data)" value={student.MotherName} mono={false} />}
                                    {!student.FatherName && !student.MotherName && (
                                        <p className="text-sm text-muted-foreground italic text-center py-4">No parents linked</p>
                                    )}
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </TabsContent>

                {/* ═══ PERSONAL ═══ */}
                <TabsContent value="personal" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <SectionCard title="Basic Information" icon={User}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                <EditableField label="Full Name" value={student.name} field="name" {...ep} icon={User} />
                                <EditableField label="Email Address" value={student.user?.email || student.email} field="email" type="email" {...ep} icon={Mail} />
                                <EditableField label="Date of Birth" value={student.dob ? new Date(student.dob).toLocaleDateString() : ''} field="dob" type="date" {...ep} icon={Calendar} 
                                    customInput={
                                        <Input type="date" value={editValues.dob ?? (student.dob ? new Date(student.dob).toISOString().split('T')[0] : '')} onChange={(e) => handleChange('dob', e.target.value)} className="h-8 text-sm flex-1" />
                                    } 
                                />
                                <EditableField label="Gender" value={student.gender} field="gender" {...ep} icon={User} 
                                    customInput={
                                        <Select value={editValues.gender ?? student.gender} onValueChange={(v) => handleChange('gender', v)}>
                                            <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                            <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                                        </Select>
                                    } 
                                />
                                <EditableField label="Blood Group" value={student.bloodGroup} field="bloodGroup" {...ep} icon={Heart} placeholder="e.g. O+" />
                                <EditableField label="Contact Phone" value={student.contactNumber} field="contactNumber" type="tel" {...ep} icon={Phone} placeholder="Phone number" />
                            </div>
                        </SectionCard>
                        <SectionCard title="System Account (Read-only)" icon={BadgeInfo}>
                            <div className="space-y-4">
                                <InfoRow label="Login Email" value={student.user?.email} icon={Mail} />
                                <Separator />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
                                        <UserCheck className="h-3 w-3" />Account Status
                                    </p>
                                    <Badge variant={student.user?.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px] uppercase">{student.user?.status || 'UNKNOWN'}</Badge>
                                </div>
                                <Separator />
                                <InfoRow label="User ID" value={student.userId} icon={Hash} mono />
                                <Separator />
                                <InfoRow label="Created" value={student.createdAt ? new Date(student.createdAt).toLocaleString('en-IN') : 'N/A'} icon={Calendar} />
                                <InfoRow label="Last Updated" value={student.updatedAt ? new Date(student.updatedAt).toLocaleString('en-IN') : 'N/A'} icon={Clock} />
                            </div>
                        </SectionCard>
                    </div>
                </TabsContent>

                {/* ═══ ADDRESS ═══ */}
                <TabsContent value="address" className="mt-4">
                    <SectionCard title="Address Details" icon={MapPin}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            <div className="sm:col-span-2 lg:col-span-4">
                                <EditableField label="Street / House Address" value={student.Address} field="Address" {...ep} icon={MapPin} placeholder="House no., Street, Area" />
                            </div>
                            <EditableField label="City" value={student.city} field="city" {...ep} icon={Building2} />
                            <EditableField label="State" value={student.state} field="state" {...ep} icon={MapPin} />
                            <EditableField label="PIN / Postal Code" value={student.postalCode} field="postalCode" {...ep} icon={Hash} />
                            <EditableField label="Country" value={student.country} field="country" {...ep} icon={Globe} />
                        </div>
                    </SectionCard>
                </TabsContent>

                {/* ═══ GUARDIANS ═══ */}
                <TabsContent value="guardians" className="mt-4 space-y-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{parentsLinkedCount} Linked Guardian{parentsLinkedCount !== 1 ? 's' : ''}</span>
                    </div>

                    {parentsLinkedCount > 0 ? (
                        student.studentParentLinks.map((link) => {
                            const parent = link.parent;
                            return (
                                <Card key={parent.id} className="border border-border/50 overflow-hidden">
                                    <div className={cn('px-5 py-3 border-b flex flex-col sm:flex-row items-center sm:items-start gap-4', 'bg-muted/20')}>
                                        <Avatar
                                            className="h-14 w-14 shrink-0 ring-2 ring-border cursor-pointer"
                                            onClick={() => router.push(`/dashboard/schools/profiles/parents/${parent.id}`)}
                                        >
                                            <AvatarImage src={parent.user?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{parent.user?.name?.[0] || parent.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-center sm:text-left">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                                <h3
                                                    className="font-bold text-base hover:text-primary cursor-pointer transition-colors"
                                                    onClick={() => router.push(`/dashboard/schools/profiles/parents/${parent.id}`)}
                                                >
                                                    {parent.user?.name || parent.name}
                                                </h3>
                                                <RelationBadge relation={link.relation} />
                                                {link.isPrimary && (
                                                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Primary Contact</span>
                                                )}
                                                <Badge variant="outline" className={cn('text-[9px]', parent.user?.status === 'ACTIVE' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50')}>
                                                    {parent.user?.status || 'N/A'}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                {(parent.contactNumber || parent.primaryPhone) && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {parent.contactNumber || parent.primaryPhone}</span>}
                                                {(parent.email || parent.user?.email) && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {parent.email || parent.user?.email}</span>}
                                                {parent.occupation && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {parent.occupation}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs gap-1.5"
                                                onClick={() => router.push(`/dashboard/schools/profiles/parents/${parent.id}`)}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />View Profile
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center space-y-3">
                                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                <p className="font-semibold text-muted-foreground text-sm">No Parent Accounts Linked</p>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">This student does not have any parent app accounts linked. Instead, their basic details might be recorded directly on their profile.</p>

                                {(student.FatherName || student.MotherName) && (
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <div className="max-w-sm w-full p-4 bg-muted/30 rounded-lg text-left text-sm space-y-2">
                                            {student.FatherName && <div className="flex justify-between"><span>Father:</span> <b>{student.FatherName}</b></div>}
                                            {student.FatherNumber && <div className="flex justify-between"><span>Father Phone:</span> <b>{student.FatherNumber}</b></div>}
                                            <Separator />
                                            {student.MotherName && <div className="flex justify-between"><span>Mother:</span> <b>{student.MotherName}</b></div>}
                                            {student.MotherNumber && <div className="flex justify-between"><span>Mother Phone:</span> <b>{student.MotherNumber}</b></div>}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ═══ FEES ═══ */}
                <TabsContent value="fees" className="mt-4">
                    {student.studentFees?.length > 0 ? (
                        <div className="space-y-4">
                            {student.studentFees.map(fee => (
                                <Card key={fee.id} className="border-border/50">
                                    <CardHeader className="pb-3 bg-muted/10 border-b">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">{fee.globalFeeStructure?.name || 'Fee'}</CardTitle>
                                                <CardDescription>{fee.academicYear?.name}</CardDescription>
                                            </div>
                                            <Badge variant={fee.status === 'PAID' ? 'default' : fee.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                                                {fee.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="p-3 bg-muted/30 rounded-lg text-center shadow-sm">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Total</p>
                                                <p className="font-bold text-lg">₹{fee.finalAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-green-500/10 rounded-lg text-center shadow-sm border border-green-100">
                                                <p className="text-green-700 text-xs uppercase tracking-wider font-semibold mb-1">Paid</p>
                                                <p className="font-bold text-lg text-green-700">₹{fee.paidAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-red-500/10 rounded-lg text-center shadow-sm border border-red-100">
                                                <p className="text-red-700 text-xs uppercase tracking-wider font-semibold mb-1">Balance</p>
                                                <p className="font-bold text-lg text-red-700">₹{fee.balanceAmount?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {fee.installments?.length > 0 && (
                                            <div className="mt-4 pt-4 border-t space-y-2">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <Clock className="w-3" /> Installment Schedule
                                                </p>
                                                {fee.installments.map(inst => (
                                                    <div key={inst.id} className="flex justify-between items-center text-sm p-3 bg-muted/20 border border-border/30 rounded-lg hover:bg-muted/40 transition-colors">
                                                        <span className="font-medium text-foreground/80">{inst.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-muted-foreground text-[11px] font-mono">{new Date(inst.dueDate).toLocaleDateString('en-GB')}</span>
                                                            <span className="font-bold w-16 text-right">₹{inst.amount?.toLocaleString()}</span>
                                                            <Badge variant={inst.status === 'PAID' ? 'default' : 'outline'} className="text-[10px] uppercase w-16 justify-center">
                                                                {inst.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="font-medium text-muted-foreground">No Fee Structures Assigned</h3>
                                <p className="text-sm text-muted-foreground/60 mb-4">This student does not have any active fee assignments.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ═══ ACADEMICS ═══ */}
                <TabsContent value="academics" className="mt-4">
                    {student.examResults?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {student.examResults.map(result => (
                                <SectionCard key={result.id} title={result.exam?.title || 'Exam'} icon={BookOpen}>
                                    <div className="space-y-3">
                                        <InfoRow label="Subject" value={result.subject?.subjectName} icon={FileText} />
                                        <div className="flex justify-between items-end border-t pt-3 mt-3">
                                            <div>
                                                <p className="text-2xl font-bold text-primary">{result.marksObtained || '-'}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grade: {result.grade || 'N/A'}</p>
                                            </div>
                                            {result.remarks && (
                                                <p className="text-xs text-muted-foreground italic max-w-[120px] line-clamp-2 text-right">
                                                    "{result.remarks}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </SectionCard>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="font-medium text-muted-foreground">No Exam Results</h3>
                                <p className="text-sm text-muted-foreground/60">Results will appear here after examinations.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ═══ DOCUMENTS ═══ */}
                <TabsContent value="documents" className="mt-4">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="font-medium text-muted-foreground">No Documents</h3>
                            <p className="text-sm text-muted-foreground/60">Documents and attachments will appear here.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

