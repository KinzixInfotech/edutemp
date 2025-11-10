// 'use client';

// import { useState, useEffect } from 'react';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
// import { Badge } from '@/components/ui/badge';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Users, X, Check, Loader2, ExternalLink, Calendar, CalendarDays } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { CalendarDay } from 'react-day-picker';
// import { useAuth } from '@/context/AuthContext';
// import LoaderPage from '@/components/loader-page';

// export default function SchoolCalendar() {
//     // { schoolId, userId }
//     const fullUser = useAuth();
//     const [schoolId, setSchoolId] = useState(null);
//     const [userId, setUserId] = useState(null);

//     useEffect(() => {
//         if (fullUser?.schoolId && fullUser?.id) {
//             setSchoolId(fullUser.schoolId);
//             setUserId(fullUser.id);
//             console.log(fullUser.schoolId, fullUser.id, 'from calendar');
//         }
//     }, [fullUser]);


//     if (!schoolId || !userId) return <LoaderPage/>;
//     const [currentDate, setCurrentDate] = useState(new Date());
//     const [events, setEvents] = useState([]);
//     const [upcomingEvents, setUpcomingEvents] = useState([]);
//     const [selectedDate, setSelectedDate] = useState(null);
//     const [selectedEvent, setSelectedEvent] = useState(null);
//     const [isCreateOpen, setIsCreateOpen] = useState(false);
//     const [isDetailOpen, setIsDetailOpen] = useState(false);
//     const [loading, setLoading] = useState(true);
//     const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
//     const [viewMode, setViewMode] = useState('month');

//     // Form state
//     const [formData, setFormData] = useState({
//         title: '',
//         description: '',
//         eventType: 'CUSTOM',
//         category: 'OTHER',
//         startDate: '',
//         endDate: '',
//         startTime: '',
//         endTime: '',
//         isAllDay: false,
//         location: '',
//         venue: '',
//         color: '#3B82F6',
//         priority: 'NORMAL',
//         targetAudience: 'ALL',
//     });

//     useEffect(() => {
//         fetchEvents();
//         fetchUpcomingEvents();
//     }, [currentDate, schoolId]);

//     const fetchEvents = async () => {
//         try {
//             setLoading(true);
//             const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
//             const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

//             const res = await fetch(
//                 `/api/schools/${schoolId}/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
//             );
//             const data = await res.json();

//             setEvents(data.events || []);
//             setHasGoogleCalendar(data.hasGoogleCalendar);
//         } catch (error) {
//             console.error('Failed to fetch events:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const fetchUpcomingEvents = async () => {
//         try {
//             const res = await fetch(`/api/schools/${schoolId}/calendar/upcoming?limit=5`);
//             const data = await res.json();
//             setUpcomingEvents(data.events || []);
//         } catch (error) {
//             console.error('Failed to fetch upcoming events:', error);
//         }
//     };

//     const handleCreateEvent = async () => {
//         try {
//             const res = await fetch(`/api/schools/${schoolId}/calendar/events`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     ...formData,
//                     createdById: userId,
//                 }),
//             });

//             if (res.ok) {
//                 setIsCreateOpen(false);
//                 fetchEvents();
//                 fetchUpcomingEvents();
//                 resetForm();
//             }
//         } catch (error) {
//             console.error('Failed to create event:', error);
//         }
//     };

//     const resetForm = () => {
//         setFormData({
//             title: '',
//             description: '',
//             eventType: 'CUSTOM',
//             category: 'OTHER',
//             startDate: '',
//             endDate: '',
//             startTime: '',
//             endTime: '',
//             isAllDay: false,
//             location: '',
//             venue: '',
//             color: '#3B82F6',
//             priority: 'NORMAL',
//             targetAudience: 'ALL',
//         });
//     };

//     const getDaysInMonth = () => {
//         const year = currentDate.getFullYear();
//         const month = currentDate.getMonth();
//         const firstDay = new Date(year, month, 1);
//         const lastDay = new Date(year, month + 1, 0);
//         const daysInMonth = lastDay.getDate();
//         const startingDayOfWeek = firstDay.getDay();

//         const days = [];

