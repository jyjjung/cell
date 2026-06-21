"use client";

import { useMemo } from 'react';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMemberDisplayName, resolveChatAvatar } from '@/lib/chat-utils';
import { GroupChatAvatar } from '@/components/chat/GroupChatAvatar';
import { formatUserDisplayName } from '@/lib/formatting';

export default function RecentChatsWidget() {
    const { chats, loading } = useChats();
    const { currentUser } = useAuth();
    const { allUsers } = useAllUsers();
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();

    const recentChats = useMemo(() => {
        return chats.slice(0, 3);
    }, [chats]);

    const handleGoToChat = (id: string) => {
        setIsPageLoading(true);
        router.push(`/chat/${id}`);
    };

    if (!currentUser) return null;

    return (
        <div className="glass-card relative p-6 md:p-8 rounded-[2.5rem] overflow-hidden h-fit">
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0">
                    <h3 className="text-lg font-black tracking-tight">Active Circles</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Messenger</p>
                </div>
                <div className="p-2.5 rounded-xl glass-thin text-blue-500 ring-1 ring-blue-500/20">
                    <MessageCircle className="h-5 w-5" />
                </div>
            </div>

            <div className="space-y-3 mb-6 min-h-[120px]">
                {loading ? (
                    <div className="h-32 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
                    </div>
                ) : recentChats.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center opacity-40 py-4">
                        <MessageCircle className="h-8 w-8 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Circles</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {recentChats.map(chat => {
                            const isGroup = chat.type === 'group';
                            const peerId = chat.members.find(id => id !== currentUser.uid);
                            
                            const peerProfile = peerId ? allUsers.find(u => u.uid === peerId) : null;
                            const infoFromChat = peerId ? chat.memberInfo[peerId] : null;
                            
                            let name = 'Private Chat';
                            if (isGroup) {
                                name = chat.name || 'Unnamed Group';
                            } else if (peerProfile && peerProfile.firstName) {
                                name = formatUserDisplayName(peerProfile);
                            } else if (infoFromChat) {
                                name = getMemberDisplayName(infoFromChat, 'Private Chat');
                            }

                            const avatar = isGroup ? null : resolveChatAvatar(peerProfile, infoFromChat);
                            const photoURL = isGroup ? (chat.photoURL || null) : null;

                            return (
                                <motion.button
                                    layout
                                    key={chat.id}
                                    onClick={() => handleGoToChat(chat.id)}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="w-full flex items-center gap-4 p-3 rounded-2xl glass-thin hover:ring-blue-500/30 transition-all group overflow-hidden"
                                >
                                    <div className="h-10 w-10 shrink-0 rounded-full glass-thin overflow-hidden">
                                        <GroupChatAvatar avatar={avatar} photoURL={photoURL} />
                                    </div>
                                    <div className="flex-grow min-w-0 text-left overflow-hidden">
                                        <p className="font-bold text-sm truncate text-foreground group-hover:text-white">{name}</p>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate font-semibold group-hover:text-white/80 block w-full">{chat.lastMessageText || 'No messages yet'}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            <div className="mt-8">
                <Button
                    variant="outline"
                    className="h-12 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-none group"
                    onClick={() => { setIsPageLoading(true); router.push('/chat'); }}
                >
                    Circle Hub
                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
