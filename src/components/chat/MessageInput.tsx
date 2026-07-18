"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { isIOSLike, preLiftChatComposer } from '@/hooks/use-chat-visual-viewport-vars';
import {
    createSharedDocForChat,
    shareDocWithChatMembers,
    useDocs
} from '@/hooks/use-docs';
import { useToast } from '@/hooks/use-toast';
import { useMessages } from '@/hooks/useMessages';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { getDocActionErrorMessage } from '@/lib/docs-errors';
import {
    displayDocTitle, DOCS_COLLECTION, LONG_MESSAGE_DOC_THRESHOLD,
    plainTextToDocHtml
} from '@/lib/docs-utils';
import { db, storage } from '@/lib/firebase';
import { createChatImageThumbnail } from '@/lib/chat-image-thumb';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatPoll, DocNote } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { AnimatePresence } from 'framer-motion';
import { ArrowUp, Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChatAttachmentMenu, { type AttachmentPick } from './ChatAttachmentMenu';

type MessageActions = {
  sendMessage: (
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
    imageThumbUrl?: string,
  ) => void | Promise<void>;
  sendImageMessage: (imageUrl: string, replyToId?: string, imageThumbUrl?: string) => void;
};

type StagedAttachment = {
  type: 'setlist' | 'roster' | 'song' | 'doc';
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export default function MessageInput({
  chatId,
  disabled = false,
  replyToMessage,
  onCancelReply,
  parentMessageId,
  messageActions,
  attachmentsOnlyPhoto = false,
}: {
  chatId: string;
  disabled?: boolean;
  replyToMessage?: ChatMessage;
  onCancelReply?: () => void;
  parentMessageId?: string;
  messageActions?: MessageActions;
  attachmentsOnlyPhoto?: boolean;
}) {
  const useOwnHooks = !messageActions;
  const mainChat = useMessages(!parentMessageId && useOwnHooks ? chatId : null);
  const threadChat = useThreadMessages(chatId, parentMessageId && useOwnHooks ? parentMessageId : null);

  const sendMessage = messageActions?.sendMessage
    ?? (parentMessageId ? threadChat.sendMessage : mainChat.sendMessage);
  const sendImageMessage = messageActions?.sendImageMessage
    ?? (parentMessageId ? threadChat.sendImageMessage : mainChat.sendImageMessage);

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { docs } = useDocs(currentUser?.uid);
  const [text, setText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingDoc, setIsSendingDoc] = useState(false);
  const [isTouchKeyboardMode, setIsTouchKeyboardMode] = useState(false);
  const [longMessageOpen, setLongMessageOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_TEXTAREA_HEIGHT = 100;

  const t = translations[currentUser?.preferredLanguage || 'en'];

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(pointer: coarse)');
    const updateTouchMode = () => {
      setIsTouchKeyboardMode(media.matches);
    };
    updateTouchMode();
    media.addEventListener('change', updateTouchMode);
    return () => media.removeEventListener('change', updateTouchMode);
  }, []);

  const clearComposer = () => {
    setText('');
    setStagedAttachment(null);
    setShowAttachmentMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (onCancelReply) onCancelReply();
  };

  const sendPlainOrStaged = () => {
    const trimmedText = text.trim();
    if (stagedAttachment) {
      const args: [
        string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, ChatPoll?, string?,
      ] = [trimmedText || undefined, undefined, replyToMessage?.id];

      if (stagedAttachment.type === 'setlist') args[4] = stagedAttachment.id;
      else if (stagedAttachment.type === 'roster') args[5] = stagedAttachment.id;
      else if (stagedAttachment.type === 'song') {
        args[8] = stagedAttachment.id;
        const meta = stagedAttachment.metadata;
        if (meta?.songTitle) args[9] = meta.songTitle as string;
        if (meta?.sheetKey) args[10] = meta.sheetKey as string;
        if (meta?.imageUrl) args[1] = meta.imageUrl as string;
      } else if (stagedAttachment.type === 'doc') {
        args[12] = stagedAttachment.id;
      }

      void sendMessage(...args);
    } else {
      void sendMessage(trimmedText, undefined, replyToMessage?.id);
    }
    clearComposer();
  };

  const sendTextAsDocument = async (rawText: string) => {
    if (!currentUser) return;
    setIsSendingDoc(true);
    try {
      const docId = await createSharedDocForChat({
        ownerId: currentUser.uid,
        chatId,
        title: '',
        content: plainTextToDocHtml(rawText),
      });
      await sendMessage(
        undefined,
        undefined,
        replyToMessage?.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        docId,
      );
      clearComposer();
      toast({ title: t.documentSharedInChat });
      router.push(`/docs/${docId}`);
    } catch (e: unknown) {
      toast({
        title: t.error,
        description: getDocActionErrorMessage(e, t),
        variant: 'destructive',
      });
    } finally {
      setIsSendingDoc(false);
      setLongMessageOpen(false);
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText && !stagedAttachment && !isUploading) return;
    if (showAttachmentMenu) return;
    if (isSendingDoc) return;

    if (
      !stagedAttachment &&
      trimmedText.length >= LONG_MESSAGE_DOC_THRESHOLD
    ) {
      setLongMessageOpen(true);
      return;
    }

    sendPlainOrStaged();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !isTouchKeyboardMode &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      !showAttachmentMenu
    ) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowAttachmentMenu(false);
    }
  };

  const handleComposerMouseDown = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!isIOSLike()) return;
    if (disabled || isUploading) return;
    const el = e.currentTarget;
    if (document.activeElement === el) return;

    preLiftChatComposer();
    e.preventDefault();
    el.focus({ preventScroll: true });
  };

  const handleImageClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const uploadChatImage = async (
    file: File,
    index: number,
  ): Promise<{ imageUrl: string; imageThumbUrl?: string }> => {
    const stamp = Date.now();
    const storagePath = `chats/${chatId}/${stamp}_${index}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    const uploadFull = new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: STORAGE_CACHE_CONTROL,
      });
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(error),
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        },
      );
    });

    const thumbBlob = await createChatImageThumbnail(file);
    const uploadThumb = thumbBlob
      ? new Promise<string>((resolve, reject) => {
          const thumbRef = ref(storage, `chats/${chatId}/${stamp}_${index}_thumb.jpg`);
          const uploadTask = uploadBytesResumable(thumbRef, thumbBlob, {
            contentType: 'image/jpeg',
            cacheControl: STORAGE_CACHE_CONTROL,
          });
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            },
          );
        }).catch(() => '')
      : Promise.resolve('');

    const [imageUrl, imageThumbUrl] = await Promise.all([uploadFull, uploadThumb]);
    return imageThumbUrl ? { imageUrl, imageThumbUrl } : { imageUrl };
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !chatId || !currentUser) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please select image files.' });
      return;
    }
    if (imageFiles.length < files.length) {
      toast({
        variant: 'destructive',
        title: 'Some files skipped',
        description: 'Only image files were uploaded.',
      });
    }

    try {
      setIsUploading(true);
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const { imageUrl, imageThumbUrl } = await uploadChatImage(file, i);
        sendImageMessage(imageUrl, i === 0 ? replyToMessage?.id : undefined, imageThumbUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  const attachExistingDoc = async (docId: string, label: string) => {
    if (!currentUser) return;
    setIsSendingDoc(true);
    try {
      const note =
        docs.find((d) => d.id === docId) ||
        (await (async () => {
          const snap = await getDoc(doc(db, DOCS_COLLECTION, docId));
          if (!snap.exists()) return null;
          return { id: snap.id, ...snap.data() } as DocNote;
        })());

      if (note) {
        await shareDocWithChatMembers({
          docId,
          note,
          actorId: currentUser.uid,
          chatId,
        });
      }

      setStagedAttachment({
        type: 'doc',
        id: docId,
        label: displayDocTitle(label || note?.title, t.untitledDocument),
      });
    } catch (e: unknown) {
      toast({
        title: t.error,
        description: getDocActionErrorMessage(e, t),
        variant: 'destructive',
      });
    } finally {
      setIsSendingDoc(false);
    }
  };

  const createAndAttachNewDoc = async () => {
    if (!currentUser) return;
    setIsSendingDoc(true);
    try {
      const docId = await createSharedDocForChat({
        ownerId: currentUser.uid,
        chatId,
        title: '',
        content: '<p></p>',
      });
      await sendMessage(
        undefined,
        undefined,
        replyToMessage?.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        docId,
      );
      clearComposer();
      toast({ title: t.documentSharedInChat });
      router.push(`/docs/${docId}`);
    } catch (e: unknown) {
      toast({
        title: t.error,
        description: getDocActionErrorMessage(e, t),
        variant: 'destructive',
      });
    } finally {
      setIsSendingDoc(false);
    }
  };

  const handleAttachmentPick = (pick: AttachmentPick) => {
    if (pick.type === 'photo') {
      handleImageClick();
      return;
    }
    if (pick.type === 'poll') {
      void sendMessage(
        undefined,
        undefined,
        replyToMessage?.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        pick.poll,
      );
      setShowAttachmentMenu(false);
      if (onCancelReply) onCancelReply();
      return;
    }
    if (pick.type === 'new-doc') {
      void createAndAttachNewDoc();
      return;
    }
    if (pick.type === 'doc') {
      void attachExistingDoc(pick.id, pick.label);
      return;
    }
    if (pick.type === 'setlist' || pick.type === 'roster') {
      setStagedAttachment({ type: pick.type, id: pick.id, label: pick.label });
      return;
    }
    if (pick.type === 'song') {
      setStagedAttachment({
        type: 'song',
        id: pick.id,
        label: pick.label,
        metadata: pick.metadata,
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-2">
      {replyToMessage && (
        <div className="flex items-center justify-between rounded-full border border-border/50 bg-muted/30 px-4 py-1.5 text-xs mx-1">
          <div className="flex items-center gap-2 truncate opacity-70">
            <span className="font-bold">Replying to message:</span>
            <span className="truncate max-w-[150px]">{replyToMessage.text || 'Image'}</span>
          </div>
          <button onClick={onCancelReply} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="relative flex items-end gap-1.5">
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        <button
          type="button"
          onClick={() => setShowAttachmentMenu((v) => !v)}
          disabled={disabled || isUploading || isSendingDoc}
          className={cn(
            'relative mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:scale-95',
            showAttachmentMenu ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            (isUploading || isSendingDoc) && 'animate-pulse',
          )}
        >
          {isUploading || isSendingDoc ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>

        <div className="flex flex-1 items-end overflow-hidden rounded-2xl border border-border/50 bg-muted/30 px-3 py-1.5 min-h-[40px] transition-colors focus-within:border-ring/60 focus-within:bg-muted/40">
          {stagedAttachment && (
            <div className="mb-0.5 mr-2 flex max-w-[120px] shrink-0 items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1">
              <span className="truncate text-sm font-medium text-foreground">{stagedAttachment.label}</span>
              <button onClick={() => setStagedAttachment(null)} className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={stagedAttachment ? '' : isUploading ? 'Uploading...' : 'Message'}
            value={text}
            disabled={disabled || isUploading || isSendingDoc}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={handleComposerMouseDown}
            className="flex-1 resize-none border-none bg-transparent py-1.5 text-base text-foreground outline-none placeholder:text-muted-foreground leading-snug max-h-[100px]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !stagedAttachment) || isUploading || isSendingDoc}
            className={cn(
              'mb-0.5 ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all',
              !disabled && (text.trim() || stagedAttachment)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground opacity-40',
            )}
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        <AnimatePresence>
          {showAttachmentMenu && (
            <ChatAttachmentMenu
              onPick={handleAttachmentPick}
              onClose={() => setShowAttachmentMenu(false)}
              photoOnly={attachmentsOnlyPhoto}
            />
          )}
        </AnimatePresence>
      </div>

      <AlertDialog open={longMessageOpen} onOpenChange={setLongMessageOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.longMessageAsDocTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.longMessageAsDocDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-lg" disabled={isSendingDoc}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg"
              disabled={isSendingDoc}
              onClick={(e) => {
                e.preventDefault();
                setLongMessageOpen(false);
                sendPlainOrStaged();
              }}
            >
              {t.sendAsMessage}
            </AlertDialogAction>
            <AlertDialogAction
              className="rounded-lg"
              disabled={isSendingDoc}
              onClick={(e) => {
                e.preventDefault();
                void sendTextAsDocument(text);
              }}
            >
              {isSendingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.sendAsDocument}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
