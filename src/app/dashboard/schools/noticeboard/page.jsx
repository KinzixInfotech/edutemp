'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const fetchNotices = async ({ queryKey }) => {
  const [_key, { userId, schoolId, searchQuery, category }] = queryKey;

  const params = new URLSearchParams({
    userId,
    schoolId,
    ...(searchQuery && { search: searchQuery }),
    ...(category !== 'all' && { category }),
    limit: '10',
    offset: '0',
  });

  const res = await fetch(`/api/schools/notice/get?${params}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to fetch notices');
  }
  return res.json();
};

const Noticeboard = () => {
  const { fullUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ['notices', {
      userId: fullUser?.id,
      schoolId: fullUser?.schoolId,
      searchQuery,
      category
    }],
    queryFn: fetchNotices,
    enabled: !!fullUser?.id && !!fullUser?.schoolId,
    staleTime: 0, // no caching, always fetch fresh
    refetchOnWindowFocus: false, // optional
  });

  const notices = data?.notices || [];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "URGENT": return "bg-red-500";
      case "IMPORTANT": return "bg-yellow-500";
      case "NORMAL": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PUBLISHED": return "bg-green-500";
      case "DRAFT": return "bg-yellow-500";
      case "ARCHIVED": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="flex px-3.5 py-4 items-center mb-4 gap-5 rounded-lg bg-muted lg:flex-row flex-col">
          <Input
            placeholder="Search Notice"
            className="bg-white border lg:w-[180px] rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search notices"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-white border lg:w-[180px] rounded-lg">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Events">Events</SelectItem>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Multiple Skeleton Cards to Match Grid
            Array(3).fill(0).map((_, index) => (
              <div
                key={index}
                className="bg-muted dark:bg-[#18181b] rounded-lg p-6 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  {/* Title Skeleton */}
                  <Skeleton className="h-6 w-32" />
                  {/* Priority Badge Skeleton */}
                  <Skeleton className="h-6 w-24 rounded-md" />
                </div>
                {/* Description Skeleton */}
                <Skeleton className="h-4 w-3/4" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Badge Skeletons */}
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
                <div className="flex flex-col gap-1 mt-2 text-sm text-foreground/60">
                  {/* Metadata Skeletons */}
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-40" />
                </div>
                {/* Button Skeleton */}
                <Skeleton className="h-8 w-32 mt-auto" />
              </div>
            ))
          ) : error ? (
            <p className="text-red-500 col-span-full text-center">Error: {error.message}</p>
          ) : notices.length === 0 ? (
            <p className="text-foreground/60 col-span-full text-center">No notices found.</p>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.id}
                className="bg-muted dark:bg-[#18181b] rounded-lg p-6 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-foreground">{notice.title}</h2>
                  <Badge className={getPriorityColor(notice.priority)}>
                    {notice.priority}
                  </Badge>
                </div>
                <p className="text-foreground/80 line-clamp-3">{notice.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{notice.audience}</Badge>
                  <Badge variant="outline">{notice.category || "Others"}</Badge>
                  <Badge className={getStatusColor(notice.status)}>{notice.status}</Badge>
                </div>
                <div className="flex flex-col text-sm text-foreground/60 gap-1">
                  <p>
                    Published: {notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : "-"}
                  </p>
                  <p>
                    Expires: {notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : "-"}
                  </p>
                  <p>Author: {notice.Author?.name || "-"}</p>
                </div>
                {notice.fileUrl && (
                  <Button variant="link" asChild className="mt-auto">
                    <a href={notice.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Attachment
                    </a>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Noticeboard;
