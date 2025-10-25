'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';



const AIChat = () => {
    const { fullUser } = useAuth();
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'ai',
            text: 'Hello! I\'m Edu Ai. How can I help you today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    // AI response templates
    const aiResponses = [
        'That\'s an interesting question! Let me think about that for a moment...',
        'I understand what you\'re asking. Here\'s what I can tell you...',
        'Based on my analysis, I can provide you with the following insights...',
        'Great point! Let me elaborate on that topic for you...',
        'I\'ve processed your request. Here\'s what I found...',
        'That\'s a thoughtful observation. Allow me to expand on that...',
        'I appreciate your question. Let me break this down for you...',
        'Interesting perspective! Here are my thoughts on that matter...'
    ];

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            text: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                text: aiResponses[Math.floor(Math.random() * aiResponses.length)]
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
        }, 1500);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-muted/30 dark:bg-muted/20 relative py-6 overflow-hidden">
            {/* Dotted Pattern Background */}
            <div
                className="absolute inset-0 opacity-60 dark:opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.25) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                }}
            />
            <div
                className="absolute inset-0 opacity-0 dark:opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                }}
            />

            {/* Chat Container */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
            >
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            {message.type === 'ai' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full  flex items-center justify-center">
                                    {/* <Bot className="w-5 h-5 text-white" /> */}
                                    <img src='/fav.ico' className=' w-8 h-8 rounded-full object-cover' />
                                </div>
                            )}

                            <div className={`max-w-md ${message.type === 'user' ? 'mr-1' : 'ml-1'}`}>
                                {message.type === 'user' ? (
                                    <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-2xl p-4">
                                        {message.text}
                                    </div>
                                ) : (
                                    <Card className="rounded-2xl p-4 bg-card border border-border">
                                        {message.text}
                                    </Card>
                                )}
                            </div>

                            {message.type === 'user' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                    {/* <User className="w-5 h-5 text-white" /> */}
                                    <img src={fullUser?.profilePicture} className=' w-8 h-8 rounded-full object-contain' />

                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                <img src='/fav.ico' className=' w-8 h-8 rounded-full object-cover' />
                            </div>
                            <Card className="rounded-2xl p-4 bg-card border border-border ml-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

            {/* Input Area */}
            <div className="absoulte bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-lg">
                <div className="max-w-3xl mx-auto p-4">
                    <div className="relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            className="pr-12 py-6 rounded-xl bg-background focus:ring-2 focus:ring-primary/20"
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="sm"
                            className="absolute right-2 bottom-2 rounded-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIChat;