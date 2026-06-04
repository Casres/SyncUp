/**
 * Realtime (Socket.io) client — R18 messaging realtime bridge.
 *
 * `RealtimeProvider` owns the socket lifecycle (mounted near the app root) and
 * the global chat subscriptions → React Query. `useChatRoom` handles per-thread
 * room join/leave + the typing relay. See each file for detail.
 */

export { RealtimeProvider, useChatSocket } from './RealtimeProvider';
export { useChatRoom } from './useChatRoom';
export type { ChatRoom } from './useChatRoom';
