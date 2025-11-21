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

export default function PartnerLeads() {
  const { fullUser } = useAuth();
  const queryClient = useQueryClient();
  const [partnerId] = useState(fullUser?.partner?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formData, setFormData] = useState({
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

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      if (!formData.schoolName || !formData.contactPerson || !formData.contactPhone || !formData.contactEmail) {
        throw new Error('Please fill all required fields');
      }

      return axios.post('/api/partners/leads', {
        partnerId,
        ...formData
      }).then(res => res.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['partner-leads']);
      queryClient.invalidateQueries(['partner-stats']);
      
      toast.success("Success!", {
        description: data.message || "Lead added successfully",
      });

      setDialogOpen(false);
      setFormData({
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
      });
    },
    onError: (err) => {
      toast.error("Failed", {
        description: err.message || "Failed to add lead",
      });
    },
  });

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

  const handleSubmit = () => createLeadMutation.mutate();
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
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

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  placeholder="e.g., Springfield High School"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Principal/Admin name"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Phone *</Label>
                  <Input
                    id="contactPhone"
                    placeholder="10-digit number"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@school.com"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="estimatedStudents">Est. Students</Label>
                  <Input
                    id="estimatedStudents"
                    type="number"
                    placeholder="500"
                    value={formData.estimatedStudents}
                    onChange={(e) => handleChange('estimatedStudents', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currentSystem">Current System</Label>
                  <Input
                    id="currentSystem"
                    placeholder="Manual/Other software"
                    value={formData.currentSystem}
                    onChange={(e) => handleChange('currentSystem', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
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
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
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
      </motion.div>

      {/* Leads Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
                          className="group hover:bg-muted/50 transition-colors"
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
                                variant="ghost"
                                onClick={() => handleDelete(lead.id)}
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
    </div>
  );
}