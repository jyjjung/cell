
"use client";

import { useState, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { ArrowUp, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { ref, uploadBytesResumable, getDownloadURL, StorageError, UploadTaskSnapshot } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage } from '@/types';
import { X } from 'lucide-react';

export default function MessageInput({ 
  chatId, 
  disabled = false, 
  replyToMessage, 
  onCancelReply,
  parentMessageId 
}: { 
  chatId: string; 
  disabled?: boolean; 
  replyToMessage?: ChatMessage; 
  onCancelReply?: () => void;
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled || isUploading) return;

    sendMessage(trimmedText, undefined, replyToMessage?.id);
    setText('');
    updateTypingStatus(false);
    if (onCancelReply) onCancelReply();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId || !currentUser) {
        console.log("Upload aborted: Missing file, chatId, or user", { file: !!file, chatId, user: !!currentUser });
        return;
    }

    // Only allow images
    if (!file.type.startsWith('image/')) {
        toast({
            variant: "destructive",
            title: "Invalid file type",
            description: "Please select an image file."
        });
        return;
    }

    console.log("Starting image upload...", file.name, file.size, file.type);

    try {
        setIsUploading(true);
        const storagePath = `chats/${chatId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot: UploadTaskSnapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
            }, 
            (error: StorageError) => {
                console.error("Upload task error:", error);
                setIsUploading(false);
                toast({
                    variant: "destructive",
                    title: "Upload failed",
                    description: error.message || "There was an error uploading your image."
                });
            }, 
            async () => {
                try {
                    console.log("Upload complete, getting download URL...");
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("Download URL obtained:", downloadURL);
                    
                    sendImageMessage(downloadURL, replyToMessage?.id);
                    
                    // Reset file input
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    console.log("Image message sent successfully");
                } catch (urlError) {
                    console.error("Error getting download URL:", urlError);
                    toast({
                        variant: "destructive",
                        title: "Download URL error",
                        description: "Image uploaded but could not retrieve access link."
                    });
                } finally {
                    setIsUploading(false);
                }
            }
        );

    } catch (error) {
        console.error("Initial upload setup error:", error);
        toast({
            variant: "destructive",
            title: "Upload failed",
            description: "Could not start the upload process."
        });
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
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            className="hidden" 
        />
        
        <button 
            type="button"
            onClick={handleImageClick}
            disabled={disabled || isUploading}
            className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 bg-white/5 border border-white/5 text-muted-foreground hover:text-white hover:bg-white/10",
                isUploading && "animate-pulse"
            )}
        >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
        </button>

        <div className="flex-1 flex items-center bg-[#3B3B3D]/40 backdrop-blur-3xl px-4 py-1 rounded-full border border-white/5 focus-within:bg-[#3B3B3D]/60 transition-all shadow-inner overflow-hidden">
          <input
              type="text"
              placeholder={isUploading ? (t.uploadingImage || "Uploading Image...") : (disabled ? (t.chatOfflinePlaceholder || t.messagePlaceholder) : (t.messagePlaceholder || "Message"))}
              value={text}
              disabled={disabled || isUploading}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => !disabled && !isUploading && updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent border-none outline-none text-white py-1.5 placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
          
          <button 
              type="button"
              onClick={handleSend} 
              disabled={disabled || text.trim() === '' || isUploading}
              className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0",
                  !disabled && text.trim() ? "bg-[#007AFF] text-white shadow-lg" : "bg-white/10 text-muted-foreground opacity-20"
              )}
          >
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

