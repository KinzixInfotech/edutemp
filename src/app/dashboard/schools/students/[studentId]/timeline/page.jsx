"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentTimelinePage() {
  const { studentId } = useParams();

  const { fullUser } = useAuth();

  const schoolId = fullUser?.schoolId;

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-timeline", schoolId, studentId],

    queryFn: async () => {
      const res = await fetch(
        `/api/schools/${schoolId}/students/${studentId}/timeline`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load timeline");
      }

      return json;
    },

    enabled: Boolean(schoolId && studentId),
  });

  const timeline = data || {};
  const student = timeline.student || null;
  const events = timeline.events || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard/schools/students/registry">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Registry
            </Link>
          </Button>

          <h1 className="mt-2 text-2xl font-bold">
            Student Timeline
          </h1>

          <p className="text-sm text-muted-foreground">
            Complete lifecycle, session, fee, transport,
            promotion, and audit history.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading || !schoolId ? (
        <Card>
          <CardContent className="grid min-h-60 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        /* Error */
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            {error.message}
          </CardContent>
        </Card>
      ) : !student ? (
        /* Empty */
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Student timeline was not found.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Student Info */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{student.name}</CardTitle>

                  <CardDescription>
                    {student.admissionNo ||
                      "No admission number"}
                  </CardDescription>
                </div>

                <Badge variant="outline">
                  {student.lifecycleStatus}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Timeline
              </CardTitle>

              <CardDescription>
                {events.length} lifecycle events found.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!events.length ? (
                <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                  No timeline events found for this student.
                </div>
              ) : (
                <div className="relative pl-8">
                  {/* Vertical Line */}
                  <div className="absolute left-[11px] top-0 h-full w-px bg-border" />

                  <div className="space-y-8">
                    {events.map((event, index) => (
                      <div
                        key={`${event.type}-${event.at}-${index}`}
                        className="relative"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-8 top-2 flex h-6 w-6 items-center justify-center">
                          {/* Ping Animation */}
                          <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-primary/40" />

                          {/* Main Dot */}
                          <span className="relative flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </span>
                        </div>

                        {/* Event Card */}
                        <div className="rounded-2xl border bg-background p-4 shadow-sm transition-all hover:shadow-md">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="font-medium">
                              {event.title}
                            </div>

                            <Badge variant="secondary">
                              {event.type}
                            </Badge>
                          </div>

                          {event.description ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          ) : null}

                          <p className="mt-3 text-xs text-muted-foreground">
                            {event.at
                              ? new Date(
                                event.at
                              ).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}