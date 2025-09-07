'use client'
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from '@/context/AuthContext';

const Noticeboard = () => {
  const { fullUser } = useAuth(); // Get user details (id, role, schoolId, classId?, sectionId?)
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [sortBy, setSortBy] = useState("publishedAt");
  const [category, setCategory] = useState("all");
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle admin role
  // if (fullUser?.role?.name === 'ADMIN') {
  //   return (
  //     <div className="min-h-screen bg-background p-6">
  //       <div className="container mx-auto">
  //         <p className="text-red-500 text-center text-xl">
  //           Please use the admin dashboard to view notices.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  // Fetch notices based on filters
  useEffect(() => {
    if (!fullUser) return;

    const fetchNotices = async () => {

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userId: fullUser.id,
          schoolId: fullUser.schoolId,
          ...(searchQuery && { search: searchQuery }),
          ...(category !== "all" && { category }),
          limit: "10",
          offset: "0",
        });

        const response = await fetch(`/api/schools/notice/get?${params}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch notices');
        }

        const data = await response.json();
        setNotices(data.notices);
        setTotal(data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [fullUser?.schoolId, searchQuery, category]);

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
          <div>
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


        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && (
            <div className=' col-span-full  place-items-center'>
            <Loader2 size={30} className='animate-spin'   />
            </div>
          )}
          {error && (
            <p className="text-red-500 col-span-full text-center">Error: {error}</p>
          )}
          {!loading && !error && notices.length === 0 && (
            <p className="text-foreground/60 col-span-full text-center">No notices found.</p>
          )}
          {!loading && !error && notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-muted dark:bg-[#18181b] rounded-lg p-6 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold text-foreground">{notice.title}</h2>
                <Badge className={getPriorityColor(notice.priority)}>
                  {notice.priority}
                </Badge>
              </div>
              <p className="text-foreground/80 line-clamp-3">{notice.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{notice.audience}</Badge>
                <Badge variant="outline">{notice.category || "Others"}</Badge>
                <Badge className={getStatusColor(notice.status)}>{notice.status}</Badge>
              </div>
              <div className="text-sm text-foreground/60">
                <p>Published: {notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : "-"}</p>
                <p>Expires: {notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : "-"}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default Noticeboard;