//         // Previous month days
//         const prevMonthLastDay = new Date(year, month, 0).getDate();
//         for (let i = startingDayOfWeek - 1; i >= 0; i--) {
//             days.push({
//                 date: prevMonthLastDay - i,
//                 isCurrentMonth: false,
//                 fullDate: new Date(year, month - 1, prevMonthLastDay - i),
//             });
//         }

//         // Current month days
//         for (let i = 1; i <= daysInMonth; i++) {
//             days.push({
//                 date: i,
//                 isCurrentMonth: true,
//                 fullDate: new Date(year, month, i),
//             });
//         }

//         // Next month days
//         const remainingDays = 42 - days.length;
//         for (let i = 1; i <= remainingDays; i++) {
//             days.push({
//                 date: i,
//                 isCurrentMonth: false,
//                 fullDate: new Date(year, month + 1, i),
//             });
//         }

//         return days;
//     };

//     const getEventsForDate = (date) => {
//         return events.filter(event => {
//             const eventStart = new Date(event.start);
//             return eventStart.toDateString() === date.toDateString();
//         });
//     };

//     const handleDateClick = (day) => {
//         setSelectedDate(day.fullDate);
//         const dayEvents = getEventsForDate(day.fullDate);

//         if (dayEvents.length > 0) {
//             setSelectedEvent(dayEvents[0]);
//             setIsDetailOpen(true);
//         } else {
//             setFormData({
//                 ...formData,
//                 startDate: day.fullDate.toISOString().split('T')[0],
//                 endDate: day.fullDate.toISOString().split('T')[0],
//             });
//             setIsCreateOpen(true);
//         }
//     };

//     const handlePrevMonth = () => {
//         setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
//     };

//     const handleNextMonth = () => {
//         setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
//     };

//     const handleToday = () => {
//         setCurrentDate(new Date());
//     };

//     const days = getDaysInMonth();
//     const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
//     const today = new Date();

//     const eventTypeColors = {
//         CUSTOM: '#3B82F6',
//         HOLIDAY: '#EF4444',
//         VACATION: '#F59E0B',
//         EXAM: '#8B5CF6',
//         SPORTS: '#10B981',
//         MEETING: '#6366F1',
//         ADMISSION: '#EC4899',
//         FEE_DUE: '#F97316',
//         BIRTHDAY: '#14B8A6',
//     };

//     const eventTypeLabels = {
//         CUSTOM: 'Custom Event',
//         HOLIDAY: 'Holiday',
//         VACATION: 'Vacation',
//         EXAM: 'Examination',
//         SPORTS: 'Sports Event',
//         MEETING: 'Meeting',
//         ADMISSION: 'Admission',
//         FEE_DUE: 'Fee Due',
//         BIRTHDAY: 'Birthday',
//     };

//     return (
//         <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
//             {/* Main Calendar */}
//             <div className="flex-1 flex flex-col">

//                 <Card className="flex-1 flex flex-col">
//                     <div className="flex my-1 px-5 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                         <div className="space-y-1">
//                             <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
//                                 <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
//                                 <span>Calendar Management</span>
//                             </h1>
//                             <p className="text-xs sm:text-sm text-muted-foreground">
//                                 Manage/Create Event
//                             </p>
//                         </div>
//                         <Button
//                             variant="outline"
//                             onClick={() => {
//                                 window.location.href = `/api/auth/google?state=${userId}`;
//                             }}
//                         >
//                             <CalendarDays className="h-4 w-4 mr-2" />
//                             Connect Google Calendar
//                         </Button>

//                     </div>
//                     <CardContent className="p-6 flex flex-col h-full">
//                         {/* Header */}
//                         <div className="flex items-center justify-between mb-6">
//                             <div className="flex items-center gap-4">
//                                 <h2 className="text-2xl font-bold">{monthYear}</h2>
//                                 {hasGoogleCalendar && (
//                                     <Badge variant="outline" className="gap-1">
//                                         <div className="w-2 h-2 rounded-full bg-green-500" />
//                                         Google Calendar Linked
//                                     </Badge>
//                                 )}
//                             </div>
//                             <div className="flex items-center gap-2">
//                                 <Button variant="outline" size="sm" onClick={handleToday}>
//                                     Today
//                                 </Button>
//                                 <Button variant="outline" size="icon" onClick={handlePrevMonth}>
//                                     <ChevronLeft className="h-4 w-4" />
//                                 </Button>
//                                 <Button variant="outline" size="icon" onClick={handleNextMonth}>
//                                     <ChevronRight className="h-4 w-4" />
//                                 </Button>
//                                 <Button size="sm" onClick={() => setIsCreateOpen(true)}>
//                                     <Plus className="h-4 w-4 mr-2" />
//                                     New Event
//                                 </Button>
//                             </div>
//                         </div>

