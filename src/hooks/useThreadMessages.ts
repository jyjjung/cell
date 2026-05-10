
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
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChatMessage, Chat } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MESSAGES_SUBCOLLECTION = 'messages';
const THREAD_SUBCOLLECTION = 'thread';
const CHATS_COLLECTION = 'chats';
const MESSAGES_PER_PAGE = 50;

export function useThreadMessages(chatId: string | null, parentMessageId: string | null) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [parentMessage, setParentMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<any>(null);
  const { toast } = useToast();

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
      () => {}
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
    setHasMore(true);
    lastDocRef.current = null;

    const messagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
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
  }, [chatId, parentMessageId]);

  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !parentMessageId || !hasMore || loadingMore || !lastDocRef.current) return;

    setLoadingMore(true);

    const moreMessagesQuery = query(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION),
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
          description: 'Connect to the internet to load more.',
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
  }, [chatId, parentMessageId, hasMore, loadingMore, toast]);


  const sendMessage = useCallback((
    text?: string, 
    imageUrl?: string, 
    replyToId?: string,
    invitationId?: string,
    eventId?: string,
    setlistId?: string,
    rosterId?: string
  ) => {
    if (!currentUser || !chatId || !parentMessageId) return;
    if (!text?.trim() && !imageUrl && !invitationId && !eventId && !setlistId && !rosterId) return;

    const trimmedText = text?.trim();
    const messageData: any = {
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      seenBy: [currentUser.uid],
    };

    if (trimmedText) messageData.text = trimmedText;
    if (imageUrl) messageData.imageUrl = imageUrl;
    if (invitationId) messageData.invitationId = invitationId;
    if (eventId) messageData.eventId = eventId;
    if (setlistId) messageData.setlistId = setlistId;
    if (rosterId) messageData.rosterId = rosterId;

    const parentDocRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId);
    const threadColRef = collection(parentDocRef, THREAD_SUBCOLLECTION);

    addDoc(threadColRef, messageData).then(() => {
        // Increment reply count on parent message
        const parentUpdate: any = {
            replyCount: increment(1),
            latestReplySenderId: currentUser.uid,
        };
        if (messageData.text) parentUpdate.latestReplyText = messageData.text;
        if (messageData.imageUrl) parentUpdate.latestReplyImageUrl = messageData.imageUrl;
        if (invitationId) parentUpdate.latestReplyText = "📩 Invitation";
        if (eventId) parentUpdate.latestReplyText = "📅 Event";
        if (setlistId) parentUpdate.latestReplyText = "🎵 Setlist";
        if (rosterId) parentUpdate.latestReplyText = "📋 Roster";

        updateDoc(parentDocRef, parentUpdate).catch(e => console.error("Failed to increment replyCount", e));

        // Fire-and-forget push notification — pass sender/text overrides so the
        // notification shows the thread replier's name, not the original message author.
        const notifText = messageData.text
            || (messageData.imageUrl ? '📷 Image' : null)
            || (invitationId ? '📩 Invitation' : null)
            || (eventId ? '📅 Event' : null)
            || (setlistId ? '🎵 Setlist' : null)
            || (rosterId ? '📋 Roster' : null)
            || 'Replied in thread';
        fetch('/api/send-chat-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, senderId: currentUser.uid, text: notifText }),
        }).catch(error => console.error("Thread push notification dispatch failed:", error));
    }).catch(error => {
        console.error("Failed to store thread message:", error);
    });

  }, [currentUser, chatId, parentMessageId]);

  const sendImageMessage = useCallback((imageUrl: string, replyToId?: string) => {
    sendMessage(undefined, imageUrl, replyToId);
  }, [sendMessage]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId || !parentMessageId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION, messageId);
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
  }, [currentUser, chatId, parentMessageId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chatId || !parentMessageId || !currentUser) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, parentMessageId, THREAD_SUBCOLLECTION, messageId);
    try {
      // Soft delete: preserve the message shell so a "deleted a message" note appears
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedBy: currentUser.uid,
        text: deleteField(),
        imageUrl: deleteField(),
        invitationId: deleteField(),
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
    loadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage, 
    sendImageMessage,
    toggleReaction,
    deleteMessage,
  };
}
