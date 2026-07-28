
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  deleteField,
  getDoc,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatChatMessagePreview } from '@/lib/chat-utils';
import { getDeletedMessageContentType } from '@/lib/deleted-content';
import { primeMediaUrls } from '@/lib/media-cache';
import {
  CHAT_MESSAGES_LIVE_LIMIT,
  chatMessagesCollection,
  mergeMessageListsStable,
  readAllMessagesFromDeviceCache,
  fetchLatestMessagesWindow,
  fetchOlderMessagesPage,
} from '@/lib/chat-messages-device-cache';
import { sortChatMessagesDesc } from '@/lib/chat-message-merge';
import type { ChatMessage, Chat, ChatPoll } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { deleteStorageObjectAtUrl } from '@/lib/avatar-storage';
import { useChatsContext } from '@/contexts/chats-context';
import { useToast } from '@/hooks/use-toast';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import { dispatchChatPush } from '@/lib/dispatch-chat-push';

const MESSAGES_SUBCOLLECTION = 'messages';
const CHATS_COLLECTION = 'chats';

export function useMessages(chatId: string | null) {
  const { currentUser } = useAuth();
  const chatsContext = useChatsContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(() => {
    if (!chatId) return null;
    return chatsContext?.chats.find((item) => item.id === chatId) ?? null;
  });
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  const loadingOlderRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applySnapshot = useCallback((docs: { id: string; data: () => Record<string, unknown> }[]) => {
    const latestWindow = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ChatMessage));
    setMessages((prev) =>
      mergeMessageListsStable(latestWindow, prev, prev, { retainOnlyOlderSecondary: true }),
    );
    setHasMoreOlder(docs.length >= CHAT_MESSAGES_LIVE_LIMIT);
    setLoading(false);
    primeMediaUrls(latestWindow.map((m) => m.imageUrl));
  }, []);

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      return;
    }

    const seededChat = chatsContext?.chats.find((item) => item.id === chatId);
    if (seededChat) {
      setChat(seededChat);
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
  }, [chatId, chatsContext?.chats]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
      if (!chatId) {
        setMessages([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    setHasMoreOlder(false);
    const aborted = { value: false };

    const messagesCol = chatMessagesCollection(chatId);

    void readAllMessagesFromDeviceCache(messagesCol).then((cached) => {
      if (aborted.value || cached.length === 0) return;
      setMessages((prev) => mergeMessageListsStable(prev, cached, prev));
      setHasMoreOlder(cached.length >= CHAT_MESSAGES_LIVE_LIMIT);
      setLoading(false);
      primeMediaUrls(cached.map((m) => m.imageUrl));
    });

    void fetchLatestMessagesWindow(messagesCol).then(({ messages: latest, hasMore }) => {
      if (aborted.value) return;
      if (latest.length === 0) {
        setLoading(false);
        return;
      }
      setMessages((prev) => mergeMessageListsStable(latest, prev, prev, { retainOnlyOlderSecondary: true }));
      setHasMoreOlder(hasMore);
      setLoading(false);
      primeMediaUrls(latest.map((m) => m.imageUrl));
    }).catch((error) => {
      console.error('[useMessages] Initial messages fetch failed:', error);
    });

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
        void fetchLatestMessagesWindow(messagesCol).then(({ messages: latest, hasMore }) => {
          if (aborted.value) return;
          if (latest.length > 0) {
            setMessages((prev) => mergeMessageListsStable(latest, prev, prev, { retainOnlyOlderSecondary: true }));
            setHasMoreOlder(hasMore);
            setLoading(false);
            primeMediaUrls(latest.map((m) => m.imageUrl));
            return;
          }
          setLoading(false);
          toastRef.current({
            variant: 'destructive',
            title: 'Could not load messages',
            description: 'Check your connection and try reopening the chat.',
          });
        }).catch(() => {
          if (aborted.value) return;
          setLoading(false);
          toastRef.current({
            variant: 'destructive',
            title: 'Could not load messages',
            description: 'Check your connection and try reopening the chat.',
          });
        });
      }
    );

    return () => {
      aborted.value = true;
      unsubscribe();
    };
  }, [chatId, currentUser?.uid, applySnapshot]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || loadingOlderRef.current) return;

    const current = messagesRef.current;
    const oldest = current[current.length - 1];
    if (!oldest?.id) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchOlderMessagesPage(
        chatMessagesCollection(chatId),
        oldest.id,
      );
      setHasMoreOlder(hasMore);
      if (older.length > 0) {
        setMessages((prev) => mergeMessageListsStable(prev, older, prev));
        primeMediaUrls(older.map((m) => m.imageUrl));
      }
    } catch (error) {
      console.error('[useMessages] Failed to load older messages:', error);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [chatId]);

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
    sheetKey?: string,
    poll?: ChatPoll,
    docId?: string,
  ) => {
    if (!currentUser || !chatId) return;
    if (!text?.trim() && !imageUrl && !eventId && !setlistId && !rosterId && !qtDate && !cleaningDate && !songId && !poll && !docId) return;

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
    if (setlistId) {
      messageData.setlistId = setlistId;
      try {
        const setlistSnap = await getDoc(doc(db, 'worshipSetlists', setlistId));
        const name = setlistSnap.exists() ? setlistSnap.data()?.name : undefined;
        if (typeof name === 'string' && name.trim()) {
          messageData.setlistName = name.trim();
        }
      } catch {
        /* preview falls back to generic label */
      }
    }
    if (rosterId) messageData.rosterId = rosterId;
    if (qtDate) messageData.qtDate = qtDate;
    if (cleaningDate) messageData.cleaningDate = cleaningDate;
    if (songId) messageData.songId = songId;
    if (songTitle) messageData.songTitle = songTitle;
    if (sheetKey) messageData.sheetKey = sheetKey;
    if (docId) messageData.docId = docId;
    if (poll) {
      messageData.poll = {
        question: poll.question.trim(),
        options: poll.options.map((option) => option.trim()).filter(Boolean),
        ...(poll.allowMultiple ? { allowMultiple: true } : {}),
        ...(poll.resultsLocked ? { resultsLocked: true } : {}),
      };
      messageData.pollVotes = Object.fromEntries(
        messageData.poll.options.map((_: string, index: number) => [String(index), [] as string[]]),
      );
    }

    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);

    const lastText = formatChatMessagePreview({
      text: trimmedText,
      imageUrl,
      eventId,
      setlistId,
      setlistName: typeof messageData.setlistName === 'string' ? messageData.setlistName : undefined,
      rosterId,
      qtDate,
      cleaningDate,
      songId,
      songTitle,
      sheetKey,
      poll,
      docId,
    });

    try {
        // Atomic message + chat preview so push never runs against a stale lastMessage.
        const docRef = doc(messagesColRef);
        const batch = writeBatch(db);
        batch.set(docRef, messageData);
        batch.update(chatDocRef, {
            lastMessageText: lastText,
            lastMessageSentAt: serverTimestamp(),
            lastMessageSenderId: currentUser.uid,
        });
        await batch.commit();
        void dispatchChatPush({
            chatId,
            messageId: docRef.id,
            text: lastText,
            senderId: currentUser.uid,
        });
    } catch (error) {
        console.error("Message lifecycle failure:", error);
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
        const isPermission = code === 'permission-denied';
        toastRef.current({
          variant: 'destructive',
          title: 'Message not sent',
          description: isPermission
            ? 'Polls need updated chat permissions. Ask an admin to deploy Firestore rules, then try again.'
            : error instanceof Error ? error.message : 'Could not save this message. Try again.',
        });
    }

  }, [currentUser, chatId]);

  const sendImageMessage = useCallback((imageUrl: string, replyToId?: string) => {
    sendMessage(undefined, imageUrl, replyToId);
  }, [sendMessage]);

  const markAsSeen = useCallback((messageId: string) => {
    if (!currentUser || !chatId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    updateDoc(messageRef, { seenBy: arrayUnion(currentUser.uid) }).catch(() => {});
  }, [currentUser, chatId]);

  const updateSeenTimestamp = useCallback(() => {
    if (!currentUser || !chatId) return;
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    updateDoc(chatDocRef, { [`memberSeen.${currentUser.uid}`]: serverTimestamp() }).catch(() => {});
  }, [currentUser, chatId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId) return;
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    const previous = messagesRef.current.find((m) => m.id === messageId);
    const previousReactions = previous?.reactions ? { ...previous.reactions } : {};

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

    try {
      await updateDoc(messageRef, { reactions: nextReactions });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: previousReactions } : m)),
      );
    }
  }, [currentUser, chatId]);

  const votePoll = useCallback(async (messageId: string, optionIndex: number) => {
    if (!currentUser || !chatId) return;
    const message = messagesRef.current.find((m) => m.id === messageId);
    if (!message?.poll) return;
    if (message.poll.resultsLocked) return;

    const uid = currentUser.uid;
    const key = String(optionIndex);
    const optionCount = message.poll.options.length;
    if (optionIndex < 0 || optionIndex >= optionCount) return;

    const allowMultiple = message.poll.allowMultiple ?? false;
    const previousVotes: Record<string, string[]> = {};
    for (let i = 0; i < optionCount; i++) {
      previousVotes[String(i)] = [...(message.pollVotes?.[String(i)] || [])];
    }
    const nextVotes: Record<string, string[]> = {};
    for (let i = 0; i < optionCount; i++) {
      nextVotes[String(i)] = [...previousVotes[String(i)]];
    }

    const alreadyVoted = nextVotes[key].includes(uid);
    const isAddingVote = !alreadyVoted;

    if (allowMultiple) {
      if (alreadyVoted) {
        nextVotes[key] = nextVotes[key].filter((id) => id !== uid);
      } else {
        nextVotes[key] = [...nextVotes[key], uid];
      }
    } else {
      for (let i = 0; i < optionCount; i++) {
        nextVotes[String(i)] = nextVotes[String(i)].filter((id) => id !== uid);
      }
      if (!alreadyVoted) {
        nextVotes[key] = [...nextVotes[key], uid];
      }
    }

    const now = Timestamp.now();
    const previousUpdatedAt = message.pollUpdatedAt;

    setMessages((prev) =>
      sortChatMessagesDesc(
        prev.map((m) =>
          m.id === messageId ? { ...m, pollVotes: nextVotes, pollUpdatedAt: now } : m,
        ),
      ),
    );

    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    try {
      await updateDoc(messageRef, { pollVotes: nextVotes, pollUpdatedAt: serverTimestamp() });
      if (isAddingVote && message.senderId !== uid) {
        const headers = await getClientAuthHeaders();
        fetch('/api/send-poll-vote-push', {
          method: 'POST',
          headers,
          body: JSON.stringify({ chatId, messageId, optionIndex }),
        }).catch((error) => console.error('[useMessages] Poll vote push failed:', error));
      }
    } catch (error) {
      console.error('[useMessages] Poll vote failed:', error);
      setMessages((prev) =>
        sortChatMessagesDesc(
          prev.map((m) =>
            m.id === messageId
              ? { ...m, pollVotes: previousVotes, pollUpdatedAt: previousUpdatedAt }
              : m,
          ),
        ),
      );
      toastRef.current({
        variant: 'destructive',
        title: 'Vote not saved',
        description: error instanceof Error ? error.message : 'Could not save your vote.',
      });
    }
  }, [currentUser, chatId]);

  const setPollResultsLocked = useCallback(async (messageId: string, locked: boolean) => {
    if (!currentUser || !chatId) return;
    const message = messagesRef.current.find((m) => m.id === messageId);
    if (!message?.poll) return;
    if (message.senderId !== currentUser.uid) return;
    if (!!message.poll.resultsLocked === locked) return;

    const nextPoll: ChatPoll = {
      question: message.poll.question,
      options: [...message.poll.options],
      ...(message.poll.allowMultiple ? { allowMultiple: true } : {}),
      ...(locked ? { resultsLocked: true } : {}),
    };

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, poll: nextPoll } : m)),
    );

    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    updateDoc(messageRef, { poll: nextPoll }).catch((error) => {
      console.error('[useMessages] Poll results lock failed:', error);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, poll: message.poll } : m)),
      );
      toastRef.current({
        variant: 'destructive',
        title: locked ? 'Could not lock voting' : 'Could not unlock voting',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    });
  }, [currentUser, chatId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!chatId || !currentUser) return;
    const chatDocRef = doc(db, CHATS_COLLECTION, chatId);
    const messageRef = doc(db, CHATS_COLLECTION, chatId, MESSAGES_SUBCOLLECTION, messageId);
    const messagesColRef = collection(chatDocRef, MESSAGES_SUBCOLLECTION);
    try {
      let messageData = messagesRef.current.find((m) => m.id === messageId);
      if (!messageData) {
        const snap = await getDoc(messageRef);
        if (snap.exists()) {
          messageData = { id: snap.id, ...snap.data() } as ChatMessage;
        }
      }
      const deletedContentType = messageData
        ? getDeletedMessageContentType(messageData)
        : 'message';
      if (messageData?.imageUrl) {
        await deleteStorageObjectAtUrl(messageData.imageUrl);
      }

      await updateDoc(messageRef, {
        isDeleted: true,
        deletedBy: currentUser.uid,
        deletedContentType,
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
        docId: deleteField(),
        threadParentId: deleteField(),
        reactions: deleteField(),
        poll: deleteField(),
        pollVotes: deleteField(),
        pollUpdatedAt: deleteField(),
      });

      const latestSnap = await getDocs(
        query(messagesColRef, orderBy('createdAt', 'desc'), limit(1)),
      );
      if (!latestSnap.empty) {
        const latest = { id: latestSnap.docs[0].id, ...latestSnap.docs[0].data() } as ChatMessage;
        await updateDoc(chatDocRef, {
          lastMessageText: formatChatMessagePreview(latest),
          lastMessageSenderId: latest.isDeleted ? (latest.deletedBy || latest.senderId) : latest.senderId,
        });
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
      toastRef.current({ title: 'Error', description: 'Failed to delete message.', variant: 'destructive' });
    }
  }, [chatId, currentUser]);


  return { 
    messages, 
    chat, 
    loading,
    loadingOlder,
    hasMoreOlder,
    loadOlderMessages,
    sendMessage, 
    sendImageMessage,
    markAsSeen,
    updateSeenTimestamp,
    toggleReaction,
    votePoll,
    setPollResultsLocked,
    deleteMessage,
  };
}