//                         {/* Calendar Grid */}
//                         <div className="flex-1 flex flex-col">
//                             {/* Weekday Headers */}
//                             <div className="grid grid-cols-7 gap-2 mb-2">
//                                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
//                                     <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
//                                         {day}
//                                     </div>
//                                 ))}
//                             </div>

//                             {/* Calendar Days */}
//                             <div className="grid grid-cols-7 gap-2 flex-1">
//                                 {loading ? (
//                                     <div className="col-span-7 flex items-center justify-center">
//                                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//                                     </div>
//                                 ) : (
//                                     days.map((day, idx) => {
//                                         const dayEvents = getEventsForDate(day.fullDate);
//                                         const isToday = day.fullDate.toDateString() === today.toDateString();
//                                         const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();

//                                         return (
//                                             <button
//                                                 key={idx}
//                                                 onClick={() => handleDateClick(day)}
//                                                 className={cn(
//                                                     "min-h-[100px] p-2 rounded-lg border-2 transition-all hover:border-primary hover:shadow-md",
//                                                     !day.isCurrentMonth && "opacity-40",
//                                                     isToday && "bg-primary/5 border-primary",
//                                                     isSelected && "border-primary shadow-lg",
//                                                     day.isCurrentMonth && !isToday && !isSelected && "border-border"
//                                                 )}
//                                             >
//                                                 <div className="flex flex-col h-full">
//                                                     <span className={cn(
//                                                         "text-sm font-semibold mb-1",
//                                                         isToday && "text-primary"
//                                                     )}>
//                                                         {day.date}
//                                                     </span>
//                                                     <div className="space-y-1 overflow-y-auto flex-1">
//                                                         {dayEvents.slice(0, 3).map((event, i) => (
//                                                             <div
//                                                                 key={i}
//                                                                 className="text-xs px-1.5 py-0.5 rounded truncate text-white"
//                                                                 style={{ backgroundColor: event.color }}
//                                                                 title={event.title}
//                                                             >
//                                                                 {event.title}
//                                                             </div>
//                                                         ))}
//                                                         {dayEvents.length > 3 && (
//                                                             <div className="text-xs text-muted-foreground font-medium">
//                                                                 +{dayEvents.length - 3} more
//                                                             </div>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             </button>
//                                         );
//                                     })
//                                 )}
//                             </div>
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>

//             {/* Sidebar - Upcoming Events */}
//             <div className="lg:w-80">
//                 <Card>
//                     <CardContent className="p-6">
//                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
//                             <CalendarIcon className="h-5 w-5" />
//                             Upcoming Events
//                         </h3>
//                         <div className="space-y-3">
//                             {upcomingEvents.length === 0 ? (
//                                 <p className="text-sm text-muted-foreground text-center py-8">
//                                     No upcoming events
//                                 </p>
//                             ) : (
//                                 upcomingEvents.map((event) => (
//                                     <button
//                                         key={event.id}
//                                         onClick={() => {
//                                             setSelectedEvent(event);
//                                             setIsDetailOpen(true);
//                                         }}
//                                         className="w-full text-left p-3 rounded-lg border hover:border-primary hover:shadow-md transition-all"
//                                     >
//                                         <div className="flex items-start gap-3">
//                                             <div
//                                                 className="w-1 h-full rounded"
//                                                 style={{ backgroundColor: event.color }}
//                                             />
//                                             <div className="flex-1 min-w-0">
//                                                 <p className="font-medium text-sm truncate">{event.title}</p>
//                                                 <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
//                                                     <Clock className="h-3 w-3" />
//                                                     {new Date(event.start).toLocaleDateString('en-US', {
//                                                         month: 'short',
//                                                         day: 'numeric',
//                                                     })}
//                                                 </div>
//                                                 <Badge variant="outline" className="mt-2 text-xs">
//                                                     {eventTypeLabels[event.eventType] || event.eventType}
//                                                 </Badge>
//                                             </div>
//                                         </div>
//                                     </button>
//                                 ))
//                             )}
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>

