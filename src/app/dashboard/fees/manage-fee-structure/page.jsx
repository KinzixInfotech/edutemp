'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, Eye, Loader2, Save, X,
  FileText, Copy, Archive, Lock, CheckCircle,
  AlertCircle, MoreVertical, GripVertical,
  ChevronDown, ChevronRight, Check, Tag,
  Shield, Info, Bus, BookOpen, Zap, Sparkles,
  Calendar, CreditCard, Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Schema ───────────────────────────────────────────────────────────────────
const feeSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  classId: z.number().positive('Class required'),
  particulars: z.array(z.object({
    name: z.string().min(1, 'Required'),
    amount: z.number().positive('Must be > 0'),
    type: z.enum(['MONTHLY', 'ONE_TIME', 'ANNUAL', 'TERM']).default('MONTHLY'),
    category: z.enum(['TUITION', 'TRANSPORT', 'ACTIVITY', 'ADMISSION', 'EXAMINATION', 'LIBRARY', 'LABORATORY', 'SPORTS', 'HOSTEL', 'DEVELOPMENT', 'FINE', 'MISCELLANEOUS']).default('TUITION'),
    chargeTiming: z.enum(['SESSION_START', 'ON_ADMISSION', 'ON_PROMOTION', 'MONTHLY']).default('SESSION_START'),
    serviceId: z.string().uuid().nullable().optional(),
    lateFeeRuleId: z.string().uuid().nullable().optional(),
    isOptional: z.boolean().default(false),
    applicableMonths: z.array(z.string()).nullable().optional(),
  })).min(1),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  ARCHIVED: 'bg-gray-100 text-gray-700 border-gray-200',
};
const STATUS_LABELS = { DRAFT: 'Draft', ACTIVE: 'Active', ARCHIVED: 'Archived' };
const STATUS_ICONS = { DRAFT: Edit, ACTIVE: CheckCircle, ARCHIVED: Archive };

const CATEGORY_ICONS = {
  TUITION: BookOpen, ADMISSION: FileText, EXAMINATION: FileText,
  LIBRARY: BookOpen, LABORATORY: Zap, SPORTS: Zap, ACTIVITY: Sparkles,
  TRANSPORT: Bus, HOSTEL: Shield, DEVELOPMENT: Sparkles,
  FINE: AlertCircle, MISCELLANEOUS: Tag,
};

const TYPE_CONFIG = {
  MONTHLY: { label: 'Monthly', hint: '× 12 entries', per: '/ month' },
  ONE_TIME: { label: 'One-time', hint: '× 1 entry', per: 'one-time' },
  ANNUAL: { label: 'Annual', hint: '× 1 entry', per: '/ year' },
  TERM: { label: 'Per Term', hint: '× 4 entries', per: '/ term' },
};

const GROUPS = [
  {
    key: 'monthly',
    label: '📘 Monthly Fees',
    description: 'Recurring monthly charges',
    color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    headerColor: 'text-blue-700 dark:text-blue-300',
    match: (p) => p.type === 'MONTHLY',
  },
  {
    key: 'annual',
    label: '📅 Annual / Term Fees',
    description: 'Charged once per session or per term',
    color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    headerColor: 'text-emerald-700 dark:text-emerald-300',
    match: (p) => p.type === 'ANNUAL' || p.type === 'TERM',
  },
  {
    key: 'onetime',
    label: '🧾 One-time / Admission Fees',
    description: 'Charged once on joining',
    color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
    headerColor: 'text-purple-700 dark:text-purple-300',
    match: (p) => p.type === 'ONE_TIME',
  },
];

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const INR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const defaultParticular = () => ({ name: '', amount: 0, type: 'MONTHLY', category: 'TUITION', chargeTiming: 'SESSION_START', serviceId: null, lateFeeRuleId: null, isOptional: false, applicableMonths: null });

const LS_KEY = 'fee_structure_draft';

// ─── Month range label ────────────────────────────────────────────────────────
function monthRangeLabel(months) {
  if (!months || months.length === 0) return 'Apr – Mar';
  if (months.length === 12) return 'Apr – Mar';
  if (months.length === 1) return months[0];
  return `${months[0]} – ${months[months.length - 1]}`;
}

