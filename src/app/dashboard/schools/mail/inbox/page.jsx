'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Send, Bold, Italic, Underline, Star, Search, ChevronDown, Plus } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

const Email = ({ id, subject, sender, preview, date, unread, favorite, body }) => (
    <Dialog>
        <DialogTrigger asChild>
            <div
                className={cn(
                    'flex items-center p-2 hover:bg-gray-100 dark:hover:bg-muted cursor-pointer'
                )}
            >
                <div className="flex-1">
                    <div className="flex justify-between">
                        <span className='font-semibold'>{sender}</span>
                        <span className="text-sm text-muted-foreground">{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">{subject}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[50vw]">
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

    const formatText = (command, value = null) => {
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
                    <Send className="h-4 w-4 mr-2" /> Send
                </Button>
            </div>
        </div>
    );
};

function GmailAccountDropdown({ userId, setOpen, onAccountSwitch, accounts, currentAccount, isLoading }) {
    const handleSwitch = (account) => {
        onAccountSwitch(account);
    };

    if (!accounts || isLoading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-24 h-4 rounded" />
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild className="bg-muted w-full lg:w-fit float-end rounded-lg px-2 py-1 border">
                <div className="flex items-center cursor-pointer w-full lg:w-fit bg-amber-600">
                    {!currentAccount ? (
                        <>
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="ml-2 w-24 h-4 rounded" />
                        </>
                    ) : (
                        <div className='flex justify-between  w-full lg:w-fit flex-row items-center'>
                            <div className='flex flex-row items-center'>
                                <Avatar>
                                    <AvatarImage src={currentAccount?.avatar || ""} alt={currentAccount?.email || "User"} />
                                    <AvatarFallback>{currentAccount?.email?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                                <span className="ml-2 font-semibold text-sm text-gray-600 dark:text-white">
                                    {currentAccount?.name || "No Account"}
                                </span>
                            </div>
                            <ChevronDown className="inline lg:ml-1" />
                        </div>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
                {accounts?.map((acc) => (
                    <DropdownMenuItem key={acc.id} onClick={() => handleSwitch(acc)}>
                        <div className="flex items-center gap-2">
                            <Avatar>
                                <AvatarImage src={acc.avatar || ""} alt={acc.email} />
                                <AvatarFallback>{acc.email.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{acc.name}</p>
                                <p className="text-xs text-gray-500">{acc.email || "Gmail Account"}</p>
                            </div>
                        </div>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(true);
                    }}
                    className="cursor-pointer"
                >
                    <Button className="w-full" size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" /> Add Account
                    </Button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function useEmails(pageToken, userId, currentEmail) {
    return useQuery({
        queryKey: ["gmail-emails", pageToken, userId, currentEmail],
        queryFn: async () => {
            if (!currentEmail) throw new Error("No Gmail account selected");
            const decodedEmail = decodeURIComponent(currentEmail);
            const params = new URLSearchParams({
                userId,
                pageToken: pageToken || "",
                email: decodedEmail,
            });
            const res = await fetch(`/api/gmail/messages?${params}`);
            if (!res.ok) throw new Error("Failed to fetch emails");
            const data = await res.json();

            return {
                nextPageToken: data.nextPageToken || null,
                messages: (data.messages || []).map((msg, i) => ({
                    id: msg.id || i + 1,
                    subject: msg.subject || "(No Subject)",
                    sender: msg.from || "Unknown Sender",
                    preview: msg.snippet || "",
                    date: msg.date || new Date().toISOString(),
                    unread: msg.labelIds?.includes("UNREAD") ?? true,
                    favorite: msg.labelIds?.includes("STARRED") ?? false,
                    category: "Messages",
                    body: msg.snippet || "",
                })),
            };
        },
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        enabled: !!currentEmail && !!userId,
    });
}

const Inbox = () => {
    const { fullUser } = useAuth();
    const [pageToken, setPageToken] = useState(null);
    const [pageTokens, setPageTokens] = useState([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [currentEmail, setCurrentEmail] = useState(null);
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [syncMessage, setSyncMessage] = useState('Synced');
    const [open, setOpen] = useState(false);

    // NEW: Fetch Gmail accounts in Inbox to determine initial state
    const { data: accountsData, isPending: isAccountsLoading, error: accountsError } = useQuery({
        queryKey: ["gmailAccounts", fullUser?.id],
        queryFn: async () => {
            if (!fullUser?.id) return { accounts: [] };
            const res = await fetch(`/api/gmail/accounts?userId=${fullUser.id}`);
            if (!res.ok) throw new Error("Failed to fetch Gmail accounts");
            return res.json();
        },
        enabled: !!fullUser?.id,
    });

    // NEW: Fetch default account if no localStorage
    const { data: defaultAccountData, isPending: isDefaultLoading } = useQuery({
        queryKey: ["defaultGmailAccount", fullUser?.id],
        queryFn: async () => {
            if (!fullUser?.id) return { account: null };
            const res = await fetch(`/api/gmail/default-account?userId=${fullUser.id}`);
            if (!res.ok) return { account: null };
            return res.json();
        },
        enabled: !!fullUser?.id,
    });

    // NEW: Auto-set initial currentEmail if accounts exist
    useEffect(() => {
        if (accountsData?.accounts?.length > 0 && !currentEmail) {
            let acc;
            const stored = localStorage.getItem("currentGmailAccount");

            if (stored) {
                acc = JSON.parse(stored);
                // Validate stored account exists
                acc = accountsData.accounts.find(a => a.id === acc.id) || acc;
            } else if (defaultAccountData?.account) {
                // Use default from DB if no localStorage
                acc = defaultAccountData.account;
                console.log("🔄 Restored default account from DB:", acc.email);
            } else {
                // Fallback to first account
                acc = accountsData.accounts[0];
            }

            if (acc) {
                setCurrentEmail(acc.email);
                localStorage.setItem("currentGmailAccount", JSON.stringify(acc));
            }
        }
    }, [accountsData, defaultAccountData, currentEmail]);

    const { data: emails, refetch, isPending, isFetching: isLoadingMsgs } = useEmails(
        pageToken,
        fullUser?.id,
        currentEmail
    );
    const isFetching = isPending || isLoadingMsgs;

    const handleNext = () => {
        if (emails?.nextPageToken) {
            setPageTokens((prev) => [...prev, emails.nextPageToken]);
            setCurrentPageIndex((prev) => prev + 1);
            setPageToken(emails.nextPageToken);
        }
    };

    const handlePrev = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex((prev) => prev - 1);
            setPageToken(pageTokens[currentPageIndex - 1]);
        }
    };

    const handleAccountSwitch = (account) => {
        console.log("Switched to account:", account);
        setCurrentEmail(account.email);
        localStorage.setItem("currentGmailAccount", JSON.stringify(account));
    };

    const filteredEmails = useMemo(() => {
        if (!emails?.messages) return [];
        let filtered = emails.messages;

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

        return filtered;
    }, [emails?.messages, selectedTab, searchQuery]);

    const { data: authData, isFetching: isAuthFetching } = useQuery({
        queryKey: ["gmailAuthUrl"],
        queryFn: async () => {
            const res = await fetch(`/api/gmail/auth-url?userId=${fullUser?.id}`);
            if (!res.ok) throw new Error("Failed to get auth URL");
            return res.json();
        },
        enabled: open,
    });

    useEffect(() => {
        if (authData?.url) {
            const timer = setTimeout(() => {
                window.location.href = authData.url;
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [authData]);

    useEffect(() => {
        if (isFetching) {
            setSyncMessage('Syncing...');
        } else {
            setSyncMessage('Synced');
        }
    }, [isFetching]);

    // NEW: Show loading if accounts are loading
    if (isAccountsLoading || isDefaultLoading) {
        return (
            <div className="container mx-auto h-full p-4 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // NEW: Show authorize only if NO accounts exist in DB
    const hasAccounts = accountsData?.accounts?.length > 0;

    return (
        <div className="container mx-auto h-full p-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Inbox</h1>
                    {currentEmail && (
                        <Badge variant="outline" className="px-3.5">
                            <div className="text-gray-500">
                                {syncMessage}
                                {isFetching && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
                            </div>
                        </Badge>
                    )}
                </div>
                <div className="flex space-x-2">
                    {currentEmail && (
                        <>
                            <Button
                                variant="outline"
                                onClick={refetch}
                                disabled={isFetching}
                            >
                                {isFetching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Send className="h-4 w-4 mr-2" /> Send Mail
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

            {hasAccounts ? (
                <>
                    <div className="mb-4">
                        <Input
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex lg:flex-row flex-col w-full lg:items-center lg:justify-between mb-2 gap-2.5">
                        <Tabs className={'lg:w-fit w-full'} value={selectedTab} onValueChange={setSelectedTab}>
                            <TabsList className={'lg:w-fit w-full'}>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="unread">Unread</TabsTrigger>
                                {/* <TabsTrigger value="favorites">Favorites</TabsTrigger> */}
                            </TabsList>
                        </Tabs>
                        <GmailAccountDropdown
                            userId={fullUser?.id}
                            setOpen={setOpen}
                            onAccountSwitch={handleAccountSwitch}
                            accounts={accountsData?.accounts}
                            currentAccount={accountsData?.accounts?.find(acc => acc.email === currentEmail)}
                            isLoading={isAccountsLoading}
                        />
                    </div>
                    <ScrollArea className="h-[calc(100vh-300px)]">
                        {filteredEmails.map((email) => (
                            <React.Fragment key={email.id}>
                                <Email {...email} />
                                <Separator />
                            </React.Fragment>
                        ))}
                        {isFetching && (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="animate-spin" size={55} />
                            </div>
                        )}
                        {!isFetching && filteredEmails.length === 0 && (
                            <div className="text-center p-4 text-gray-500">No emails found</div>
                        )}
                    </ScrollArea>
                    <div className="sticky bottom-0 flex justify-center mt-4">
                        <div className="flex gap-2.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrev}
                                disabled={currentPageIndex === 0}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground self-center border-b ">
                                {isFetching ? (
                                    <Loader2 className="inline h-4 w-4 animate-spin" />
                                ) : (
                                    `Showing ${filteredEmails.length} emails`
                                )}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNext}
                                disabled={!emails?.nextPageToken}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center flex-col gap-3.5 min-h-screen bg-muted rounded-lg mb-5">
                    <Button variant="outline" onClick={() => setOpen(true)}>
                        Authorize Gmail
                    </Button>
                    <p className="text-muted-foreground text-center">
                        Authorize your Gmail account to start using the inbox.
                    </p>
                </div>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {isAuthFetching ? "Preparing..." : "Redirecting to Google..."}
                        </DialogTitle>
                        <DialogDescription>
                            {isAuthFetching
                                ? "Generating auth link..."
                                : "You'll be redirected shortly."}
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Inbox;