//             {/* Create Event Dialog */}
//             <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
//                 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//                     <DialogHeader>
//                         <DialogTitle>Create New Event</DialogTitle>
//                     </DialogHeader>
//                     <div className="space-y-4 py-4">
//                         <div>
//                             <label className="text-sm font-medium mb-2 block">Event Title *</label>
//                             <Input
//                                 placeholder="Enter event title"
//                                 value={formData.title}
//                                 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                             />
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">Event Type</label>
//                                 <Select
//                                     value={formData.eventType}
//                                     onValueChange={(value) => setFormData({ ...formData, eventType: value })}
//                                 >
//                                     <SelectTrigger>
//                                         <SelectValue />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                         {Object.entries(eventTypeLabels).map(([key, label]) => (
//                                             <SelectItem key={key} value={key}>{label}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
//                             </div>

//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">Priority</label>
//                                 <Select
//                                     value={formData.priority}
//                                     onValueChange={(value) => setFormData({ ...formData, priority: value })}
//                                 >
//                                     <SelectTrigger>
//                                         <SelectValue />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                         <SelectItem value="NORMAL">Normal</SelectItem>
//                                         <SelectItem value="IMPORTANT">Important</SelectItem>
//                                         <SelectItem value="URGENT">Urgent</SelectItem>
//                                     </SelectContent>
//                                 </Select>
//                             </div>
//                         </div>

//                         <div>
//                             <label className="text-sm font-medium mb-2 block">Description</label>
//                             <Textarea
//                                 placeholder="Enter event description"
//                                 value={formData.description}
//                                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//                                 rows={3}
//                             />
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">Start Date *</label>
//                                 <Input
//                                     type="date"
//                                     value={formData.startDate}
//                                     onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
//                                 />
//                             </div>

//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">End Date</label>
//                                 <Input
//                                     type="date"
//                                     value={formData.endDate}
//                                     onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
//                                 />
//                             </div>
//                         </div>

//                         <div className="flex items-center gap-2">
//                             <input
//                                 type="checkbox"
//                                 id="allDay"
//                                 checked={formData.isAllDay}
//                                 onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
//                                 className="h-4 w-4 rounded"
//                             />
//                             <label htmlFor="allDay" className="text-sm font-medium">All Day Event</label>
//                         </div>

//                         {!formData.isAllDay && (
//                             <div className="grid grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="text-sm font-medium mb-2 block">Start Time</label>
//                                     <Input
//                                         type="time"
//                                         value={formData.startTime}
//                                         onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
//                                     />
//                                 </div>

//                                 <div>
//                                     <label className="text-sm font-medium mb-2 block">End Time</label>
//                                     <Input
//                                         type="time"
//                                         value={formData.endTime}
//                                         onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
//                                     />
//                                 </div>
//                             </div>
//                         )}

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">Location</label>
//                                 <Input
//                                     placeholder="Event location"
//                                     value={formData.location}
//                                     onChange={(e) => setFormData({ ...formData, location: e.target.value })}
//                                 />
//                             </div>

//                             <div>
//                                 <label className="text-sm font-medium mb-2 block">Venue</label>
//                                 <Input
//                                     placeholder="Specific venue"
//                                     value={formData.venue}
//                                     onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
//                                 />
//                             </div>
//                         </div>

//                         <div>
//                             <label className="text-sm font-medium mb-2 block">Event Color</label>
//                             <div className="flex items-center gap-2">
//                                 <Input
//                                     type="color"
//                                     value={formData.color}
//                                     onChange={(e) => setFormData({ ...formData, color: e.target.value })}
//                                     className="w-20 h-10"
//                                 />
//                                 <span className="text-sm text-muted-foreground">{formData.color}</span>
//                             </div>
//                         </div>

