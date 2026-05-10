
"use client";

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThreadMessages } from '@/hooks/useThreadMessages';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { translations } from '@/lib/translations';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import type { Chat } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ThreadWindowProps {
    chatId: string;
    parentMessageId: string;
    chat: Chat;
    onClose: () => void;
    onDeleteParentMessage: (id: string) => void;
}

export default function ThreadWindow({ chatId, parentMessageId, chat, onClose, onDeleteParentMessage }: ThreadWindowProps) {
    const { messages, parentMessage, loading, loadingMore, hasMore, loadMoreMessages, toggleReaction } = useThreadMessages(chatId, parentMessageId);
    const { currentUser } = useAuth();
    const { allUsers } = useAllUsers();
    const listRef = useRef<HTMLDivElement>(null);
    const t = translations[currentUser?.preferredLanguage || 'en'];

    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        allUsers.forEach(u => {
            map[u.uid] = u;
        });
        return map;
    }, [allUsers]);

    const parentSender = chat.memberInfo[parentMessage?.senderId || ''] || null;

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    if (!parentMessage && !loading) {
        return (
            <div className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 text-center">
                <p className="text-muted-foreground mb-4">This message was deleted or is no longer available.</p>
                <Button onClick={onClose} variant="outline">Close Thread</Button>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <header className="flex-shrink-0 flex items-center justify-between py-4 px-6 border-b border-border/50 bg-background/50 backdrop-blur-xl z-20">
                <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/20 hover:bg-muted/40 transition-all">
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-[11px] font-black text-foreground uppercase tracking-widest">{t.thread || 'Thread'}</h1>
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">{messages.length} {t.replies || 'replies'}</p>
                </div>

                <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/20 hover:bg-muted/40 transition-all">
                    <X className="h-5 w-5" />
                </button>
            </header>

            <div className="flex-1 min-h-0 relative">
                <div ref={listRef} className="absolute inset-0 overflow-y-auto px-4 py-6 custom-scrollbar flex flex-col gap-4">
                    {parentMessage && (
                        <div className="pb-6 border-b border-border/10">
                            <MessageBubble
                                message={parentMessage}
                                chat={chat}
                                sender={parentSender}
                                userMap={userMap}
                                toggleReaction={toggleReaction}
                                onDelete={onDeleteParentMessage}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                        {messages.map((msg, i) => {
                            const sender = chat.memberInfo[msg.senderId] || null;
                            const olderMsg = messages[i - 1];
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    chat={chat}
                                    sender={sender}
                                    userMap={userMap}
                                    toggleReaction={toggleReaction}
                                    showAvatar={olderMsg?.senderId !== msg.senderId}
                                    showName={olderMsg?.senderId !== msg.senderId}
                                />
                            );
                        })}
                    </div>

                    {hasMore && (
                        <div className="text-center py-6">
                            <Button onClick={loadMoreMessages} variant="ghost" size="sm" disabled={loadingMore} className="rounded-full px-8 font-black text-[10px] tracking-tight opacity-40 hover:opacity-100 uppercase">
                                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Load more
                            </Button>
                        </div>
                    )}

                    {loading && messages.length === 0 && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-gradient-to-t from-background via-background/80 to-transparent shrink-0">
                <MessageInput 
                    chatId={chatId}
                    parentMessageId={parentMessageId}
                />
            </div>
        </div>
    );
}
