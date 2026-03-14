'use client';

// ============================================
// SUPABASE REALTIME HOOK - Live message updates
// ============================================

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

// Create a singleton Supabase client for realtime subscriptions
let realtimeClient = null;

function getRealtimeClient() {
    if (!realtimeClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            realtimeClient = createClient(supabaseUrl, supabaseKey, {
                realtime: { params: { eventsPerSecond: 10 } },
            });
        }
    }
    return realtimeClient;
}

/**
 * Subscribe to real-time message updates for a specific conversation.
 * Automatically updates React Query cache when new messages arrive.
 *
 * @param {string} conversationId - The conversation to subscribe to
 * @param {string} schoolId - Used for cache invalidation
 * @param {object} options
 * @param {boolean} options.enabled - Whether to enable the subscription
 * @param {function} options.onNewMessage - Callback when a new message arrives
 */
export function useChatRealtime(conversationId, schoolId, { enabled = true, onNewMessage } = {}) {
    const queryClient = useQueryClient();
    const channelRef = useRef(null);

    const handleInsert = useCallback((payload) => {
        const newMessage = payload.new;

        // Call external handler if provided
        onNewMessage?.(newMessage);

        // Invalidate messages cache to refetch (safer than manual cache manipulation)
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });

        // Also invalidate conversation list (for lastMessageText updates)
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', schoolId] });
    }, [conversationId, schoolId, queryClient, onNewMessage]);

    const handleUpdate = useCallback((payload) => {
        // Message was updated (e.g., soft deleted)
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
    }, [conversationId, queryClient]);

    useEffect(() => {
        if (!enabled || !conversationId) return;

        const client = getRealtimeClient();
        if (!client) return;

        // Subscribe to Message table changes for this conversation
        const channel = client
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                    filter: `conversationId=eq.${conversationId}`,
                },
                handleInsert
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'Message',
                    filter: `conversationId=eq.${conversationId}`,
                },
                handleUpdate
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`🔴 Realtime subscribed to conversation: ${conversationId}`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Realtime channel error for conversation: ${conversationId}`);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                client.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [conversationId, enabled, handleInsert, handleUpdate]);

    return {
        isSubscribed: !!channelRef.current,
    };
}
