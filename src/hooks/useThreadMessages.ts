
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  deleteField,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { primeMediaUrls } from '@/lib/media-cache';
import {
  CHAT_MESSAGES_LIVE_LIMIT,
  mergeMessageListsStable,
  readAllMessagesFromDeviceCache,
  syncAllMessagesToDeviceCache,
  threadMessagesCacheKey,
  threadMessagesCollection,
} from '@/lib/chat-messages-device-cache';
import type { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_SUBCOLLECTION = 'messages';
const THREAD_SUBCOLLECTION = 'thread';
const CHATS_COLLECTION = 'chats';

export function useThreadMessages(chatId: string | null, parentMessageId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [parentMessage, setParentMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const syncAbortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const applySnapshot = useCallback((docs: { id: string; data: () => Record<string, unknown> }[]) => {
    const latestWindow = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ChatMessage));
    setMessages((prev) => mergeMessageListsStable(latestWindow, prev, prev));
    setLoading(false);
    primeMediaUrls(latestWindow.map((m) => m.imageUrl));
  }, []);

  useEffect(() => {
    if (!chatId || !parentMessageId) {
      setParentMessage(null);
      return;
    }
    const msgDocRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId);
    const unsubscribe = onSnapshot(
      msgDocRef,
      (snap) => {
        if (snap.exists()) {
          setParentMessage({ id: snap.id, ...snap.data() } as ChatMessage);
        }
      },
      (error) => {
        console.error('[useThreadMessages] Parent message listener error:', error);
      }
    );
    return () => unsubscribe();
  }, [chatId, parentMessageId]);

  useEffect(() => {
    if (!chatId || !parentMessageId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    syncAbortRef.current.aborted = false;
    const syncSignal = syncAbortRef.current;

    const messagesCol = threadMessagesCollection(chatId, parentMessageId);
    const cacheKey = threadMessagesCacheKey(chatId, parentMessageId);

    void readAllMessagesFromDeviceCache(messagesCol).then((cached) => {
      if (syncSignal.aborted || cached.length === 0) return;
      setMessages((prev) => mergeMessageListsStable(prev, cached, prev));
      setLoading(false);
      primeMediaUrls(cached.map((m) => m.imageUrl));
    });

    void syncAllMessagesToDeviceCache(messagesCol, cacheKey, (batch) => {
      if (syncSignal.aborted) return;
      setMessages((prev) => mergeMessageListsStable(prev, batch, prev));
      setLoading(false);
      primeMediaUrls(batch.map((m) => m.imageUrl));
    }, syncSignal);

    const messagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(CHAT_MESSAGES_LIVE_LIMIT)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        applySnapshot(snapshot.docs);
      },
      (error) => {
        console.error('[useThreadMessages] Thread listener error:', error);
        setLoading(false);
      }
    );

    return () => {
      syncSignal.aborted = true;
      unsubscribe();
    };
  }, [chatId, parentMessageId, applySnapshot]);

  const sendMessage = useCallback(async (
    text?: string, 
    imageUrl?: string, 
    replyToId?: string,
    eventId?: string,
    setlistId?: string,
    rosterId?: string
  ) => {
    if (!currentUser || !chatId || !parentMessageId) return;
    if (!text?.trim() && !imageUrl && !eventId && !setlistId && !rosterId) return;

    const trimmedText = text?.trim();
    const messageData: Record<string, unknown> = {
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      seenBy: [currentUser.uid],
    };

    if (trimmedText) messageData.text = trimmedText;
    if (imageUrl) messageData.imageUrl = imageUrl;
    if (eventId) messageData.eventId = eventId;
    if (setlistId) messageData.setlistId = setlistId;
    if (rosterId) messageData.rosterId = rosterId;

    const parentDocRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId);
    const threadColRef = collection(parentDocRef, THREAD_SUBCOLLECTION);
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const mainColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);

    let lastText = trimmedText || '📷 Image';
    if (eventId) lastText = '📅 Event';
    if (setlistId) lastText = '🎵 Setlist';
    if (rosterId) lastText = '📋 Roster';

    try {
      await addDoc(threadColRef, messageData);

      const parentUpdate: Record<string, unknown> = {
        replyCount: increment(1),
        latestReplySenderId: currentUser.uid,
      };
      if (messageData.text) parentUpdate.latestReplyText = messageData.text;
      if (messageData.imageUrl) parentUpdate.latestReplyImageUrl = messageData.imageUrl;
      if (eventId) parentUpdate.latestReplyText = '📅 Event';
      if (setlistId) parentUpdate.latestReplyText = '🎵 Setlist';
      if (rosterId) parentUpdate.latestReplyText = '📋 Roster';

      await updateDoc(parentDocRef, parentUpdate);

      await addDoc(mainColRef, {
        ...messageData,
        threadParentId: parentMessageId,
      });

      await updateDoc(chatDocRef, {
        lastMessageText: lastText,
        lastMessageSentAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
      });

      fetch('/api/send-chat-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, senderId: currentUser.uid, text: lastText }),
      }).catch((error) => console.error('Thread push notification dispatch failed:', error));
    } catch (error) {
      console.error('Failed to store thread message:', error);
    }
  }, [currentUser, chatId, parentMessageId]);

  const sendImageMessage = useCallback((imageUrl: string, replyToId?: string) => {
    sendMessage(undefined, imageUrl, replyToId);
  }, [sendMessage]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId || !parentMessageId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION, messageId);

    let nextReactions: ChatMessage['reactions'] = {};
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const reactors: string[] = [...(currentReactions[emoji] || [])];
        const userIndex = reactors.indexOf(currentUser.uid);
        if (userIndex > -1) reactors.splice(userIndex, 1);
        else reactors.push(currentUser.uid);
        if (reactors.length > 0) currentReactions[emoji] = reactors;
        else delete currentReactions[emoji];
        nextReactions = currentReactions;
        return { ...m, reactions: currentReactions };
      }),
    );

    updateDoc(messageRef, { reactions: nextReactions }).catch(() => {});
  }, [currentUser, chatId, parentMessageId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chatId || !parentMessageId || !currentUser) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION, messageId);
    try {
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedBy: currentUser.uid,
        text: deleteField(),
        imageUrl: deleteField(),
        eventId: deleteField(),
        setlistId: deleteField(),
        rosterId: deleteField(),
        reactions: deleteField(),
      });
    } catch (error) {
      console.error("Failed to delete thread message:", error);
      toast({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  }, [chatId, parentMessageId, currentUser, toast]);

  return { 
    messages, 
    parentMessage,
    loading, 
    sendMessage, 
    sendImageMessage,
    toggleReaction,
    deleteMessage,
  };
}
