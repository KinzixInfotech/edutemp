'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useConversations, useMessages, useSendMessage, useEligibleUsers, useCreateConversation, useMuteConversation, useMarkAsRead, useDeleteMessage } from '@/hooks/useChat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import './chat.css';

export default function ChatPage() {
    const [schoolId, setSchoolId] = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        const sid = typeof window !== 'undefined'
            ? localStorage.getItem('schoolId') || document.cookie.match(/schoolId=([^;]+)/)?.[1]
            : null;
        if (sid) setSchoolId(sid);
    }, []);

    if (!schoolId) {
        return <div className="chat-loading"><div className="chat-spinner" /><p>Loading chat...</p></div>;
    }

    return (
        <div className="chat-container">
            <ConversationSidebar schoolId={schoolId} activeId={activeConversation?.id} onSelect={setActiveConversation} onNewChat={() => setShowNewChat(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} filterType={filterType} onFilterChange={setFilterType} />
            {activeConversation ? <ChatView schoolId={schoolId} conversation={activeConversation} onBack={() => setActiveConversation(null)} /> : <EmptyState onNewChat={() => setShowNewChat(true)} />}
            {showNewChat && <NewChatModal schoolId={schoolId} onClose={() => setShowNewChat(false)} onCreated={(c) => { setActiveConversation(c); setShowNewChat(false); }} />}
        </div>
    );
}

function ConversationSidebar({ schoolId, activeId, onSelect, onNewChat, searchQuery, onSearchChange, filterType, onFilterChange }) {
    const { data, isLoading } = useConversations(schoolId, { type: filterType || undefined });
    const conversations = data?.conversations || [];
    const filtered = searchQuery ? conversations.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || c.participants?.some(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))) : conversations;

    return (
        <aside className="chat-sidebar">
            <div className="chat-sidebar-header">
                <h2 className="chat-sidebar-title"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>Messages</h2>
                <button className="chat-new-btn" onClick={onNewChat} title="New Chat"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg></button>
            </div>
            <div className="chat-sidebar-search">
                <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="chat-search-input" />
            </div>
            <div className="chat-filter-pills">
                {['', 'PARENT_TEACHER', 'TEACHER_CLASS', 'TEACHER_TEACHER'].map(type => (
                    <button key={type} className={`chat-filter-pill ${filterType === type ? 'active' : ''}`} onClick={() => onFilterChange(type)}>
                        {type === '' ? 'All' : type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                ))}
            </div>
            <div className="chat-conversation-list">
                {isLoading ? <div className="chat-sidebar-loading">{[1, 2, 3, 4, 5].map(i => <div key={i} className="chat-skeleton-item"><div className="chat-skeleton-avatar" /><div className="chat-skeleton-text"><div className="chat-skeleton-line w-60" /><div className="chat-skeleton-line w-80" /></div></div>)}</div>
                    : filtered.length === 0 ? <div className="chat-empty-sidebar"><p>No conversations yet</p><button className="chat-start-btn" onClick={onNewChat}>Start a conversation</button></div>
                        : filtered.map(conv => <ConversationItem key={conv.id} conversation={conv} isActive={conv.id === activeId} onClick={() => onSelect(conv)} />)}
            </div>
        </aside>
    );
}

