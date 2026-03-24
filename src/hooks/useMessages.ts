
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
  deleteField,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage, Chat } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_SUBCOLLECTION = 'messages';
const CHATS_COLLECTION = 'chats';
const MESSAGES_PER_PAGE = 100; // Increased limit to keep more in view

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
    const unsubscribe = onSnapshot(chatDocRef, (doc) => {
      if (doc.exists()) {
        setChat({ id: doc.id, ...doc.data() } as Chat);
      }
    });
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

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if (snapshot.docs.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      
      // We overwrite state here because onSnapshot provides the entire current window
      // once loaded, previously fetched "load more" pages stay in state via appending logic below.
      setMessages(newMessages);
      setLoading(false);
    });

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

    const snapshot = await getDocs(moreMessagesQuery);
    if (snapshot.empty || snapshot.docs.length < MESSAGES_PER_PAGE) {
      setHasMore(false);
    }
    lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
    const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
    
    // Append to existing list so they never "hide"
    setMessages(prev => [...prev, ...newMessages]);
    setLoadingMore(false);
  }, [chatId, hasMore, loadingMore]);


  const sendMessage = useCallback((text: string) => {
    if (!currentUser || !chatId || !text.trim()) return;

    const messageData: Omit<ChatMessage, 'id'> = {
      senderId: currentUser.uid,
      text: text.trim(),
      createdAt: serverTimestamp() as Timestamp,
      seenBy: [currentUser.uid],
    };

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);

    addDoc(messagesColRef, messageData).catch(error => {
        console.error("Failed to store message:", error);
    });

    updateDoc(chatDocRef, {
      lastMessageText: text.trim(),
      lastMessageSentAt: serverTimestamp(),
      lastMessageSenderId: currentUser.uid,
      [`typing.${currentUser.uid}`]: deleteField(),
    }).catch(error => console.error("Failed to update chat metadata:", error));

    fetch('/api/send-chat-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chatId, 
            text: text.trim(), 
            senderId: currentUser.uid 
        }),
    }).catch(error => console.error("Push notification dispatch failed:", error));

  }, [currentUser, chatId]);

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
    markAsSeen,
    updateTypingStatus,
    updateSeenTimestamp,
    toggleReaction,
  };
}
