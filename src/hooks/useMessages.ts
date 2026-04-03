
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
  Timestamp,
  startAfter,
  getDocs,
  getDocsFromCache,
  deleteField,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage, Chat } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_SUBCOLLECTION = 'messages';
const CHATS_COLLECTION = 'chats';
const MESSAGES_PER_PAGE = 200; // Larger window for offline/PWA (IndexedDB cache)

export function useMessages(chatId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      return;
    }
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const unsubscribe = onSnapshot(
      chatDocRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          setChat({ id: snap.id, ...snap.data() } as Chat);
        }
      },
      () => {}
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
    setHasMore(true);
    lastDocRef.current = null;

    // Use onSnapshot to leverage Firestore's native caching automatically.
    // metadata.fromCache will be true when results are returned from local persistence.
    const messagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.docs.length < MESSAGES_PER_PAGE) {
          setHasMore(false);
        }
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));

        setMessages(newMessages);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !hasMore || loadingMore || !lastDocRef.current) return;

    setLoadingMore(true);

    const moreMessagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      startAfter(lastDocRef.current),
      limit(MESSAGES_PER_PAGE)
    );

    let snapshot;
    try {
      snapshot = await getDocs(moreMessagesQuery);
    } catch {
      try {
        snapshot = await getDocsFromCache(moreMessagesQuery);
      } catch {
        setLoadingMore(false);
        toast({
          variant: 'destructive',
          title: 'Could not load older messages',
          description: 'Connect to the internet to load more history, or use messages already saved on this device.',
        });
        return;
      }
    }
    if (snapshot.empty || snapshot.docs.length < MESSAGES_PER_PAGE) {
      setHasMore(false);
    }
    lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
    const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));

    setMessages(prev => [...prev, ...newMessages]);
    setLoadingMore(false);
  }, [chatId, hasMore, loadingMore, toast]);


  const sendMessage = useCallback(async (
    text?: string, 
    imageUrl?: string, 
    replyToId?: string,
    invitationId?: string,
    eventId?: string,
    setlistId?: string,
    rosterId?: string
  ) => {
    if (!currentUser || !chatId) return;
    if (!text?.trim() && !imageUrl && !invitationId && !eventId && !setlistId && !rosterId) return;

    const trimmedText = text?.trim();
    const messageData: any = {
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      seenBy: [currentUser.uid],
    };

    if (trimmedText) messageData.text = trimmedText;
    if (imageUrl) messageData.imageUrl = imageUrl;
    if (replyToId) messageData.replyToId = replyToId;
    if (invitationId) messageData.invitationId = invitationId;
    if (eventId) messageData.eventId = eventId;
    if (setlistId) messageData.setlistId = setlistId;
    if (rosterId) messageData.rosterId = rosterId;

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);

    let lastText = trimmedText || "📷 Image";
    if (invitationId) lastText = "📩 Invitation";
    if (eventId) lastText = "📅 Event";
    if (setlistId) lastText = "🎵 Setlist";
    if (rosterId) lastText = "📋 Roster";

    try {
        // --- STAGE 1: PERSISTENCE ---
        // Await these writes strictly to prevent the Push API from 404ing on the message if it's too fast
        await addDoc(messagesColRef, messageData);
        await updateDoc(chatDocRef, {
            lastMessageText: lastText,
            lastMessageSentAt: serverTimestamp(),
            lastMessageSenderId: currentUser.uid,
            [`typing.${currentUser.uid}`]: deleteField(),
        });

        // --- STAGE 2: NOTIFICATION ---
        // Fire and forget push dispatch
        fetch('/api/send-chat-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId, 
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

  const updateTypingStatus = useCallback((isTyping: boolean) => {
      if (!currentUser || !chatId) return;
      const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
      const typingUpdate = { [`typing.${currentUser.uid}`]: isTyping ? serverTimestamp() : deleteField() };
      updateDoc(chatDocRef, typingUpdate).catch(e => {});
  }, [currentUser, chatId]);

  const updateSeenTimestamp = useCallback(() => {
    if (!currentUser || !chatId) return;
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    updateDoc(chatDocRef, { [`memberSeen.${currentUser.uid}`]: serverTimestamp() }).catch(e => {});
  }, [currentUser, chatId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    try {
        const messageSnap = await getDoc(messageRef);
        if (!messageSnap.exists()) return;

        const currentReactions = messageSnap.data().reactions || {};
        const reactors: string[] = currentReactions[emoji] || [];
        const userIndex = reactors.indexOf(currentUser.uid);

        if (userIndex > -1) reactors.splice(userIndex, 1);
        else reactors.push(currentUser.uid);

        if (reactors.length > 0) currentReactions[emoji] = reactors;
        else delete currentReactions[emoji];

        updateDoc(messageRef, { reactions: currentReactions }).catch(error => {});
    } catch (error) {}
  }, [currentUser, chatId]);


  return { 
    messages, 
    chat, 
    loading, 
    loadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage, 
    sendImageMessage,
    markAsSeen,
    updateTypingStatus,
    updateSeenTimestamp,
    toggleReaction,
  };
}
