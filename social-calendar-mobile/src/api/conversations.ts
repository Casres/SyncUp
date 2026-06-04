/**
 * Conversations (messaging) API — React Query hooks (R18 M1).
 *
 * HARD RULE (CLAUDE.md): API data lives in React Query only. Socket pushes
 * update this cache directly (see `src/realtime/chatSocket.ts`); they never
 * write to any global store. Typing indicators are LOCAL component state.
 *
 * REAL BACKEND ENDPOINTS
 *   GET  /conversations                       → { conversations: InboxItem[] }
 *   GET  /conversations/:id/messages?before=  → { conversation, messages, nextCursor }
 *   POST /conversations/direct/:friendId      → { conversation }  (get-or-create)
 *   POST /conversations/:id/messages          → { message }
 *   POST /conversations/:id/read              → 204
 *   POST /events/:id/chat                     → { conversation }  (host enable)
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useApiFetch, useApiMutate } from './_client';
import { queryKeys } from './queryKeys';
import type {
  ConversationResponse,
  ConversationSummary,
  InboxItem,
  InboxResponse,
  Message,
  SendMessageResponse,
  ThreadResponse,
} from './conversations.types';

const INBOX_STALE_MS = 30_000;
const THREAD_PAGE_SIZE = 30;

// ─── Inbox ────────────────────────────────────────────────────────────────────

/** The Messages segment list — every non-archived conversation, newest first. */
export function useInbox(): UseQueryResult<InboxItem[], Error> {
  const authedFetch = useApiFetch();
  return useQuery({
    queryKey: queryKeys.conversations.inbox(),
    queryFn: async () => {
      const res = await authedFetch<InboxResponse>('/conversations');
      return res.conversations;
    },
    staleTime: INBOX_STALE_MS,
  });
}

// ─── Thread (infinite) ──────────────────────────────────────────────────────

/**
 * One thread's messages, paginated newest-first. `nextCursor` (the oldest
 * loaded message's `sentAt`) drives backward pagination via `?before=`.
 *
 * The conversation summary (header) is carried on every page; consumers read
 * it from the first page.
 */
export function useThread(
  conversationId: string,
): UseInfiniteQueryResult<InfiniteData<ThreadResponse>, Error> {
  const authedFetch = useApiFetch();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.thread(conversationId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(THREAD_PAGE_SIZE) });
      if (pageParam) params.set('before', pageParam);
      return authedFetch<ThreadResponse>(
        `/conversations/${conversationId}/messages?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** Flatten an infinite-thread cache into a single newest-first message list. */
export function flattenThread(
  data: InfiniteData<ThreadResponse> | undefined,
): Message[] {
  if (!data) return [];
  return data.pages.flatMap((p) => p.messages);
}

/** Pull the conversation summary (header) out of a loaded thread. */
export function threadConversation(
  data: InfiniteData<ThreadResponse> | undefined,
): ConversationSummary | undefined {
  return data?.pages[0]?.conversation;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Send a message. Invalidates the thread + inbox so caches re-sync. */
export function useSendMessage(
  conversationId: string,
): UseMutationResult<Message, Error, string> {
  const authedMutate = useApiMutate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await authedMutate<SendMessageResponse>(
        'POST',
        `/conversations/${conversationId}/messages`,
        { content },
      );
      return res.message;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.conversations.thread(conversationId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.conversations.inbox(),
      });
    },
  });
}

/**
 * Get-or-create the 1:1 conversation with a friend (R17-9). Returns the
 * conversation summary; the thread screen navigates with its `id`.
 */
export function useGetOrCreateDirect(): UseMutationResult<
  ConversationSummary,
  Error,
  string
> {
  const authedMutate = useApiMutate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendId: string) => {
      const res = await authedMutate<ConversationResponse>(
        'POST',
        `/conversations/direct/${friendId}`,
      );
      return res.conversation;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
    },
  });
}

/** Host enables chat for an event. Returns the EVENT conversation summary. */
export function useEnableEventChat(): UseMutationResult<
  ConversationSummary,
  Error,
  string
> {
  const authedMutate = useApiMutate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await authedMutate<ConversationResponse>(
        'POST',
        `/events/${eventId}/chat`,
      );
      return res.conversation;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
    },
  });
}

/**
 * Advance the caller's private read cursor (D1). Called when a thread opens
 * (and as new messages arrive while it stays foregrounded). Invalidates the
 * inbox so the unread badge clears.
 */
export function useMarkRead(
  conversationId: string,
): UseMutationResult<void, Error, string> {
  const authedMutate = useApiMutate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      authedMutate<void>('POST', `/conversations/${conversationId}/read`, {
        messageId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
    },
  });
}