// ─── Particular Row ───────────────────────────────────────────────────────────
function ParticularRow({ index, register, watch, setValue, remove, canRemove, lateFeeRules, services, isNew, onNewMounted }) {
  const [expanded, setExpanded] = useState(true);
  const rowRef = useRef(null);
  const nameInputRef = useRef(null);

  // Auto-scroll into view and focus the name input when newly added
  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      nameInputRef.current?.focus();
      onNewMounted?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [isNew]);
  const type = watch(`particulars.${index}.type`);
  const category = watch(`particulars.${index}.category`);
  const months = watch(`particulars.${index}.applicableMonths`) || [];
  const optional = watch(`particulars.${index}.isOptional`);
  const amount = watch(`particulars.${index}.amount`) || 0;
  const name = watch(`particulars.${index}.name`);
  const CatIcon = CATEGORY_ICONS[category] || Tag;
  const annualTotal = type === 'MONTHLY' ? amount * 12 : type === 'TERM' ? amount * 4 : amount;

  const handleTypeChange = (val) => {
    setValue(`particulars.${index}.type`, val);
    if (val === 'MONTHLY') setValue(`particulars.${index}.chargeTiming`, 'MONTHLY');
    if (val === 'ANNUAL') setValue(`particulars.${index}.chargeTiming`, 'SESSION_START');
    if (val === 'ONE_TIME') setValue(`particulars.${index}.chargeTiming`, 'ON_ADMISSION');
    if (val === 'TERM') setValue(`particulars.${index}.chargeTiming`, 'SESSION_START');
  };

  const toggleMonth = (m) => {
    const cur = watch(`particulars.${index}.applicableMonths`) || [];
    setValue(`particulars.${index}.applicableMonths`, cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m]);
  };

  return (
    <div ref={rowRef} className="border rounded-lg overflow-hidden bg-white dark:bg-background">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
        <div className="w-7 h-7 rounded-md bg-background border flex items-center justify-center shrink-0">
          <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {name || <span className="text-muted-foreground italic">Unnamed component</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{TYPE_CONFIG[type]?.label}</Badge>
            {type === 'MONTHLY' && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />{monthRangeLabel(months)}
              </span>
            )}
            {optional && (
              <span className="text-[10px] text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">Optional</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">{INR(amount)}<span className="text-[10px] text-muted-foreground font-normal ml-1">{TYPE_CONFIG[type]?.per}</span></p>
          {(type === 'MONTHLY' || type === 'TERM') && (
            <p className="text-[10px] text-muted-foreground">{INR(annualTotal)} / yr</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canRemove && (
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(index); }}
              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4 border-t">
          {/* Name + Amount + Category */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Component Name</Label>
              <Input
                {...register(`particulars.${index}.name`)}
                ref={(el) => {
                  register(`particulars.${index}.name`).ref(el);
                  nameInputRef.current = el;
                }}
                placeholder="e.g. Tuition Fee"
                className="h-9"
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
              <Input type="number" {...register(`particulars.${index}.amount`, { valueAsNumber: true })} placeholder="0" className="h-9" />
            </div>
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={v => setValue(`particulars.${index}.category`, v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['TUITION', 'ADMISSION', 'EXAMINATION', 'LIBRARY', 'LABORATORY', 'SPORTS', 'TRANSPORT', 'HOSTEL', 'DEVELOPMENT', 'ACTIVITY', 'FINE', 'MISCELLANEOUS'].map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Type pills */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Billing Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (
                <button key={val} type="button" onClick={() => handleTypeChange(val)}
                  className={`relative flex flex-col items-start px-3 py-2 rounded-lg border-2 text-left transition-all ${type === val ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border hover:border-muted-foreground/40'
                    }`}>
                  {type === val && (
                    <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                  <span className={`text-xs font-semibold ${type === val ? 'text-green-700 dark:text-green-400' : ''}`}>{cfg.label}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{cfg.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Applicable months */}
          {type === 'MONTHLY' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Applicable Months</Label>
                {months.length === 0
                  ? <span className="text-[10px] bg-green-50 dark:bg-green-950/20 text-green-600 px-2 py-0.5 rounded-full">All 12 months (Apr – Mar)</span>
                  : <button type="button" onClick={() => setValue(`particulars.${index}.applicableMonths`, [])} className="text-[10px] text-muted-foreground underline">Reset to all</button>
                }
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map(m => (
                  <button key={m} type="button" onClick={() => toggleMonth(m)}
                    className={`w-10 h-7 rounded text-xs font-medium transition-all ${months.includes(m) ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Late Fee Rule + Service */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Late Fee Rule</Label>
                <Tooltip>
                  <TooltipTrigger type="button"><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs">Per-component rule overrides school default</p></TooltipContent>
                </Tooltip>
              </div>
              <Select value={watch(`particulars.${index}.lateFeeRuleId`) || 'none'} onValueChange={v => setValue(`particulars.${index}.lateFeeRuleId`, v === 'none' ? null : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="School default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">None (school default)</span></SelectItem>
                  {lateFeeRules?.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.type === 'FIXED' ? `₹${r.amount}` : `${r.percentage}%`} after {r.graceDays}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Linked Service</Label>
              <Select value={watch(`particulars.${index}.serviceId`) || 'none'} onValueChange={v => setValue(`particulars.${index}.serviceId`, v === 'none' ? null : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                  {services?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — ₹{s.monthlyFee}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
            <div>
              <p className="text-sm font-medium">Optional Component</p>
              <p className="text-xs text-muted-foreground mt-0.5">Only applied when manually selected per student. Excluded from annual total.</p>
            </div>
            <Switch checked={optional} onCheckedChange={v => setValue(`particulars.${index}.isOptional`, v)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grouped Section in Dialog ────────────────────────────────────────────────
function GroupSection({ group, fields, register, watch, setValue, remove, append, lateFeeRules, services, newlyAddedIndex, onNewMounted }) {
  const groupFields = fields.map((f, i) => ({ ...f, _idx: i })).filter(f => group.match(watch(`particulars.${f._idx}`)));

  return (
    <div className={`border rounded-lg overflow-hidden ${group.color}`}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <div>
          <p className={`text-sm font-semibold ${group.headerColor}`}>{group.label}</p>
          <p className="text-xs text-muted-foreground">{group.description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const defaultType = group.key === 'monthly' ? 'MONTHLY' : group.key === 'annual' ? 'ANNUAL' : 'ONE_TIME';
            const defaultTiming = defaultType === 'MONTHLY' ? 'MONTHLY' : defaultType === 'ONE_TIME' ? 'ON_ADMISSION' : 'SESSION_START';
            append({ ...defaultParticular(), type: defaultType, chargeTiming: defaultTiming });
          }}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-background/60"
        >
          <Plus className="w-3 h-3" />Add
        </button>
      </div>

      <div className="space-y-2 p-2 bg-background/60">
        {groupFields.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3 italic">No components yet — click Add</p>
        ) : (
          groupFields.map(f => (
            <ParticularRow
              key={f.id}
              index={f._idx}
              register={register}
              watch={watch}
              setValue={setValue}
              remove={remove}
              canRemove={fields.length > 1}
              lateFeeRules={lateFeeRules}
              services={services}
              isNew={f._idx === newlyAddedIndex}
              onNewMounted={onNewMounted}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FeeStructuresManagement() {
  const { fullUser } = useAuth();
  const { selectedYear } = useAcademicYear();
  const sidebarAcademicYearId = selectedYear?.id;
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStructure, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneYearId, setCloneYearId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [newlyAddedIndex, setNewlyAddedIndex] = useState(null);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues: { name: '', description: '', particulars: [defaultParticular()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'particulars' });

  // ── LocalStorage persistence: save form on every change ──
  const watchedValues = watch();
  useEffect(() => {
    if (!isDialogOpen) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        values: watchedValues,
        isEditing,
        selectedStructureId: selectedStructure?.id || null,
        savedAt: Date.now(),
      }));
    } catch (_) { }
  }, [JSON.stringify(watchedValues), isDialogOpen]);

  // ── LocalStorage persistence: restore on open if draft exists ──
  const openCreate = () => {
    setIsEditing(false);
    setSelected(null);

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only restore if it was a "create" draft (no selectedStructureId) and less than 24h old
        const age = Date.now() - (parsed.savedAt || 0);
        if (!parsed.selectedStructureId && !parsed.isEditing && age < 86400000 && parsed.values?.name) {
          reset(parsed.values);
          setIsDialogOpen(true);
          setHasDraftRestored(true);
          return;
        }
      }
    } catch (_) { }

    reset({ name: '', description: '', particulars: [defaultParticular()] });
    setIsDialogOpen(true);
    setHasDraftRestored(false);
  };

  const openEdit = (s) => {
    setSelected(s);
    setIsEditing(true);
    setHasDraftRestored(false);

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.savedAt || 0);
        if (parsed.selectedStructureId === s.id && parsed.isEditing && age < 86400000) {
          reset(parsed.values);
          setIsDialogOpen(true);
          setHasDraftRestored(true);
          return;
        }
      }
    } catch (_) { }

    reset({
      name: s.name,
      description: s.description || '',
      classId: s.classId,
      particulars: s.particulars.map(p => ({
        name: p.name,
        amount: p.amount,
        type: p.type || 'MONTHLY',
        category: p.category,
        chargeTiming: p.chargeTiming || 'SESSION_START',
        serviceId: p.serviceId || null,
        lateFeeRuleId: p.lateFeeRuleId || null,
        isOptional: p.isOptional,
        applicableMonths: p.applicableMonths ? JSON.parse(p.applicableMonths) : null,
      })),
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setIsEditing(false);
    setSelected(null);
    setHasDraftRestored(false);
    reset({ name: '', description: '', particulars: [defaultParticular()] });
    // Clear localStorage draft on intentional close via Cancel / Save
  };

  const clearDraftAndClose = () => {
    try { localStorage.removeItem(LS_KEY); } catch (_) { }
    closeDialog();
  };

  // ── Queries ──
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: async () => { const r = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`); if (!r.ok) throw new Error('Failed'); return r.json(); },
    enabled: !!schoolId, staleTime: 1000 * 60 * 10, refetchOnWindowFocus: false,
  });
  const { data: classes } = useQuery({
    queryKey: ['classes', schoolId, sidebarAcademicYearId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sidebarAcademicYearId) params.append('academicYearId', sidebarAcademicYearId);
      const r = await fetch(`/api/schools/${schoolId}/classes?${params}`);
      if (!r.ok) throw new Error('Failed'); return r.json();
    },
    enabled: !!schoolId, staleTime: 1000 * 60 * 10, refetchOnWindowFocus: false,
  });
  const { data: lateFeeRules } = useQuery({
    queryKey: ['late-fee-rules', schoolId],
    queryFn: async () => { const r = await fetch(`/api/schools/fee/late-fee-rules?schoolId=${schoolId}`); if (!r.ok) throw new Error('Failed'); return (await r.json()).rules; },
    enabled: !!schoolId, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false,
  });
  const { data: services } = useQuery({
    queryKey: ['fee-services', schoolId],
    queryFn: async () => { const r = await fetch(`/api/schools/fee/services?schoolId=${schoolId}`); if (!r.ok) throw new Error('Failed'); return (await r.json()).services; },
    enabled: !!schoolId, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false,
  });

  const academicYearId = academicYears?.find(y => y.isActive)?.id;
  const [selectedYearId, setSelectedYearId] = useState(null);
  const activeAcademicYearId = selectedYearId || academicYearId;

  const { data: structures, isLoading } = useQuery({
    queryKey: ['fee-structures', schoolId, activeAcademicYearId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolId, academicYearId: activeAcademicYearId, ...(statusFilter !== 'all' && { status: statusFilter }), includeArchived: statusFilter === 'ARCHIVED' || statusFilter === 'all' ? 'true' : 'false' });
      const r = await fetch(`/api/schools/fee/global-structures?${params}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!schoolId && !!activeAcademicYearId, staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false,
  });

  // ── Mutations ──
  const inv = () => queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const r = await fetch('/api/schools/fee/global-structures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, schoolId, academicYearId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
    },
    onSuccess: () => { toast.success('Fee structure created'); inv(); try { localStorage.removeItem(LS_KEY); } catch (_) { } closeDialog(); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const r = await fetch('/api/schools/fee/global-structures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id: selectedStructure?.id }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
    },
    onSuccess: () => { toast.success('Structure updated'); inv(); try { localStorage.removeItem(LS_KEY); } catch (_) { } closeDialog(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = useMutation({ mutationFn: async (id) => { const r = await fetch(`/api/schools/fee/global-structures?id=${id}`, { method: 'DELETE' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }, onSuccess: () => { toast.success('Deleted'); inv(); }, onError: e => toast.error(e.message) });
  const archiveMutation = useMutation({ mutationFn: async (id) => { const r = await fetch('/api/schools/fee/global-structures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'archive' }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }, onSuccess: () => { toast.success('Archived'); inv(); }, onError: e => toast.error(e.message) });
  const unarchiveMutation = useMutation({ mutationFn: async (id) => { const r = await fetch('/api/schools/fee/global-structures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'unarchive' }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }, onSuccess: () => { toast.success('Restored to Active'); inv(); }, onError: e => toast.error(e.message) });
  const cloneMutation = useMutation({ mutationFn: async ({ id, newName, targetAcademicYearId }) => { const r = await fetch('/api/schools/fee/global-structures', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'clone', newName, targetAcademicYearId }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }, onSuccess: () => { toast.success('Cloned as Draft'); inv(); setCloneOpen(false); }, onError: e => toast.error(e.message) });

  const onSubmit = (data) => isEditing ? updateMutation.mutate(data) : createMutation.mutate(data);

  // ── Totals ──
  const allParticulars = watch('particulars') || [];
  const requiredTotal = allParticulars.filter(p => !p.isOptional).reduce((sum, p) => {
    const mult = p.type === 'MONTHLY' ? 12 : p.type === 'TERM' ? 4 : 1;
    return sum + ((Number(p.amount) || 0) * mult);
  }, 0);
  const optionalTotal = allParticulars.filter(p => p.isOptional).reduce((sum, p) => {
    const mult = p.type === 'MONTHLY' ? 12 : p.type === 'TERM' ? 4 : 1;
    return sum + ((Number(p.amount) || 0) * mult);
  }, 0);
  const hasOptional = optionalTotal > 0;

  const stats = { total: structures?.length || 0, draft: structures?.filter(s => s.status === 'DRAFT').length || 0, active: structures?.filter(s => s.status === 'ACTIVE').length || 0, archived: structures?.filter(s => s.status === 'ARCHIVED').length || 0 };
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-green-600" />Fee Structures
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage fee templates by class</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Create Structure
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Structures', value: stats.total, key: 'all', Icon: FileText, color: 'text-muted-foreground' },
            { label: 'Draft', value: stats.draft, key: 'DRAFT', Icon: Edit, color: 'text-yellow-500' },
            { label: 'Active', value: stats.active, key: 'ACTIVE', Icon: CheckCircle, color: 'text-green-500' },
            { label: 'Archived', value: stats.archived, key: 'ARCHIVED', Icon: Archive, color: 'text-gray-500' },
          ].map(s => (
            <Card key={s.key} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter(s.key)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <s.Icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        <Card className="border-0 shadow-none border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Structures ({structures?.length || 0})</CardTitle>
                <CardDescription>All fee structures for the active academic year</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={activeAcademicYearId || ''} onValueChange={setSelectedYearId}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears?.map(yr => (
                      <SelectItem key={yr.id} value={yr.id}>
                        {yr.name} {yr.isActive ? '(Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
            ) : structures?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No fee structures found</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Create a structure for each class to get started</p>
                <Button variant="outline" size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create Structure</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {structures?.map(s => {
                  const StatusIcon = STATUS_ICONS[s.status];
                  const isDraft = s.status === 'DRAFT';
                  const isActive = s.status === 'ACTIVE';
                  const isArchived = s.status === 'ARCHIVED';
                  const assigned = s._count?.studentFees || 0;

                  const monthly = s.particulars?.filter(p => p.type === 'MONTHLY' && !p.isOptional) || [];
                  const annual = s.particulars?.filter(p => (p.type === 'ANNUAL' || p.type === 'TERM') && !p.isOptional) || [];
                  const oneTime = s.particulars?.filter(p => p.type === 'ONE_TIME' && !p.isOptional) || [];
                  const optional = s.particulars?.filter(p => p.isOptional) || [];

                  return (
                    <div key={s.id} className={`border rounded-lg p-4 hover:bg-muted/20 transition-colors ${isArchived ? 'opacity-60 hover:opacity-100' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{s.name}</h3>
                            <Badge className={STATUS_COLORS[s.status]}>
                              <StatusIcon className="w-3 h-3 mr-1" />{STATUS_LABELS[s.status]}
                            </Badge>
                            {s.version > 1 && <Badge variant="secondary">v{s.version}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {s.class?.className} &middot; {s.particulars?.length || 0} components &middot; Created {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {monthly.length > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                📘 {monthly.length} monthly
                              </span>
                            )}
                            {annual.length > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                                📅 {annual.length} annual
                              </span>
                            )}
                            {oneTime.length > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                🧾 {oneTime.length} one-time
                              </span>
                            )}
                            {optional.length > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800">
                                ⭐ {optional.length} optional
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => { setSelected(s); setViewOpen(true); }}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                            {isDraft && <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => { setCloneTarget(s); setCloneName(`${s.name} (Copy)`); setCloneYearId(academicYearId); setCloneOpen(true); }}><Copy className="w-4 h-4 mr-2" />Clone</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isActive && <DropdownMenuItem onClick={() => archiveMutation.mutate(s.id)} className="text-orange-600"><Archive className="w-4 h-4 mr-2" />Archive</DropdownMenuItem>}
                            {isArchived && <DropdownMenuItem onClick={() => unarchiveMutation.mutate(s.id)} className="text-green-600"><CheckCircle className="w-4 h-4 mr-2" />Restore</DropdownMenuItem>}
                            {isDraft && <DropdownMenuItem onClick={() => { if (confirm('Delete this draft?')) deleteMutation.mutate(s.id); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>}
                            {(isActive || isArchived) && <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />{isArchived ? 'Read only' : `${assigned} students`}</div>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Annual Total <span className="text-[10px]">(excl. optional)</span></p>
                            <p className="text-xl font-bold">{INR(s.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <p className="text-base font-semibold">{assigned} students</p>
                          </div>
                        </div>
                        {/* {isDraft && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Assign to Students</Button>} */}
                        {isActive && <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />In Use</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ CREATE / EDIT DIALOG — LANDSCAPE GRID LAYOUT ══ */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          // When closed via backdrop/Escape (not Cancel/Save), preserve draft in localStorage
          if (!open) {
            setIsDialogOpen(false);
            setIsEditing(false);
            setSelected(null);
            setHasDraftRestored(false);
            // Do NOT reset form or clear localStorage — draft is preserved
          }
        }}>
          <DialogContent
            className="p-0 overflow-hidden flex flex-col !max-w-none"
            style={{ width: 'min(95vw, 1100px)', height: '90vh', maxHeight: '90vh' }}
          >
            {/* ── Dialog Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b shrink-0 bg-background">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold">
                  {isEditing ? 'Edit Fee Structure' : 'Create Fee Structure'}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {isEditing ? 'Only DRAFT structures can be edited.' : 'Create and publish a fee structure.'}
                  {(watch('classId') || isEditing) && (
                    <span className="ml-2 text-foreground font-medium">
                      {classes?.find(c => c.id === watch('classId'))?.className || selectedStructure?.class?.className || ''}
                      {' · '}
                      {academicYears?.find(y => y.id === academicYearId)?.name || ''}
                    </span>
                  )}
                </DialogDescription>
              </div>

              {/* Draft restored banner */}
              {hasDraftRestored && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved draft restored
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.removeItem(LS_KEY); } catch (_) { }
                      reset({ name: '', description: '', particulars: [defaultParticular()] });
                      setHasDraftRestored(false);
                    }}
                    className="ml-1 underline text-amber-600 hover:text-amber-800"
                  >
                    Discard
                  </button>
                </div>
              )}

              {/* Live total */}
              <div className="text-right ml-4 shrink-0">
                <p className="text-xs text-muted-foreground">Est. Annual (required)</p>
                <p className="text-xl font-bold text-green-600">{INR(requiredTotal)}</p>
                {hasOptional && (
                  <p className="text-[10px] text-muted-foreground">+{INR(optionalTotal)} optional</p>
                )}
              </div>
            </div>

            {/* ── Two-column grid body ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-[320px_1fr] divide-y md:divide-y-0 md:divide-x">

                {/* ── LEFT PANEL: Basic Info + Summary + Actions ── */}
                <div className="flex flex-col overflow-y-auto p-5 space-y-5 bg-muted/20 md:h-full h-auto">

                  {/* Basic Info */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</p>

                    <div className="space-y-1.5">
                      <Label>Structure Name *</Label>
                      <Input {...register('name')} placeholder="e.g. Class 1 Annual Fee 2025–26" className={errors.name ? 'border-red-400' : ''} />
                      {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Class *</Label>
                      <Select value={watch('classId')?.toString() || ''} onValueChange={v => setValue('classId', parseInt(v))}>
                        <SelectTrigger className={errors.classId ? 'border-red-400' : ''}><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input {...register('description')} placeholder="Optional note" />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Summary card */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">Estimated Annual Total</p>
                        <p className="text-xs text-muted-foreground">MONTHLY×12, TERM×4, others×1</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{INR(requiredTotal)}</p>
                    </div>
                    {hasOptional && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t bg-orange-50/50 dark:bg-orange-950/10">
                        <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <Star className="w-3 h-3" />Optional services (excluded)
                        </p>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">+{INR(optionalTotal)}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={clearDraftAndClose}>Cancel</Button>
                    <Button type="submit" disabled={isPending} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      {isPending
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditing ? 'Saving…' : 'Creating…'}</>
                        : <><Save className="w-4 h-4 mr-2" />{isEditing ? 'Save Changes' : 'Publish Structure'}</>
                      }
                    </Button>
                  </div>
                </div>

                {/* ── RIGHT PANEL: Fee Components (scrollable) ── */}
                <div className="overflow-y-auto p-5 space-y-4 md:h-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Components</p>
                  {GROUPS.map(group => (
                    <GroupSection
                      key={group.key}
                      group={group}
                      fields={fields}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      remove={remove}
                      append={(item) => {
                        const nextIndex = fields.length;
                        append(item);
                        setNewlyAddedIndex(nextIndex);
                      }}
                      lateFeeRules={lateFeeRules}
                      services={services}
                      newlyAddedIndex={newlyAddedIndex}
                      onNewMounted={() => setNewlyAddedIndex(null)}
                    />
                  ))}
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══ VIEW DIALOG ══ */}
        {selectedStructure && (
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedStructure.name}
                  <Badge className={STATUS_COLORS[selectedStructure.status]}>{STATUS_LABELS[selectedStructure.status]}</Badge>
                </DialogTitle>
                <DialogDescription>{selectedStructure.class?.className}{selectedStructure.version > 1 && ` • v${selectedStructure.version}`}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {GROUPS.map(group => {
                  const groupItems = selectedStructure.particulars?.filter(p => group.match(p)) || [];
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group.key}>
                      <p className={`text-xs font-semibold mb-1.5 ${group.headerColor}`}>{group.label}</p>
                      {groupItems.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg mb-1.5">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] h-4">{TYPE_CONFIG[p.type]?.label}</Badge>
                              <span className="text-xs text-muted-foreground">{p.category}</span>
                              {p.isOptional && <span className="text-[10px] text-orange-500">Optional</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{INR(p.amount)}<span className="text-[10px] text-muted-foreground ml-1">{TYPE_CONFIG[p.type]?.per}</span></p>
                            {(p.type === 'MONTHLY' || p.type === 'TERM') && (
                              <p className="text-[10px] text-muted-foreground">{INR(p.type === 'MONTHLY' ? p.amount * 12 : p.amount * 4)}/yr</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {selectedStructure.particulars?.filter(p => p.isOptional).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5 text-orange-600">⭐ Optional Services</p>
                    {selectedStructure.particulars.filter(p => p.isOptional).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 border border-dashed rounded-lg mb-1.5 bg-orange-50/30 dark:bg-orange-950/10">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{TYPE_CONFIG[p.type]?.label}</Badge>
                        </div>
                        <p className="font-semibold">{INR(p.amount)}<span className="text-[10px] text-muted-foreground ml-1">{TYPE_CONFIG[p.type]?.per}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
                  <div>
                    <span className="font-semibold">Annual Total</span>
                    <p className="text-xs text-muted-foreground">Required fees only</p>
                  </div>
                  <span className="text-xl font-bold">{INR(selectedStructure.totalAmount)}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ══ CLONE DIALOG ══ */}
        <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Clone Fee Structure</DialogTitle>
              <DialogDescription>Creates a copy as a new Draft</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>New Name</Label>
                <Input value={cloneName} onChange={e => setCloneName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Academic Year</Label>
                <Select value={cloneYearId} onValueChange={setCloneYearId}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>{academicYears?.map(y => <SelectItem key={y.id} value={y.id}>{y.name}{y.isActive && ' (Current)'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Alert>
                <Copy className="w-4 h-4" />
                <AlertDescription className="text-xs">All components will be copied. New structure will be in <strong>Draft</strong>.</AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloneOpen(false)}>Cancel</Button>
              <Button onClick={() => cloneMutation.mutate({ id: cloneTarget?.id, newName: cloneName, targetAcademicYearId: cloneYearId })} disabled={cloneMutation.isPending || !cloneName} className="bg-green-600 hover:bg-green-700 text-white">
                {cloneMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                Create Clone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}