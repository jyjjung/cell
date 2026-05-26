"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages } from '@/hooks/useMessages';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { ArrowUp, Image as ImageIcon, Loader2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { ref, uploadBytesResumable, getDownloadURL, StorageError, UploadTaskSnapshot } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage } from '@/types';
import SlashCommandSelector from './SlashCommandSelector';

export default function MessageInput({ 
  chatId, 
  disabled = false, 
  replyToMessage, 
  onCancelReply,
  onOpenWorshipCreate,
  parentMessageId 
}: { 
  chatId: string; 
  disabled?: boolean; 
  replyToMessage?: ChatMessage; 
  onCancelReply?: () => void;
  onOpenWorshipCreate?: (type: 'song' | 'setlist' | 'roster' | 'chords', songId?: string) => void;
  parentMessageId?: string;
}) {
  const mainChat = useMessages(parentMessageId ? null : chatId);
  const threadChat = useThreadMessages(chatId, parentMessageId || null);
  
  const sendMessage = parentMessageId ? threadChat.sendMessage : mainChat.sendMessage;
  const sendImageMessage = parentMessageId ? threadChat.sendImageMessage : mainChat.sendImageMessage;
  const updateTypingStatus = parentMessageId ? () => {} : mainChat.updateTypingStatus;

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
      const args: [string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?] = [
        trimmedText || undefined, 
        stagedCommand.metadata?.imageUrl, 
        replyToMessage?.id
      ];
      
      const { type, id, metadata } = stagedCommand;
      if (type === 'invitation') args[3] = id;
      else if (type === 'event') args[4] = id;
      else if (type === 'setlist') args[5] = id;
      else if (type === 'roster') args[6] = id;
      else if (type === 'qt') args[7] = id;
      else if (type === 'cleaning') args[8] = id;
      else if (type === 'song') {
          args[9] = id;
          if (metadata?.songTitle) args[10] = metadata.songTitle;
          if (metadata?.sheetKey) args[11] = metadata.sheetKey;
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
    type: 'invitation' | 'event' | 'setlist' | 'roster' | 'qt' | 'cleaning' | 'song' | 'chords' | 'new-song' | 'new-setlist' | 'new-roster' | 'image', 
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId || !currentUser) return;
    if (!file.type.startsWith('image/')) {
        toast({ variant: "destructive", title: "Invalid file type", description: "Please select an image file." });
        return;
    }
    try {
        setIsUploading(true);
        const storagePath = `chats/${chatId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file, {
            contentType: file.type || 'image/jpeg',
            cacheControl: 'public, max-age=31536000'
        });
        uploadTask.on('state_changed', null, (error) => {
            setIsUploading(false);
            toast({ variant: "destructive", title: "Upload failed", description: error.message });
        }, async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            sendImageMessage(downloadURL, replyToMessage?.id);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploading(false);
        });
    } catch (error) {
        setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-2">
      {replyToMessage && (
        <div className="flex items-center justify-between bg-muted border border-border/50 rounded-xl px-4 py-2 text-xs">
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
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        <button 
            type="button" 
            onClick={() => setShowSlashCommands(!showSlashCommands)} 
            disabled={disabled || isUploading}
            className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary transition-all active:scale-90", 
                showSlashCommands && "bg-primary text-white rotate-45",
                isUploading && "animate-pulse"
            )}
        >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={3} />}
        </button>

        <div className="flex-1 flex items-center bg-muted/40 backdrop-blur-3xl px-3 py-1 rounded-[1.25rem] border border-border/50 overflow-hidden focus-within:border-primary/50 transition-colors">
          {stagedCommand && (
            <div className="flex items-center gap-1.5 bg-primary/20 border border-primary/30 rounded-lg px-2 py-1 mr-2 shrink-0 max-w-[120px]">
               <span className="text-[10px] font-black uppercase text-primary truncate">{stagedCommand.label}</span>
               <button onClick={() => setStagedCommand(null)} className="text-primary/60 hover:text-primary">
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
              className="flex-1 bg-transparent border-none outline-none text-foreground py-1.5 placeholder:text-muted-foreground/50"
          />
          <button 
              type="button" 
              onClick={handleSend} 
              disabled={disabled || (!text.trim() && !stagedCommand) || isUploading}
              className={cn("h-7 w-7 flex items-center justify-center rounded-full transition-all", (!disabled && (text.trim() || stagedCommand)) ? "bg-[#007AFF] text-white" : "bg-muted text-muted-foreground opacity-20")}
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
