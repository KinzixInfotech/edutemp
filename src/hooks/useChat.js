'use client';

// ============================================
// CHAT HOOKS - React Query hooks for chat feature
// ============================================

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Fetch helper with auth token
 */
async function chatFetch(url, options = {}) {
    // Get token from cookie or localStorage
    const token = typeof window !== 'undefined'
        ? (document.cookie.match(/sb-.*-auth-token=([^;]+)/)?.[1] || localStorage.getItem('sb-auth-token'))
        : null;

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
}

// ============================================
// CONVERSATIONS
// ============================================

/**
 * List conversations for the current user with real-time polling.
 */
export function useConversations(schoolId, { type, enabled = true } = {}) {
    return useQuery({
        queryKey: ['chat', 'conversations', schoolId, type],
        queryFn: () => {
            const params = new URLSearchParams();
            if (type) params.set('type', type);
            return chatFetch(`/api/schools/${schoolId}/chat/conversations?${params}`);
        },
        enabled: !!schoolId && enabled,
        refetchInterval: 15000, // Poll every 15 seconds
        staleTime: 10000,
    });
}

/**
 * Get conversation detail.
 */
export function useConversation(schoolId, conversationId) {
    return useQuery({
        queryKey: ['chat', 'conversation', conversationId],
        queryFn: () => chatFetch(`/api/schools/${schoolId}/chat/conversations/${conversationId}`),
        enabled: !!schoolId && !!conversationId,
    });
}

/**
 * Create a new conversation.
 */
export function useCreateConversation(schoolId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => chatFetch(`/api/schools/${schoolId}/chat/conversations`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', schoolId] });
        },
    });
}

// ============================================
// MESSAGES
// ============================================

/**
 * Infinite query for messages in a conversation (cursor-based pagination).
 */
export function useMessages(schoolId, conversationId) {
    return useInfiniteQuery({
        queryKey: ['chat', 'messages', conversationId],
        queryFn: ({ pageParam }) => {
            const params = new URLSearchParams();
            if (pageParam) params.set('cursor', pageParam);
            return chatFetch(`/api/schools/${schoolId}/chat/conversations/${conversationId}/messages?${params}`);
        },
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
        enabled: !!schoolId && !!conversationId,
        refetchInterval: 10000, // Poll for new messages
        staleTime: 5000,
    });
}

/**
 * Send a message with optimistic update.
 */
export function useSendMessage(schoolId, conversationId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => chatFetch(
            `/api/schools/${schoolId}/chat/conversations/${conversationId}/messages`,
            { method: 'POST', body: JSON.stringify(data) }
        ),
        onMutate: async (newMessage) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['chat', 'messages', conversationId] });

            return { previousMessages: queryClient.getQueryData(['chat', 'messages', conversationId]) };
        },
        onError: (err, newMessage, context) => {
            // Roll back on error
            if (context?.previousMessages) {
                queryClient.setQueryData(['chat', 'messages', conversationId], context.previousMessages);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', schoolId] });
        },
    });
}

/**
 * Soft delete a message.
 */
export function useDeleteMessage(schoolId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (messageId) => chatFetch(
            `/api/schools/${schoolId}/chat/messages/${messageId}`,
            { method: 'DELETE' }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat'] });
        },
    });
}

// ============================================
// MUTE / READ
// ============================================

/**
 * Mute or unmute a conversation.
 */
export function useMuteConversation(schoolId, conversationId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (duration) => chatFetch(
            `/api/schools/${schoolId}/chat/conversations/${conversationId}/mute`,
            { method: 'PUT', body: JSON.stringify({ duration }) }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', schoolId] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', conversationId] });
        },
    });
}

/**
 * Mark conversation messages as read.
 */
export function useMarkAsRead(schoolId, conversationId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (messageId) => chatFetch(
            `/api/schools/${schoolId}/chat/conversations/${conversationId}/read`,
            { method: 'PUT', body: JSON.stringify(messageId ? { messageId } : {}) }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', schoolId] });
        },
    });
}

// ============================================
// ELIGIBLE USERS
// ============================================

/**
 * Get users the current user can message.
 */
export function useEligibleUsers(schoolId) {
    return useQuery({
        queryKey: ['chat', 'eligible-users', schoolId],
        queryFn: () => chatFetch(`/api/schools/${schoolId}/chat/eligible-users`),
        enabled: !!schoolId,
        staleTime: 120000, // 2 minutes
    });
}

// ============================================
// ADMIN
// ============================================

/**
 * Admin: list all conversations in a school.
 */
export function useAdminConversations(schoolId, { search, type, page = 1, enabled = true } = {}) {
    return useQuery({
        queryKey: ['chat', 'admin', 'conversations', schoolId, search, type, page],
        queryFn: () => {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (type) params.set('type', type);
            params.set('page', String(page));
            return chatFetch(`/api/schools/${schoolId}/chat/admin?${params}`);
        },
        enabled: !!schoolId && enabled,
    });
}
