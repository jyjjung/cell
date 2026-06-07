"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages } from '@/hooks/useMessages';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { ArrowUp, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage } from '@/types';
import SlashCommandSelector from './SlashCommandSelector';

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
    sheetKey?: string
  ) => void | Promise<void>;
  sendImageMessage: (imageUrl: string, replyToId?: string) => void;
  updateTypingStatus?: (isTyping: boolean) => void;
};

export default function MessageInput({ 
  chatId, 
  disabled = false, 
  replyToMessage, 
  onCancelReply,
  onOpenWorshipCreate,
  parentMessageId,
  messageActions,
}: { 
  chatId: string; 
  disabled?: boolean; 
  replyToMessage?: ChatMessage; 
  onCancelReply?: () => void;
  onOpenWorshipCreate?: (type: 'song' | 'setlist' | 'roster' | 'chords', songId?: string) => void;
  parentMessageId?: string;
  messageActions?: MessageActions;
}) {
  const useOwnHooks = !messageActions;
  const mainChat = useMessages(!parentMessageId && useOwnHooks ? chatId : null);
  const threadChat = useThreadMessages(chatId, parentMessageId && useOwnHooks ? parentMessageId : null);
  
  const sendMessage = messageActions?.sendMessage
    ?? (parentMessageId ? threadChat.sendMessage : mainChat.sendMessage);
  const sendImageMessage = messageActions?.sendImageMessage
    ?? (parentMessageId ? threadChat.sendImageMessage : mainChat.sendImageMessage);
  const updateTypingStatus = messageActions?.updateTypingStatus
    ?? (parentMessageId ? () => {} : mainChat.updateTypingStatus);

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [stagedCommand, setStagedCommand] = useState<{
    type: string;
    id: string;
    label: string;
    metadata?: any;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText && !stagedCommand && !isUploading) return;
    if (showSlashCommands) return;

    if (stagedCommand) {
      // Send with metadata
      const args: [string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?] = [
        trimmedText || undefined, 
        stagedCommand.metadata?.imageUrl, 
        replyToMessage?.id
      ];
      
      const { type, id, metadata } = stagedCommand;
      if (type === 'event') args[3] = id;
      else if (type === 'setlist') args[4] = id;
      else if (type === 'roster') args[5] = id;
      else if (type === 'qt') args[6] = id;
      else if (type === 'cleaning') args[7] = id;
      else if (type === 'song') {
          args[8] = id;
          if (metadata?.songTitle) args[9] = metadata.songTitle;
          if (metadata?.sheetKey) args[10] = metadata.sheetKey;
      }

      sendMessage(...args);
      setStagedCommand(null);
    } else {
      // Plain text message
      sendMessage(trimmedText, undefined, replyToMessage?.id);
    }

    setText('');
    updateTypingStatus(false);
    setShowSlashCommands(false);
    if (onCancelReply) onCancelReply();
  };

  const handleSlashSelect = (
    type: 'event' | 'setlist' | 'roster' | 'qt' | 'cleaning' | 'song' | 'chords' | 'new-song' | 'new-setlist' | 'new-roster' | 'image', 
    id: string,
    metadata?: any
  ) => {
    // Check if it's a creation command
    if (type === 'image') {
       handleImageClick();
       setShowSlashCommands(false);
       return;
    }
    if (type === 'new-song') {
      onOpenWorshipCreate?.('song');
      setText('');
      setShowSlashCommands(false);
      return;
    }
    if (type === 'new-setlist') {
      onOpenWorshipCreate?.('setlist');
      setText('');
      setShowSlashCommands(false);
      return;
    }
    if (type === 'new-roster') {
      onOpenWorshipCreate?.('roster');
      setText('');
      setShowSlashCommands(false);
      return;
    }
    if (type === 'chords') {
      onOpenWorshipCreate?.('chords', id);
      setText('');
      setShowSlashCommands(false);
      return;
    }

    // If it's a shared item, stage it
    setStagedCommand({
        type,
        id,
        label: metadata?.label || type,
        metadata
    });
    
    // Smart replacement: Replace the portion from triggerIndex to current selection
    if (triggerIndex !== null) {
        const before = text.substring(0, triggerIndex);
        // We find the end of the "command" part which likely ends at current length or space
        // For simplicity, we'll just clear from the triggerIndex onwards if it was just a command
        // But a better way is to keep anything typed AFTER the cursor if we were in the middle
        const after = text.substring(text.indexOf(' ', triggerIndex) === -1 ? text.length : text.indexOf(' ', triggerIndex));
        setText(before.trim() + (after ? ' ' + after.trim() : ''));
    } else if (text.startsWith('/')) {
        setText('');
    }
    
    setTriggerIndex(null);
    setShowSlashCommands(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowSlashCommands(false);
    }
  };

  const handleImageClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const uploadChatImage = (file: File, index: number): Promise<string> => {
    const storagePath = `chats/${chatId}/${Date.now()}_${index}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
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
    });
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
        const downloadURL = await uploadChatImage(file, i);
        sendImageMessage(downloadURL, i === 0 ? replyToMessage?.id : undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({ variant: 'destructive', title: 'Upload failed', description: message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-2">
      {replyToMessage && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 truncate opacity-70">
            <span className="font-bold">Replying to message:</span>
            <span className="truncate max-w-[150px]">{replyToMessage.text || 'Image'}</span>
          </div>
          <button onClick={onCancelReply} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="relative group flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" multiple className="hidden" />
        <button 
            type="button" 
            onClick={() => setShowSlashCommands(!showSlashCommands)} 
            disabled={disabled || isUploading}
            className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground transition-all active:scale-90", 
                showSlashCommands && "bg-foreground text-background rotate-45",
                isUploading && "animate-pulse"
            )}
        >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
        </button>

        <div className="flex flex-1 items-center overflow-hidden rounded-[1.25rem] border border-border/60 bg-card px-3 py-1 transition-colors focus-within:border-ring">
          {stagedCommand && (
            <div className="mr-2 flex max-w-[120px] shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1">
               <span className="truncate text-[10px] font-semibold uppercase text-foreground">{stagedCommand.label}</span>
               <button onClick={() => setStagedCommand(null)} className="text-muted-foreground transition-colors hover:text-foreground">
                 <X className="w-3 h-3" />
               </button>
            </div>
          )}
          <input
              type="text"
              placeholder={stagedCommand ? "" : (isUploading ? "Uploading..." : "Message")}
              value={text}
              disabled={disabled || isUploading}
              onChange={(e) => {
                  const val = e.target.value;
                  const cursor = e.target.selectionStart || 0;
                  setText(val);
                  
                  // Global slash trigger logic
                  const lastSlash = val.lastIndexOf('/', cursor - 1);
                  if (lastSlash !== -1) {
                      // Check if there's a space before the slash or it's at start
                      if (lastSlash === 0 || val[lastSlash - 1] === ' ') {
                          setShowSlashCommands(true);
                          setTriggerIndex(lastSlash);
                      }
                  } else if (val === '' || !val.includes('/')) {
                      setShowSlashCommands(false);
                      setTriggerIndex(null);
                  }
              }}
              onFocus={() => !disabled && !isUploading && updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: '16px' }}
              className="flex-1 border-none bg-transparent py-1.5 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button 
              type="button" 
              onClick={handleSend} 
              disabled={disabled || (!text.trim() && !stagedCommand) || isUploading}
              className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-all", (!disabled && (text.trim() || stagedCommand)) ? "bg-foreground text-background" : "bg-muted text-muted-foreground opacity-40")}
          >
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        <AnimatePresence>
          {showSlashCommands && (
              <SlashCommandSelector 
                  inputValue={triggerIndex !== null ? text.substring(triggerIndex) : text} 
                  onSelect={handleSlashSelect} 
                  onClose={() => {
                    setShowSlashCommands(false);
                    setTriggerIndex(null);
                  }} 
                  onCategoryClick={(cat) => {
                    if (triggerIndex !== null) {
                        const before = text.substring(0, triggerIndex);
                        setText(`${before}/${cat} `);
                    } else {
                        setText(`/${cat} `);
                    }
                  }}
                  showWorshipCreation={!!onOpenWorshipCreate}
              />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
