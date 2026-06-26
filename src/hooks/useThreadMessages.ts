
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
  increment,
  getDocs,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatChatMessagePreview } from '@/lib/chat-utils';
import { primeMediaUrls } from '@/lib/media-cache';
import {
  CHAT_MESSAGES_LIVE_LIMIT,
  mergeMessageListsStable,
  readAllMessagesFromDeviceCache,
  fetchLatestMessagesWindow,
  fetchOlderMessagesPage,
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const { toast } = useToast();
  const loadingOlderRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applySnapshot = useCallback((docs: { id: string; data: () => Record<string, unknown> }[]) => {
    const latestWindow = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ChatMessage));
    setMessages((prev) => mergeMessageListsStable(latestWindow, prev, prev, { retainOnlyOlderSecondary: true }));
    setHasMoreOlder(docs.length >= CHAT_MESSAGES_LIVE_LIMIT);
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
    if (!chatId || !parentMessageId || !currentUser?.uid) {
      if (!chatId || !parentMessageId) {
        setMessages([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    setHasMoreOlder(false);
    const aborted = { value: false };

    const messagesCol = threadMessagesCollection(chatId, parentMessageId);

    void readAllMessagesFromDeviceCache(messagesCol).then((cached) => {
      if (aborted.value || cached.length === 0) return;
      setMessages((prev) => mergeMessageListsStable(prev, cached, prev));
      setHasMoreOlder(cached.length >= CHAT_MESSAGES_LIVE_LIMIT);
      setLoading(false);
      primeMediaUrls(cached.map((m) => m.imageUrl));
    });

    void fetchLatestMessagesWindow(messagesCol).then(({ messages: latest, hasMore }) => {
      if (aborted.value || latest.length === 0) return;
      setMessages((prev) => mergeMessageListsStable(latest, prev, prev, { retainOnlyOlderSecondary: true }));
      setHasMoreOlder(hasMore);
      setLoading(false);
      primeMediaUrls(latest.map((m) => m.imageUrl));
    }).catch((error) => {
      console.error('[useThreadMessages] Initial thread fetch failed:', error);
    });

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
        void fetchLatestMessagesWindow(messagesCol).then(({ messages: latest, hasMore }) => {
          if (aborted.value) return;
          if (latest.length > 0) {
            setMessages((prev) => mergeMessageListsStable(latest, prev, prev, { retainOnlyOlderSecondary: true }));
            setHasMoreOlder(hasMore);
          }
          setLoading(false);
        }).catch(() => {
          if (!aborted.value) setLoading(false);
        });
      }
    );

    return () => {
      aborted.value = true;
      unsubscribe();
    };
  }, [chatId, parentMessageId, currentUser?.uid, applySnapshot]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !parentMessageId || loadingOlderRef.current) return;

    const current = messagesRef.current;
    const oldest = current[current.length - 1];
    if (!oldest?.id) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchOlderMessagesPage(
        threadMessagesCollection(chatId, parentMessageId),
        oldest.id,
      );
      setHasMoreOlder(hasMore);
      if (older.length > 0) {
        setMessages((prev) => mergeMessageListsStable(prev, older, prev));
        primeMediaUrls(older.map((m) => m.imageUrl));
      }
    } catch (error) {
      console.error('[useThreadMessages] Failed to load older messages:', error);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [chatId, parentMessageId]);

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

    const lastText = formatChatMessagePreview({
      text: trimmedText,
      imageUrl,
      eventId,
      setlistId,
      rosterId,
    });

    try {
      await addDoc(threadColRef, messageData);

      const parentUpdate: UpdateData<DocumentData> = {
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
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const parentDocRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId);
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION, messageId);
    const threadColRef = collection(parentDocRef, THREAD_SUBCOLLECTION);
    const mainColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);
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

      const latestThreadSnap = await getDocs(
        query(threadColRef, orderBy('createdAt', 'desc'), limit(1)),
      );
      if (!latestThreadSnap.empty) {
        const latestReply = { id: latestThreadSnap.docs[0].id, ...latestThreadSnap.docs[0].data() } as ChatMessage;
        const parentUpdate: UpdateData<DocumentData> = {
          latestReplySenderId: latestReply.isDeleted
            ? (latestReply.deletedBy || latestReply.senderId)
            : latestReply.senderId,
        };
        if (latestReply.isDeleted) {
          parentUpdate.latestReplyText = formatChatMessagePreview(latestReply);
          parentUpdate.latestReplyImageUrl = deleteField();
        } else {
          if (latestReply.text) parentUpdate.latestReplyText = latestReply.text;
          if (latestReply.imageUrl) parentUpdate.latestReplyImageUrl = latestReply.imageUrl;
        }
        await updateDoc(parentDocRef, parentUpdate);
      }

      const latestMainSnap = await getDocs(
        query(mainColRef, orderBy('createdAt', 'desc'), limit(1)),
      );
      if (!latestMainSnap.empty) {
        const latest = { id: latestMainSnap.docs[0].id, ...latestMainSnap.docs[0].data() } as ChatMessage;
        await updateDoc(chatDocRef, {
          lastMessageText: formatChatMessagePreview(latest),
          lastMessageSenderId: latest.isDeleted ? (latest.deletedBy || latest.senderId) : latest.senderId,
        });
      }
    } catch (error) {
      console.error("Failed to delete thread message:", error);
      toast({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  }, [chatId, parentMessageId, currentUser, toast]);

  return { 
    messages, 
    parentMessage,
    loading,
    loadingOlder,
    hasMoreOlder,
    loadOlderMessages,
    sendMessage, 
    sendImageMessage,
    toggleReaction,
    deleteMessage,
  };
}