//                         <div className="flex justify-end gap-2 pt-4">
//                             <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
//                                 Cancel
//                             </Button>
//                             <Button onClick={handleCreateEvent} disabled={!formData.title || !formData.startDate}>
//                                 <Check className="h-4 w-4 mr-2" />
//                                 Create Event
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>

//             {/* Event Detail Dialog */}
//             <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
//                 <DialogContent className="max-w-2xl">
//                     {selectedEvent && (
//                         <>
//                             <DialogHeader>
//                                 <div className="flex items-start justify-between">
//                                     <div className="flex-1">
//                                         <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
//                                         <div className="flex items-center gap-2 mt-2">
//                                             <Badge
//                                                 variant="outline"
//                                                 style={{
//                                                     backgroundColor: `${selectedEvent.color}20`,
//                                                     borderColor: selectedEvent.color,
//                                                     color: selectedEvent.color,
//                                                 }}
//                                             >
//                                                 {eventTypeLabels[selectedEvent.eventType] || selectedEvent.eventType}
//                                             </Badge>
//                                             {selectedEvent.source === 'google' && (
//                                                 <Badge variant="outline" className="gap-1">
//                                                     <ExternalLink className="h-3 w-3" />
//                                                     Google Calendar
//                                                 </Badge>
//                                             )}
//                                         </div>
//                                     </div>
//                                     {selectedEvent.source === 'custom' && (
//                                         <Button variant="ghost" size="icon">
//                                             <X className="h-4 w-4" />
//                                         </Button>
//                                     )}
//                                 </div>
//                             </DialogHeader>

//                             <div className="space-y-4 py-4">
//                                 {selectedEvent.description && (
//                                     <div>
//                                         <h4 className="text-sm font-semibold mb-2">Description</h4>
//                                         <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
//                                     </div>
//                                 )}

//                                 <div className="grid grid-cols-2 gap-4">
//                                     <div className="flex items-start gap-3">
//                                         <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
//                                         <div>
//                                             <p className="text-sm font-medium">Date</p>
//                                             <p className="text-sm text-muted-foreground">
//                                                 {new Date(selectedEvent.start).toLocaleDateString('en-US', {
//                                                     weekday: 'long',
//                                                     year: 'numeric',
//                                                     month: 'long',
//                                                     day: 'numeric',
//                                                 })}
//                                             </p>
//                                         </div>
//                                     </div>

//                                     {!selectedEvent.allDay && selectedEvent.startTime && (
//                                         <div className="flex items-start gap-3">
//                                             <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
//                                             <div>
//                                                 <p className="text-sm font-medium">Time</p>
//                                                 <p className="text-sm text-muted-foreground">
//                                                     {selectedEvent.startTime} - {selectedEvent.endTime}
//                                                 </p>
//                                             </div>
//                                         </div>
//                                     )}
//                                 </div>

//                                 {selectedEvent.location && (
//                                     <div className="flex items-start gap-3">
//                                         <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
//                                         <div>
//                                             <p className="text-sm font-medium">Location</p>
//                                             <p className="text-sm text-muted-foreground">
//                                                 {selectedEvent.location}
//                                                 {selectedEvent.venue && ` - ${selectedEvent.venue}`}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 )}

