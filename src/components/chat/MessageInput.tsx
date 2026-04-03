"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages } from '@/hooks/useMessages';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { ArrowUp, Image as ImageIcon, Loader2, X } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled || isUploading) return;
    if (showSlashCommands) return;

    sendMessage(trimmedText, undefined, replyToMessage?.id);
    setText('');
    updateTypingStatus(false);
    setShowSlashCommands(false);
    if (onCancelReply) onCancelReply();
  };

  const handleSlashSelect = (type: 'invitation' | 'event' | 'setlist' | 'roster' | 'qt' | 'cleaning' | 'song' | 'chords' | 'new-song' | 'new-setlist' | 'new-roster', id: string) => {
    // Check if it's a creation command
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

    const args: [string?, string?, string?, string?, string?, string?, string?, string?, string?, string?] = [undefined, undefined, replyToMessage?.id];
    
    if (type === 'invitation') args[3] = id;
    else if (type === 'event') args[4] = id;
    else if (type === 'setlist') args[5] = id;
    else if (type === 'roster') args[6] = id;
    else if (type === 'qt') args[7] = id;
    else if (type === 'cleaning') args[8] = id;
    else if (type === 'song') args[9] = id; 

    sendMessage(...args);
    setText('');
    setShowSlashCommands(false);
    if (onCancelReply) onCancelReply();
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
        const uploadTask = uploadBytesResumable(storageRef, file);
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
        <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs">
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
            onClick={handleImageClick} 
            disabled={disabled || isUploading}
            className={cn("h-9 w-9 flex items-center justify-center rounded-full bg-white/5 border border-white/5 text-muted-foreground", isUploading && "animate-pulse")}
        >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
        </button>

        <div className="flex-1 flex items-center bg-[#3B3B3D]/40 backdrop-blur-3xl px-4 py-1 rounded-full border border-white/5 overflow-hidden">
          <input
              type="text"
              placeholder={isUploading ? "Uploading..." : "Message"}
              value={text}
              disabled={disabled || isUploading}
              onChange={(e) => {
                  const val = e.target.value;
                  setText(val);
                  setShowSlashCommands(val.startsWith('/'));
              }}
              onFocus={() => !disabled && !isUploading && updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent border-none outline-none text-white py-1.5 placeholder:text-muted-foreground/50"
          />
          <button 
              type="button" 
              onClick={handleSend} 
              disabled={disabled || text.trim() === '' || isUploading}
              className={cn("h-7 w-7 flex items-center justify-center rounded-full", !disabled && text.trim() ? "bg-[#007AFF] text-white" : "bg-white/10 text-muted-foreground opacity-20")}
          >
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        <AnimatePresence>
          {showSlashCommands && (
              <SlashCommandSelector 
                  inputValue={text} 
                  onSelect={handleSlashSelect} 
                  onClose={() => setShowSlashCommands(false)} 
                  showWorshipCreation={!!onOpenWorshipCreate}
              />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
