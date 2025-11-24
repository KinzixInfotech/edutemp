// app/partnerprogram/leads/page.jsx
'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
  Loader2, Plus, Eye, Trash2, Users,
  AlertCircle, Filter, Calendar, Phone, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  History,
  Building2,
  MapPin,
  User,
  Target,
  Briefcase,
  GraduationCap,
  IndianRupee
} from "lucide-react";


const PRICE_PER_STUDENT = 500;

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const leadSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  contactPerson: z.string().min(2, "Contact person is required"),
  contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  contactEmail: z.string().email("Invalid email address"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  estimatedStudents: z.string().transform((val) => val === "" ? undefined : Number(val)).optional(),
  currentSystem: z.string().optional(),
  notes: z.string().optional(),
});

export default function PartnerLeads() {
  const { fullUser } = useAuth();
  const queryClient = useQueryClient();
  const [partnerId] = useState(fullUser?.partner?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      schoolName: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      estimatedStudents: '',
      currentSystem: '',
      notes: ''
    }
  });

  // Fetch leads
  const { data: leadsData, isLoading: loading } = useQuery({
    queryKey: ['partner-leads', partnerId, filterStatus],
    queryFn: async () => {
      let url = `/api/partners/leads?partnerId=${partnerId}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;

      const res = await axios.get(url);
      return res.data;
    },
    enabled: !!partnerId,
  });

  const leads = leadsData?.leads || [];

  const createLeadMutation = useMutation({
    mutationFn: async (values) => {
      const pid = partnerId || fullUser?.partner?.id;
      if (!pid) throw new Error("Partner ID not found");

      return axios.post('/api/partners/leads', {
        partnerId: pid,
        ...values
      }).then(res => res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['partner-leads']);
      queryClient.invalidateQueries(['partner-stats']);

      toast.success("Success!", {
        description: data.message || "Lead added successfully",
      });

      setDialogOpen(false);
      form.reset();
    },
    onError: (err) => {
      toast.error("Failed", {
        description: err.message || "Failed to add lead",
      });
    },
  });

  const onSubmit = (values) => {
    console.log("Form submitted with values:", values);
    createLeadMutation.mutate(values);
  };

  const deleteLeadMutation = useMutation({
    mutationFn: async (id) => axios.delete('/api/partners/leads', { data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['partner-leads']);
      toast.success("Deleted", {
        description: "Lead deleted successfully",
      });
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to delete lead",
      });
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return axios.patch('/api/partners/leads', { id, status }).then(res => res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['partner-leads']);
      queryClient.invalidateQueries(['partner-stats']);

      // Update selected lead locally to reflect changes immediately in the sheet
      setSelectedLead(prev => ({
        ...prev, status: data.lead.status, activities: [
          { description: `Status changed to ${data.lead.status}`, createdAt: new Date() },
          ...(prev.activities || [])
        ]
      }));

      toast.success("Updated", {
        description: "Lead status updated successfully",
      });
    },
    onError: (err) => {
      toast.error("Failed", {
        description: err.message || "Failed to update lead",
      });
    }
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'DEMO_SCHEDULED': return 'bg-purple-500';
      case 'CONVERTED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'NEW': return 1;
      case 'IN_PROGRESS': return 2;
      case 'DEMO_SCHEDULED': return 3;
      case 'CONVERTED': return 4;
      case 'REJECTED': return 0;
      default: return 0;
    }
  };

  const LEAD_STAGES = [
    { id: 'NEW', label: 'New Lead', color: 'bg-blue-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
    { id: 'DEMO_SCHEDULED', label: 'Demo Set', color: 'bg-purple-500' },
    { id: 'CONVERTED', label: 'Converted', color: 'bg-green-500' }
  ];

  // Stats Calculation
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    inProgress: leads.filter(l => ['IN_PROGRESS', 'DEMO_SCHEDULED'].includes(l.status)).length,
    converted: leads.filter(l => l.status === 'CONVERTED').length,
    conversionRate: leads.length > 0
      ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100)
      : 0
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <AnimatePresence mode="wait">
        {!selectedLead ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Pipeline</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                  <p className="text-xs text-muted-foreground">Active conversations</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Converted</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.converted}</div>
                  <p className="text-xs text-muted-foreground">Successful closures</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Lead to deal ratio</p>
                </CardContent>
              </Card>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
                <p className="text-muted-foreground mt-1">
                  Track and manage your school referrals
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Lead
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                    <DialogDescription>
                      Submit a new school referral
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={form.control}
                        name="schoolName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Springfield High School" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Person *</FormLabel>
                              <FormControl>
                                <Input placeholder="Principal/Admin name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone *</FormLabel>
                              <FormControl>
                                <Input placeholder="10-digit number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@school.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal Code</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="estimatedStudents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Est. Students</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="500" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currentSystem"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current System</FormLabel>
                              <FormControl>
                                <Input placeholder="Manual/Other software" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any additional information..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createLeadMutation.isPending}
                          className="gap-2"
                        >
                          {createLeadMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add Lead
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filter */}
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Leads</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DEMO_SCHEDULED">Demo Scheduled</SelectItem>
                  <SelectItem value="CONVERTED">Converted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle>Your Leads</CardTitle>
                <CardDescription>
                  All school referrals submitted by you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>School Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {loading ? (
                          Array(5).fill(0).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                            </TableRow>
                          ))
                        ) : leads.length > 0 ? (
                          leads.map((lead, index) => (
                            <motion.tr
                              key={lead.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              className="group hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => setSelectedLead(lead)}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{lead.schoolName}</div>
                                  <div className="text-xs text-muted-foreground">{lead.city}</div>
                                </div>
                              </TableCell>
                              <TableCell>{lead.contactPerson}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {lead.contactPhone}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getStatusColor(lead.status)} text-white`}>
                                  {lead.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {lead.assignedTo ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{lead.assignedTo.name}</div>
                                    <div className="text-xs text-muted-foreground">{lead.assignedTo.email}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not assigned</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(lead.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(lead.id);
                                    }}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                <p className="text-muted-foreground">No leads found</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDialogOpen(true)}
                                >
                                  Add your first lead
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Detail View Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedLead(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  {selectedLead.schoolName}
                  <Badge className={getStatusColor(selectedLead.status)}>
                    {selectedLead.status.replace('_', ' ')}
                  </Badge>
                </h1>
                <p className="text-muted-foreground">
                  Lead ID: {selectedLead.id} • Added on {new Date(selectedLead.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Progress Stepper */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between w-full">
                  {LEAD_STAGES.map((stage, index) => {
                    const currentStep = getStatusStep(selectedLead.status);
                    const stepIndex = index + 1;
                    const isCompleted = currentStep > stepIndex;
                    const isCurrent = currentStep === stepIndex;
                    const isLast = index === LEAD_STAGES.length - 1;

                    return (
                      <div key={stage.id} className="flex flex-1 items-center last:flex-none">
                        <div className="relative flex flex-col items-center gap-2">
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 bg-background
                              ${(isCompleted || isCurrent) ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}
                              ${isCurrent ? 'scale-110 ring-4 ring-primary/20' : ''}
                            `}
                          >
                            {isCompleted ? <CheckCircle2 className="h-5 w-5 fill-primary text-primary-foreground" /> : <span className="text-sm font-bold">{stepIndex}</span>}
                          </div>
                          <span className={`absolute top-12 text-xs font-medium whitespace-nowrap ${(isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {stage.label}
                          </span>
                        </div>

                        {!isLast && (
                          <div className="flex-1 h-1 mx-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500 ease-out"
                              style={{
                                width: isCompleted ? '100%' : isCurrent ? '50%' : '0%'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="h-8" /> {/* Spacer for labels */}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Main Info */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      School Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">School Name</Label>
                        <p className="font-medium text-lg">{selectedLead.schoolName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Current System</Label>
                        <p className="font-medium">{selectedLead.currentSystem || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Est. Students</Label>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{selectedLead.estimatedStudents || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {[selectedLead.address, selectedLead.city, selectedLead.state, selectedLead.postalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Contact Person
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium text-lg">{selectedLead.contactPerson}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Role</Label>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Principal / Admin</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{selectedLead.contactPhone}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{selectedLead.contactEmail}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedLead.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                        {selectedLead.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar Actions */}
              <div className="space-y-6">
                {/* Financial Projection Card */}
                <Card className="bg-gradient-to-br from-background to-muted border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IndianRupee className="h-4 w-4 text-primary" />
                      Potential Earnings
                    </CardTitle>
                    <CardDescription>
                      Estimated based on {selectedLead.estimatedStudents || 0} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Contract Value</span>
                      <div className="text-2xl font-bold text-primary">
                        ₹{((selectedLead.estimatedStudents || 0) * PRICE_PER_STUDENT).toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Annual recurring revenue from this school
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Commission ({fullUser?.partner?.commissionRate || 10}%)</span>
                      <div className="text-xl font-bold text-green-600">
                        ₹{(((selectedLead.estimatedStudents || 0) * PRICE_PER_STUDENT) * ((fullUser?.partner?.commissionRate || 10) / 100)).toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recurring payout you will receive annually
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Update Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      value={selectedLead.status}
                      onValueChange={(val) => updateLeadMutation.mutate({ id: selectedLead.id, status: val })}
                      disabled={updateLeadMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STAGES.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Moving the lead forward will trigger automated notifications.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-4 w-4" />
                      Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {selectedLead.activities?.map((activity, i) => (
                          <div key={i} className="flex gap-3 relative">
                            <div className="mt-1 flex flex-col items-center">
                              <div className="h-2.5 w-2.5 rounded-full bg-primary z-10 ring-4 ring-background" />
                              {i !== (selectedLead.activities?.length || 0) && (
                                <div className="w-0.5 h-full bg-muted absolute top-3 left-[4px] -z-0" />
                              )}
                            </div>
                            <div className="space-y-1 pb-4">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-3 relative">
                          <div className="mt-1 flex flex-col items-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary z-10 ring-4 ring-background" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Lead Created</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(selectedLead.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}