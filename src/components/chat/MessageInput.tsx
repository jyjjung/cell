
"use client";

import { useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function MessageInput({ chatId, disabled = false }: { chatId: string; disabled?: boolean }) {
  const { sendMessage, updateTypingStatus } = useMessages(chatId);
  const { currentUser } = useAuth();
  const [text, setText] = useState('');
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled) return;

    sendMessage(trimmedText);
    setText('');
    updateTypingStatus(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative group flex items-center gap-2">
        <div className="flex-1 flex items-center bg-[#3B3B3D]/40 backdrop-blur-3xl px-4 py-1 rounded-full border border-white/5 focus-within:bg-[#3B3B3D]/60 transition-all shadow-inner overflow-hidden">
          <input
              type="text"
              placeholder={disabled ? (t.chatOfflinePlaceholder || t.messagePlaceholder) : (t.messagePlaceholder || "Message")}
              value={text}
              disabled={disabled}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => !disabled && updateTypingStatus(true)}
              onBlur={() => updateTypingStatus(false)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: '16px' }}
              className="flex-1 bg-transparent border-none outline-none text-white py-1.5 placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
          
          <button 
              type="button"
              onClick={handleSend} 
              disabled={disabled || text.trim() === ''}
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
