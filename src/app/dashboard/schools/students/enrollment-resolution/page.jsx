"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Search, ShieldAlert, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORY_LABELS = {
  ALL: "All Open",
  LIKELY_ACTIVE: "Likely Active",
  NEEDS_VERIFICATION: "Needs Verification",
  HUGE_SESSION_GAP: "Huge Gap",
};

const ACTION_LABELS = {
  ENROLL_CURRENT_SESSION: "Enroll Current Session",
  IGNORE: "Ignore",
  MARK_ALUMNI: "Mark Alumni",
  MARK_TC: "Mark TC",
  MARK_DROPPED: "Mark Dropped",
  MARK_LEFT: "Mark Left",
};

function confidenceTone(value) {
  if (value >= 80) return "bg-green-100 text-green-700 border-green-200";
  if (value >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function predictionTone(prediction) {
  if (prediction?.isInCurrentSession) return "bg-green-100 text-green-700 border-green-200";
  if (prediction?.canEnroll) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export default function EnrollmentResolutionPage() {
  const { fullUser } = useAuth();
  const { selectedYear, activeYear } = useAcademicYear() || {};
  const schoolId = fullUser?.schoolId;
  const academicYear = selectedYear || activeYear;
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [sourceYearFilter, setSourceYearFilter] = useState("ALL");
  const [importBatchFilter, setImportBatchFilter] = useState("ALL");
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("IGNORE");

  const queryKey = ["enrollment-resolution-issues", schoolId, academicYear?.id, category, status, search, sourceYearFilter, importBatchFilter];
  const { data = {}, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "50",
        status,
      });
      if (academicYear?.id) params.set("academicYearId", academicYear.id);
      if (category !== "ALL") params.set("category", category);
      if (sourceYearFilter !== "ALL") params.set("sourceAcademicYearId", sourceYearFilter);
      if (importBatchFilter !== "ALL") params.set("importBatchId", importBatchFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/schools/${schoolId}/enrollment-resolution/issues?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load enrollment issues");
      return json;
    },
    enabled: !!schoolId,
    staleTime: 15 * 1000,
  });

  const issues = data.issues || [];
  const summary = data.summary || {};
  const filterOptions = data.filterOptions || {};
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectableIssues = useMemo(() => bulkAction === "ENROLL_CURRENT_SESSION"
    ? issues.filter((issue) => issue.prediction?.canEnroll)
    : issues, [bulkAction, issues]);

  useEffect(() => {
    if (bulkAction !== "ENROLL_CURRENT_SESSION") return;
    const allowed = new Set(selectableIssues.map((issue) => issue.id));
    setSelected((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [bulkAction, selectableIssues]);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/enrollment-resolution/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: selected,
          action: bulkAction,
          actorId: fullUser?.id || fullUser?.userId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk action failed");
      return json;
    },
    onSuccess: (result) => {
      toast.success(`${result.updated || 0} enrollment issue(s) updated`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["enrollment-resolution-issues", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["unresolved-enrollment-summary", schoolId] });
    },
    onError: (error) => toast.error(error.message || "Bulk action failed"),
  });

  const toggleIssue = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const allVisibleSelected = selectableIssues.length > 0 && selectableIssues.every((issue) => selectedSet.has(issue.id));

  if (!schoolId) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enrollment Resolution Center</h1>
          <p className="text-sm text-muted-foreground">
            Resolve historical students before they become operational in {data.academicYear?.name || academicYear?.name || "the active session"}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/schools/manage-student">Current Session Students</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Issues</CardDescription>
            <CardTitle className="text-3xl">{data.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Likely Active</CardDescription>
            <CardTitle className="text-3xl">{summary.LIKELY_ACTIVE || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs Verification</CardDescription>
            <CardTitle className="text-3xl">{summary.NEEDS_VERIFICATION || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Huge Gaps</CardDescription>
            <CardTitle className="text-3xl">{summary.HUGE_SESSION_GAP || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Resolution Queue
          </CardTitle>
          <CardDescription>
            Large session gaps are intentionally held for manual review. Promotions will be added as a preview-first flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="space-y-3">
            <Tabs value={category} onValueChange={(value) => { setCategory(value); setSelected([]); }}>
              <TabsList className="flex h-auto w-fit flex-wrap gap-1 p-1">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Select value={sourceYearFilter} onValueChange={(value) => { setSourceYearFilter(value); setSelected([]); }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Source session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All source years</SelectItem>
                  {(filterOptions.sourceYears || []).map((year) => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={importBatchFilter} onValueChange={(value) => { setImportBatchFilter(value); setSelected([]); }}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Import batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All imports</SelectItem>
                  {(filterOptions.importBatches || []).map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.fileName || batch.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:min-w-72 sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student or admission no"
                  className="w-full pl-9"
                />
              </div>
              <Select value={status} onValueChange={(value) => { setStatus(value); setSelected([]); }}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium">{selected.length} selected</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending}>
                  {bulkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Apply
                </Button>
              </div>
            </div>
          )}

          <div className="w-full max-w-full overflow-hidden rounded-lg border">
            <div className="w-full overflow-x-auto">
            <Table className="min-w-[1120px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => setSelected(event.target.checked ? selectableIssues.map((issue) => issue.id) : [])}
                    />
                  </TableHead>
                  <TableHead className="w-52">Student</TableHead>
                  <TableHead className="w-28">Last Session</TableHead>
                  <TableHead className="w-32">Last Class</TableHead>
                  <TableHead className="w-40">Current Status</TableHead>
                  <TableHead className="w-56">Predicted Current Class</TableHead>
                  <TableHead className="w-44">Suggestion</TableHead>
                  <TableHead className="w-24">Confidence</TableHead>
                  <TableHead className="w-32">Import</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading resolution issues...
                    </TableCell>
                  </TableRow>
                ) : issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      <Users className="mx-auto mb-2 h-8 w-8" />
                      No students need resolution for this filter.
                    </TableCell>
                  </TableRow>
                ) : issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(issue.id)}
                        disabled={bulkAction === "ENROLL_CURRENT_SESSION" && !issue.prediction?.canEnroll}
                        onChange={() => toggleIssue(issue.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="break-words font-medium leading-tight">{issue.student?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{issue.student?.admissionNo || "No admission no"}</div>
                    </TableCell>
                    <TableCell>{issue.lastEnrollment?.academicYear?.name || "-"}</TableCell>
                    <TableCell>
                      {(issue.lastEnrollment?.class?.className || "-")} / {(issue.lastEnrollment?.section?.name || "-")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={predictionTone(issue.prediction)}>
                          {issue.prediction?.isInCurrentSession ? "In current session" : "Not in current session"}
                        </Badge>
                        {!issue.prediction?.admissionDate && (
                          <span className="text-xs text-amber-700">Missing joining date</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {issue.prediction?.predictedClassName && issue.prediction?.predictedSectionName
                            ? `${issue.prediction.predictedClassName} / ${issue.prediction.predictedSectionName}`
                            : "-"}
                        </span>
                        {issue.prediction?.canEnroll ? (
                          <span className="text-xs leading-snug text-muted-foreground">
                            Ready to enroll{issue.prediction.admissionDateSource === "historical_session_start" ? " · joining date will be backfilled" : ""}
                          </span>
                        ) : (
                          <span className="line-clamp-2 text-xs leading-snug text-amber-700" title={(issue.prediction?.blockers || []).join(" ")}>
                            {(issue.prediction?.blockers || []).join(" ") || "Needs manual review"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">{issue.metadata?.badge || issue.category}</Badge>
                        <span className="text-xs text-muted-foreground">{issue.suggestedAction}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={confidenceTone(issue.confidence || 0)}>
                        {issue.confidence || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate" title={issue.importBatch?.fileName || "-"}>
                      {issue.importBatch?.fileName || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            Promotion/enroll actions are intentionally not auto-run here yet. For financial safety, they need a class/section mapping preview before commit.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