//                                 {selectedEvent.source === 'google' && selectedEvent.htmlLink && (
//                                     <div className="pt-4">
//                                         <a
//                                             href={selectedEvent.htmlLink}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
//                                         >
//                                             View in Google Calendar
//                                             <ExternalLink className="h-4 w-4" />
//                                         </a>
//                                     </div>
//                                 )}
//                             </div>
//                         </>
//                     )}
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// }
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, X, Check, Loader2, ExternalLink, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarDay } from 'react-day-picker';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function SchoolCalendar() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;
    console.log(fullUser);

    if (!schoolId || !userId) return <LoaderPage />
    // const [schoolId, setSchoolId] = useState(null);
    // const [userId, setUserId] = useState(null);
    const queryClient = useQueryClient();

    // useEffect(() => {
    //     if (fullUser?.schoolId) {
    //         setSchoolId(fullUser.schoolId);
    //         setUserId(fullUser.id);
    //         console.log(fullUser.schoolId, fullUser.id, 'from calendar');
    //     }
    // }, [fullUser]);

    // if (!schoolId || !userId) return <LoaderPage/>;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventType: 'CUSTOM',
        category: 'OTHER',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        isAllDay: false,
        location: '',
        venue: '',
        color: '#3B82F6',
        priority: 'NORMAL',
        targetAudience: 'ALL',
    });

    // Fetch events query
    const { data: eventsData, isLoading: eventsLoading } = useQuery({
        queryKey: ['calendar-events', schoolId, currentDate.getFullYear(), currentDate.getMonth()],
        queryFn: async () => {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const res = await fetch(
                `/api/schools/${schoolId}/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            if (!res.ok) {
                throw new Error('Failed to fetch events');
            }

            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch upcoming events query
    const { data: upcomingData } = useQuery({
        queryKey: ['upcoming-events', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/calendar/upcoming?limit=5`);

            if (!res.ok) {
                throw new Error('Failed to fetch upcoming events');
            }

            return res.json();
        },
        enabled: !!schoolId,
    });

    // Create event mutation
    const createEventMutation = useMutation({
        mutationFn: async (eventData) => {
            const res = await fetch(`/api/schools/${schoolId}/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...eventData,
                    createdById: userId,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to create event');
            }

            return res.json();
        },
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
            setIsCreateOpen(false);
            resetForm();
        },
    });

    const events = eventsData?.events || [];
    const upcomingEvents = upcomingData?.events || [];
    const hasGoogleCalendar = eventsData?.hasGoogleCalendar || false;

    const handleCreateEvent = () => {
        createEventMutation.mutate(formData);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            eventType: 'CUSTOM',
            category: 'OTHER',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            isAllDay: false,
            location: '',
            venue: '',
            color: '#3B82F6',
            priority: 'NORMAL',
            targetAudience: 'ALL',
        });
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthLastDay - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthLastDay - i),
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i),
            });
        }

        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return days;
    };

    const getEventsForDate = (date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start);
            return eventStart.toDateString() === date.toDateString();
        });
    };

    const handleDateClick = (day) => {
        setSelectedDate(day.fullDate);
        const dayEvents = getEventsForDate(day.fullDate);

        if (dayEvents.length > 0) {
            setSelectedEvent(dayEvents[0]);
            setIsDetailOpen(true);
        } else {
            setFormData({
                ...formData,
                startDate: day.fullDate.toISOString().split('T')[0],
                endDate: day.fullDate.toISOString().split('T')[0],
            });
            setIsCreateOpen(true);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const days = getDaysInMonth();
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const today = new Date();

    const eventTypeColors = {
        CUSTOM: '#3B82F6',
        HOLIDAY: '#EF4444',
        VACATION: '#F59E0B',
        EXAM: '#8B5CF6',
        SPORTS: '#10B981',
        MEETING: '#6366F1',
        ADMISSION: '#EC4899',
        FEE_DUE: '#F97316',
        BIRTHDAY: '#14B8A6',
    };

    const eventTypeLabels = {
        CUSTOM: 'Custom Event',
        HOLIDAY: 'Holiday',
        VACATION: 'Vacation',
        EXAM: 'Examination',
        SPORTS: 'Sports Event',
        MEETING: 'Meeting',
        ADMISSION: 'Admission',
        FEE_DUE: 'Fee Due',
        BIRTHDAY: 'Birthday',
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
            {/* Main Calendar */}
            <div className="flex-1 flex flex-col">
                <Card className="flex-1 flex flex-col">
                    <div className="flex my-1 px-5 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                                <span>Calendar Management</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Manage/Create Event
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                window.location.href = `/api/auth/google?state=${userId}`;
                            }}
                        >
                            <CalendarDays className="h-4 w-4 mr-2" />
                            Connect Google Calendar
                        </Button>
                    </div>
                    <CardContent className="p-6 flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold">{monthYear}</h2>
                                {hasGoogleCalendar && (
                                    <Badge variant="outline" className="gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Google Calendar Linked
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleToday}>
                                    Today
                                </Button>
                                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Event
                                </Button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1 flex flex-col">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-2 flex-1">
                                {eventsLoading ? (
                                    <div className="col-span-7 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    days.map((day, idx) => {
                                        const dayEvents = getEventsForDate(day.fullDate);
                                        const isToday = day.fullDate.toDateString() === today.toDateString();
                                        const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleDateClick(day)}
                                                className={cn(
                                                    "min-h-[100px] p-2 rounded-lg border-2 transition-all hover:border-primary hover:shadow-md",
                                                    !day.isCurrentMonth && "opacity-40",
                                                    isToday && "bg-primary/5 border-primary",
                                                    isSelected && "border-primary shadow-lg",
                                                    day.isCurrentMonth && !isToday && !isSelected && "border-border"
                                                )}
                                            >
                                                <div className="flex flex-col h-full">
                                                    <span className={cn(
                                                        "text-sm font-semibold mb-1",
                                                        isToday && "text-primary"
                                                    )}>
                                                        {day.date}
                                                    </span>
                                                    <div className="space-y-1 overflow-y-auto flex-1">
                                                        {dayEvents.slice(0, 3).map((event, i) => (
                                                            <div
                                                                key={i}
                                                                className="text-xs px-1.5 py-0.5 rounded truncate text-white"
                                                                style={{ backgroundColor: event.color }}
                                                                title={event.title}
                                                            >
                                                                {event.title}
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <div className="text-xs text-muted-foreground font-medium">
                                                                +{dayEvents.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar - Upcoming Events */}
            <div className="lg:w-80">
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Upcoming Events
                        </h3>
                        <div className="space-y-3">
                            {upcomingEvents.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No upcoming events
                                </p>
                            ) : (
                                upcomingEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setIsDetailOpen(true);
                                        }}
                                        className="w-full text-left p-3 rounded-lg border hover:border-primary hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-1 h-full rounded"
                                                style={{ backgroundColor: event.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{event.title}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(event.start).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </div>
                                                <Badge variant="outline" className="mt-2 text-xs">
                                                    {eventTypeLabels[event.eventType] || event.eventType}
                                                </Badge>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Event Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Event</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Event Title *</label>
                            <Input
                                placeholder="Enter event title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Event Type</label>
                                <Select
                                    value={formData.eventType}
                                    onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(eventTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Priority</label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NORMAL">Normal</SelectItem>
                                        <SelectItem value="IMPORTANT">Important</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                placeholder="Enter event description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Start Date *</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">End Date</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="allDay"
                                checked={formData.isAllDay}
                                onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                                className="h-4 w-4 rounded"
                            />
                            <label htmlFor="allDay" className="text-sm font-medium">All Day Event</label>
                        </div>

                        {!formData.isAllDay && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Start Time</label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">End Time</label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Location</label>
                                <Input
                                    placeholder="Event location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Venue</label>
                                <Input
                                    placeholder="Specific venue"
                                    value={formData.venue}
                                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Event Color</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-20 h-10"
                                />
                                <span className="text-sm text-muted-foreground">{formData.color}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateEvent}
                                disabled={!formData.title || !formData.startDate || createEventMutation.isPending}
                            >
                                {createEventMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Create Event
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Event Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedEvent && (
                        <>
                            <DialogHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge
                                                variant="outline"
                                                style={{
                                                    backgroundColor: `${selectedEvent.color}20`,
                                                    borderColor: selectedEvent.color,
                                                    color: selectedEvent.color,
                                                }}
                                            >
                                                {eventTypeLabels[selectedEvent.eventType] || selectedEvent.eventType}
                                            </Badge>
                                            {selectedEvent.source === 'google' && (
                                                <Badge variant="outline" className="gap-1">
                                                    <ExternalLink className="h-3 w-3" />
                                                    Google Calendar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {selectedEvent.source === 'custom' && (
                                        <Button variant="ghost" size="icon">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {selectedEvent.description && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Description</h4>
                                        <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Date</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {!selectedEvent.allDay && selectedEvent.startTime && (
                                        <div className="flex items-start gap-3">
                                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">Time</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedEvent.startTime} - {selectedEvent.endTime}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Location</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedEvent.location}
                                                {selectedEvent.venue && ` - ${selectedEvent.venue}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.source === 'google' && selectedEvent.htmlLink && (
                                    <div className="pt-4">
                                        <a
                                            href={selectedEvent.htmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            View in Google Calendar
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}