'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Send, Bold, Italic, Underline, Star, Search, ChevronDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// Mock email data (replace with your API calls)
const mockEmails = [
    {
        id: 1,
        subject: 'Your order number 374657448 has been shipped',
        sender: 'Cocolita Shop',
        preview: 'We are pleased to inform you that the parcel with the ordered products is already...',
        date: '2023-10-01T10:00:00Z',
        unread: true,
        favorite: false,
        category: 'Messages',
        body: 'Dear Customer,\n\nWe are pleased to inform you that your order number 374657448 has been shipped. The parcel with the ordered products is already on its way. You can track your shipment using the tracking number provided in your email. Thank you for shopping with us!\n\nBest regards,\nCocolita Shop Team',
    },
    {
        id: 2,
        subject: 'Weekly summary from Mailchimp',
        sender: 'Mailchimp',
        preview: 'Manage Your alerts, we ran the numbers - Here is Your weekly summary from m...',
        date: '2023-10-01T09:00:00Z',
        unread: true,
        favorite: true,
        category: 'Social',
        body: 'Hello,\n\nHere is your weekly summary from Mailchimp. Manage your alerts, we ran the numbers - here is your weekly summary from marketing campaigns. Check the detailed report attached.\n\nBest,\nMailchimp Team',
    },
    {
        id: 3,
        subject: '2 new job offers in terms "Product Design"',
        sender: 'LinkedIn',
        preview: '2 new jobs in Warsaw, Poland that match your preferences.',
        date: '2023-10-01T08:00:00Z',
        unread: true,
        favorite: false,
        category: 'Offers',
        body: 'Hi,\n\nWe found 2 new job offers in terms "Product Design" that match your preferences. There are 2 new jobs in Warsaw, Poland. Please log in to view details and apply.\n\nRegards,\nLinkedIn Team',
    },
    // Add more emails as needed
    ...Array.from({ length: 50 }, (_, i) => ({
        id: 4 + i,
        subject: `Test Email ${4 + i}`,
        sender: `test${i}@example.com`,
        preview: `This is a test email number ${4 + i}...`,
        date: `2023-10-01T0${i}:00:00Z`,
        unread: i % 2 === 0,
        favorite: i % 3 === 0,
        category: i % 2 === 0 ? 'Messages' : 'Social',
        body: `Test email content ${4 + i}. This is a longer body to test scrolling. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    })),
];
function useEmails() {
    return useQuery({
        queryKey: ["gmail-emails"], // cache key
        queryFn: async () => {
            const res = await fetch("/api/gmail/messages")
            if (!res.ok) throw new Error("Failed to fetch emails")
            const data = await res.json()

            // Map Gmail data → your UI format
            return data.messages.map((msg, i) => ({
                id: msg.id || i + 1,
                subject: msg.subject || "(No Subject)",
                sender: msg.from || "Unknown Sender",
                preview: msg.snippet || "",
                date: msg.date || new Date().toISOString(),
                unread: true,
                favorite: false,
                category: "Messages",
                body: msg.snippet || "",
            }))
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false,
    })
}

const ITEMS_PER_PAGE = 10;

const Email = ({ id, subject, sender, preview, date, unread, favorite, body }) => (
    <Dialog>
        <DialogTrigger asChild>
            <div
                className={cn(
                    'flex items-center p-2 hover:bg-gray-100 dark:hover:bg-muted cursor-pointer'
                )}
            >
                {/* <Checkbox checked={favorite} onCheckedChange={() => { }} className="mr-2" /> */}
                <div className="flex-1">
                    <div className="flex justify-between">
                        <span className='font-semibold'>{sender}</span>
                        <span className="text-sm text-gray-500">{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">{subject}</div>
                    <div className="text-xs text-gray-600 truncate max-w-[50vw]">
                        {preview}
                    </div>


                </div>
                {unread && <Badge variant="destructive" className="ml-2">New</Badge>}
            </div>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{subject}</DialogTitle>
            </DialogHeader>
            <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-white"><strong>From:</strong> {sender}</p>
                <ScrollArea className="h-64 mt-2">
                    <div
                        className="text-sm text-gray-800 dark:text-white"
                        dangerouslySetInnerHTML={{ __html: body }}
                    />
                    {/* <p className="text-sm whitespace-pre-wrap">{body}</p> */}
                </ScrollArea>
            </div>
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
        </DialogContent>
    </Dialog>
);

const Composer = ({ onClose }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const textareaRef = useRef(null);

    const formatText = (command, value) => {
        document.execCommand(command, false, value);
        textareaRef.current.focus();
    };

    const handleSend = () => {
        console.log('Sending email:', { to, subject, body });
        onClose();
    };

    return (
        <div className="p-4">
            <Input
                placeholder="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mb-2"
            />
            <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mb-2"
            />
            <div className="mb-2 flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => formatText('bold')}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => formatText('italic')}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => formatText('underline')}>
                    <Underline className="h-4 w-4" />
                </Button>
            </div>
            <Textarea
                ref={textareaRef}
                placeholder="Compose your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mb-2 h-40"
            />
            <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSend}>
                    <Send className="mr-2 h-4 w-4" /> Send
                </Button>
            </div>
        </div>
    );
};

const Inbox = () => {
    const [connected, setConnected] = useState(false)
    const { data: emails, isLoading, isFetchingmsgs, refetch } = useEmails()

    useEffect(() => {
        const cookie = document.cookie.includes("gmail_access_token")
        console.log("Gmail Connected:", cookie)
        setConnected(cookie)
    }, [])


    // const [emails, setEmails] = useState([]);
    const [filteredEmails, setFilteredEmails] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('Synced');
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadEmails();
    }, []);

    useEffect(() => {
        filterEmails();
    }, [emails, selectedTab, searchQuery, currentPage]);

    const loadEmails = async () => {
        setIsSyncing(true);
        setSyncMessage('Syncing...');
        await refetch()
        // setEmails(mockEmails);
        setIsSyncing(false);
        setSyncMessage('Synced');
    };

    const filterEmails = () => {
        let filtered = emails;
        if (selectedTab === 'unread') {
            filtered = filtered.filter((email) => email.unread);
        } else if (selectedTab === 'favorites') {
            filtered = filtered.filter((email) => email.favorite);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (email) =>
                    email.subject.toLowerCase().includes(lowerQuery) ||
                    email.sender.toLowerCase().includes(lowerQuery) ||
                    email.preview.toLowerCase().includes(lowerQuery)
            );
        }
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setFilteredEmails(filtered?.slice(startIndex, endIndex));
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const totalPages = Math.ceil(emails?.length / ITEMS_PER_PAGE);
    const [open, setOpen] = useState(false)
    const { data, isSuccess, isFetching } = useQuery({
        queryKey: ["gmailAuthUrl"],
        queryFn: async () => {
            const res = await fetch("/api/gmail/auth-url")
            if (!res.ok) throw new Error("Failed to get auth URL")
            return res.json()
        },
        enabled: open, // only run query when dialog is opened
    })

    useEffect(() => {
        if (isSuccess && data?.url) {
            const timer = setTimeout(() => {
                window.location.href = data.url // redirect to returned auth URL
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isSuccess, data])

    return (
        <div className="container mx-auto h-full p-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Inbox</h1>
                    {connected && (
                        <Badge variant={'outline'} className={'px-3.5 '}>
                            {isFetchingmsgs && <div className=" text-gray-500">{syncMessage} <Loader2 className="inline h-4 w-4 animate-spin" /></div>}
                            {!isFetchingmsgs && <div className=" text-gray-500">{syncMessage}</div>}
                        </Badge>
                    )}
                </div>
                <div className="flex space-x-2">
                    {connected && (
                        <>
                            <Button variant={'outline'} onClick={loadEmails}>
                                {isFetchingmsgs === true ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4"  />}

                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Send className="mr-2 h-4 w-4" /> Send Message
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>New Message</DialogTitle>
                                    </DialogHeader>
                                    <Composer onClose={() => { }} />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>


            {connected ? (
                <>
                    <div className="mb-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                placeholder="Search on emails..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
                        <TabsList>
                            <TabsTrigger value="all">All messages</TabsTrigger>
                            <TabsTrigger value="unread">Unread</TabsTrigger>
                            <TabsTrigger value="favorites">Favourites</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <ScrollArea className="h-[calc(100vh-300px)]">
                        {filteredEmails?.map((email) => (
                            <React.Fragment key={email.id}>
                                <Email {...email} />
                                <Separator />
                            </React.Fragment>
                        ))}
                        {filteredEmails?.length === 0 && <div className="text-center p-4 text-gray-500">No emails found</div>}
                    </ScrollArea>
                    <div className="flex justify-between items-center mt-4">
                        <Button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <span>
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            variant="outline"
                        >
                            Next
                        </Button>
                    </div>
                </>
            ) : (
                <div className='flex items-center justify-center flex-col gap-3.5 min-h-screen bg-muted rounded-lg mb-5 -z-10'>
                    {/* <a href="/api/gmail/auth" className="text-blue-600"> */}
                    <Button variant="outline" onClick={() => setOpen(true)}>
                        Authorize Gmail
                    </Button>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>
                                    {isFetching ? "Preparing Authorization..." : "Redirecting to Google..."}
                                </DialogTitle>
                                <DialogDescription>
                                    {isFetching
                                        ? "Generating your Gmail authorization link..."
                                        : "You’ll be redirected to the Google authorization page shortly."}
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                    {/* </a> */}
                    <p className='text-muted-foreground text-center'>
                        Authorize Your Gmail account to start using the inbox.
                    </p>

                </div>
            )}

        </div>
    );
};

export default Inbox;