function ConversationItem({ conversation, isActive, onClick }) {
    const firstP = conversation.participants?.[0];
    const initial = conversation.title?.[0] || firstP?.name?.[0] || '?';
    const timeAgo = conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : '';
    const typeColors = { PARENT_TEACHER: 'chat-type-parent', TEACHER_CLASS: 'chat-type-class', TEACHER_TEACHER: 'chat-type-teacher', DIRECT: 'chat-type-direct' };

    return (
        <button className={`chat-conversation-item ${isActive ? 'active' : ''}`} onClick={onClick}>
            <div className={`chat-avatar ${typeColors[conversation.type] || ''}`}>{firstP?.profilePicture && firstP.profilePicture !== 'default.png' ? <img src={firstP.profilePicture} alt="" className="chat-avatar-img" /> : <span>{initial.toUpperCase()}</span>}</div>
            <div className="chat-conversation-info">
                <div className="chat-conversation-top"><span className="chat-conversation-name">{conversation.title}</span><span className="chat-conversation-time">{timeAgo}</span></div>
                <div className="chat-conversation-bottom">
                    <span className="chat-conversation-preview">{conversation.lastMessageText || 'No messages yet'}</span>
                    {conversation.unreadCount > 0 && <span className="chat-unread-badge">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
                    {conversation.isMuted && <span className="chat-muted-icon">🔇</span>}
                </div>
            </div>
        </button>
    );
}

function ChatView({ schoolId, conversation, onBack }) {
    const [message, setMessage] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(schoolId, conversation.id);
    const sendMsg = useSendMessage(schoolId, conversation.id);
    const markRead = useMarkAsRead(schoolId, conversation.id);
    const delMsg = useDeleteMessage(schoolId);
    const muteCv = useMuteConversation(schoolId, conversation.id);

    useChatRealtime(conversation.id, schoolId, { enabled: true, onNewMessage: () => scrollToBottom() });

    useEffect(() => { markRead.mutate(); }, [conversation.id]); // eslint-disable-line

    const allMessages = data?.pages?.flatMap(p => p.messages)?.reverse() || [];
    const scrollToBottom = useCallback(() => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, []);
    useEffect(() => { scrollToBottom(); }, [allMessages.length, scrollToBottom]);

    const handleSend = async () => {
        const t = message.trim();
        if (!t) return;
        try { await sendMsg.mutateAsync({ content: t, replyToId: replyTo?.id }); setMessage(''); setReplyTo(null); inputRef.current?.focus(); scrollToBottom(); } catch (e) { console.error('Send failed:', e); }
    };

    return (
        <main className="chat-main">
            <div className="chat-main-header">
                <button className="chat-back-btn" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>
                <div className="chat-main-header-info"><h3 className="chat-main-title">{conversation.title}</h3><span className="chat-main-subtitle">{conversation.participants?.length || 0} participants</span></div>
                <div className="chat-main-header-actions">
                    <button className="chat-icon-btn" onClick={() => setShowOptions(!showOptions)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg></button>
                    {showOptions && <div className="chat-options-dropdown"><button onClick={() => { muteCv.mutate('1h'); setShowOptions(false); }}>🔇 Mute 1h</button><button onClick={() => { muteCv.mutate('8h'); setShowOptions(false); }}>🔇 Mute 8h</button><button onClick={() => { muteCv.mutate('1d'); setShowOptions(false); }}>🔇 Mute 1d</button>{conversation.isMuted && <button onClick={() => { muteCv.mutate('unmute'); setShowOptions(false); }}>🔔 Unmute</button>}</div>}
                </div>
            </div>
            <div className="chat-messages-container">
                {hasNextPage && <button className="chat-load-more" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Loading...' : 'Load older messages'}</button>}
                {isLoading ? <div className="chat-messages-loading"><p>Loading messages...</p></div> : allMessages.length === 0 ? <div className="chat-no-messages"><p>No messages yet. Start the conversation!</p></div> : (
                    <div className="chat-messages-list">
                        {allMessages.map((msg, idx) => {
                            const prev = allMessages[idx - 1];
                            const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                            const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
                            return (<div key={msg.id}>{showDate && <div className="chat-date-separator"><span>{formatDate(msg.createdAt)}</span></div>}<MessageBubble message={msg} isMine={msg.senderId === uid} onReply={() => setReplyTo(msg)} onDelete={() => delMsg.mutate(msg.id)} /></div>);
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>
            {replyTo && <div className="chat-reply-preview"><div className="chat-reply-content"><span className="chat-reply-name">{replyTo.sender?.name}</span><span className="chat-reply-text">{replyTo.content?.slice(0, 80)}</span></div><button className="chat-reply-close" onClick={() => setReplyTo(null)}>✕</button></div>}
            <div className="chat-input-container">
                <textarea ref={inputRef} className="chat-input" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a message..." rows={1} />
                <button className="chat-send-btn" onClick={handleSend} disabled={!message.trim() || sendMsg.isPending}>{sendMsg.isPending ? '...' : '→'}</button>
            </div>
        </main>
    );
}

function MessageBubble({ message, isMine, onReply, onDelete }) {
    const [hover, setHover] = useState(false);
    if (message.isDeleted) return <div className={`chat-message ${isMine ? 'sent' : 'received'}`}><div className="chat-bubble deleted"><em>🚫 Message deleted</em></div></div>;
    return (
        <div className={`chat-message ${isMine ? 'sent' : 'received'}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {!isMine && <span className="chat-sender-name">{message.sender?.name}</span>}
            {message.replyTo && <div className="chat-reply-reference"><span className="chat-reply-ref-name">{message.replyTo.senderName}</span><span className="chat-reply-ref-text">{message.replyTo.content?.slice(0, 60)}</span></div>}
            <div className="chat-bubble"><p className="chat-text">{message.content}</p>{message.attachments && Array.isArray(message.attachments) && <div className="chat-attachments">{message.attachments.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="chat-attachment">📎 {a.fileName}</a>)}</div>}<span className="chat-time">{formatTime(message.createdAt)}</span></div>
            {hover && <div className="chat-msg-actions"><button onClick={onReply} title="Reply">↩</button>{isMine && <button onClick={onDelete} title="Delete">🗑</button>}</div>}
        </div>
    );
}

function NewChatModal({ schoolId, onClose, onCreated }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [chatType, setChatType] = useState('');
    const { data, isLoading } = useEligibleUsers(schoolId);
    const createConv = useCreateConversation(schoolId);
    const users = data?.users || [];
    const filtered = search ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase())) : users;

    const toggle = (u) => { setSelected(p => p.find(x => x.id === u.id) ? p.filter(x => x.id !== u.id) : [...p, u]); if (!chatType && u.conversationType) setChatType(u.conversationType); };
    const create = async () => { if (!selected.length) return; try { const r = await createConv.mutateAsync({ type: chatType || 'DIRECT', participantUserIds: selected.map(u => u.id) }); if (r?.conversation) onCreated(r.conversation); } catch (e) { console.error(e); } };

    return (
        <div className="chat-modal-overlay" onClick={onClose}>
            <div className="chat-modal" onClick={e => e.stopPropagation()}>
                <div className="chat-modal-header"><h3>New Conversation</h3><button className="chat-modal-close" onClick={onClose}>✕</button></div>
                <div className="chat-modal-search"><input type="text" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus /></div>
                {selected.length > 0 && <div className="chat-selected-users">{selected.map(u => <span key={u.id} className="chat-selected-chip">{u.name}<button onClick={() => toggle(u)}>×</button></span>)}</div>}
                <div className="chat-modal-user-list">{isLoading ? <p className="chat-modal-loading">Loading...</p> : filtered.length === 0 ? <p className="chat-modal-empty">No users found</p> : filtered.map(u => (
                    <button key={u.id} className={`chat-modal-user ${selected.find(x => x.id === u.id) ? 'selected' : ''}`} onClick={() => toggle(u)}>
                        <div className="chat-modal-user-avatar">{u.profilePicture && u.profilePicture !== 'default.png' ? <img src={u.profilePicture} alt="" /> : <span>{u.name?.[0]?.toUpperCase()}</span>}</div>
                        <div className="chat-modal-user-info"><span className="chat-modal-user-name">{u.name}</span><span className="chat-modal-user-role">{u.role?.name?.replace(/_/g, ' ')}</span></div>
                        {selected.find(x => x.id === u.id) && <span className="chat-check-icon">✓</span>}
                    </button>
                ))}</div>
                <div className="chat-modal-footer"><button className="chat-modal-cancel" onClick={onClose}>Cancel</button><button className="chat-modal-create" onClick={create} disabled={!selected.length || createConv.isPending}>{createConv.isPending ? 'Creating...' : `Start Chat (${selected.length})`}</button></div>
            </div>
        </div>
    );
}

function EmptyState({ onNewChat }) {
    return <div className="chat-empty-state"><h3>Select a conversation</h3><p>Choose from the sidebar or start a new chat</p><button className="chat-start-new-btn" onClick={onNewChat}>+ New Conversation</button></div>;
}

function formatTime(d) { const date = new Date(d), now = new Date(), diff = now - date; if (diff < 60000) return 'Now'; if (diff < 3600000) return `${Math.floor(diff / 60000)}m`; if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' }); return date.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
function formatDate(d) { const date = new Date(d), now = new Date(), diff = now - date; if (diff < 86400000 && date.getDate() === now.getDate()) return 'Today'; if (diff < 172800000) return 'Yesterday'; return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
function isSameDay(a, b) { const d1 = new Date(a), d2 = new Date(b); return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }
