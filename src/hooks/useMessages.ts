
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
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { primeMediaUrls } from '@/lib/media-cache';
import {
  CHAT_MESSAGES_LIVE_LIMIT,
  chatMessagesCacheKey,
  chatMessagesCollection,
  mergeMessageListsStable,
  readAllMessagesFromDeviceCache,
  syncAllMessagesToDeviceCache,
} from '@/lib/chat-messages-device-cache';
import type { ChatMessage, Chat } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_SUBCOLLECTION = 'messages';
const CHATS_COLLECTION = 'chats';

export function useMessages(chatId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
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
    if (!chatId) {
      setChat(null);
      return;
    }
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const unsubscribe = onSnapshot(
      chatDocRef,
      (snap) => {
        if (snap.exists()) {
          setChat({ id: snap.id, ...snap.data() } as Chat);
        }
      },
      (error) => {
        console.error('[useMessages] Chat doc listener error:', error);
      }
    );
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    syncAbortRef.current.aborted = false;
    const syncSignal = syncAbortRef.current;

    const messagesCol = chatMessagesCollection(chatId);
    const cacheKey = chatMessagesCacheKey(chatId);

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
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(CHAT_MESSAGES_LIVE_LIMIT)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        applySnapshot(snapshot.docs);
      },
      (error) => {
        console.error('[useMessages] Messages listener error:', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Could not load messages',
          description: 'Check your connection and try reopening the chat.',
        });
      }
    );

    return () => {
      syncSignal.aborted = true;
      unsubscribe();
    };
  }, [chatId, applySnapshot, toast]);

  const sendMessage = useCallback(async (
    text?: string, 
    imageUrl?: string, 
    replyToId?: string,
    eventId?: string,
    setlistId?: string,
    rosterId?: string,
    qtDate?: string,
    cleaningDate?: string,
    songId?: string,
    songTitle?: string,
    sheetKey?: string
  ) => {
    if (!currentUser || !chatId) return;
    if (!text?.trim() && !imageUrl && !eventId && !setlistId && !rosterId && !qtDate && !cleaningDate && !songId) return;

    const trimmedText = text?.trim();
    const messageData: any = {
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      seenBy: [currentUser.uid],
    };

    if (trimmedText) messageData.text = trimmedText;
    if (imageUrl) messageData.imageUrl = imageUrl;
    if (replyToId) messageData.replyToId = replyToId;
    if (eventId) messageData.eventId = eventId;
    if (setlistId) messageData.setlistId = setlistId;
    if (rosterId) messageData.rosterId = rosterId;
    if (qtDate) messageData.qtDate = qtDate;
    if (cleaningDate) messageData.cleaningDate = cleaningDate;
    if (songId) messageData.songId = songId;
    if (songTitle) messageData.songTitle = songTitle;
    if (sheetKey) messageData.sheetKey = sheetKey;

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);

    let lastText = trimmedText || "📷 Image";
    if (eventId) lastText = "📅 Event";
    if (setlistId) lastText = "🎵 Setlist";
    if (rosterId) lastText = "📋 Roster";
    if (qtDate) lastText = "📖 QT Roster";
    if (cleaningDate) lastText = "🧹 Cleaning Roster";
    if (songId) lastText = `🎵 Chord Sheet: ${songTitle || 'Song'} (${sheetKey || ''})`;

    try {
        const docRef = await addDoc(messagesColRef, messageData);
        await updateDoc(chatDocRef, {
            lastMessageText: lastText,
            lastMessageSentAt: serverTimestamp(),
            lastMessageSenderId: currentUser.uid,
        });
        fetch('/api/send-chat-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId, 
                messageId: docRef.id,
                text: lastText, 
                senderId: currentUser.uid 
            }),
        }).catch(error => console.error("Push notification dispatch failed:", error));
    } catch (error) {
        console.error("Message lifecycle failure:", error);
    }

  }, [currentUser, chatId]);

  const sendImageMessage = useCallback((imageUrl: string, replyToId?: string) => {
    sendMessage(undefined, imageUrl, replyToId);
  }, [sendMessage]);

  const markAsSeen = useCallback((messageId: string) => {
    if (!currentUser || !chatId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    updateDoc(messageRef, { seenBy: arrayUnion(currentUser.uid) }).catch(e => {});
  }, [currentUser, chatId]);

  const updateSeenTimestamp = useCallback(() => {
    if (!currentUser || !chatId) return;
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    updateDoc(chatDocRef, { [`memberSeen.${currentUser.uid}`]: serverTimestamp() }).catch(e => {});
  }, [currentUser, chatId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);

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
  }, [currentUser, chatId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chatId || !currentUser) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    try {
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedBy: currentUser.uid,
        text: deleteField(),
        imageUrl: deleteField(),
        eventId: deleteField(),
        setlistId: deleteField(),
        rosterId: deleteField(),
        qtDate: deleteField(),
        cleaningDate: deleteField(),
        songId: deleteField(),
        songTitle: deleteField(),
        sheetKey: deleteField(),
        threadParentId: deleteField(),
        reactions: deleteField(),
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  }, [chatId, currentUser, toast]);


  return { 
    messages, 
    chat, 
    loading, 
    sendMessage, 
    sendImageMessage,
    markAsSeen,
    updateSeenTimestamp,
    toggleReaction,
    deleteMessage,
  };
}
