"use client";

import { useMemo } from 'react';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { usePageLoading } from '@/contexts/page-loading-context';
import { MessageCircle, ArrowRight, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PixelAvatar } from '../avatar/PixelAvatar';
import { getMemberFullName } from '@/lib/chat-utils';

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
        <div className="relative p-6 md:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl overflow-hidden h-fit">
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0">
                    <h3 className="text-lg font-black tracking-tight">Active Circles</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Messenger</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner">
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
                                name = `${peerProfile.firstName} ${peerProfile.lastName || ''}`.trim();
                            } else if (infoFromChat) {
                                name = getMemberFullName(infoFromChat) || 'Private Chat';
                            }

                            const avatar = isGroup ? null : (peerProfile?.avatar || infoFromChat?.avatar);

                            return (
                                <motion.button
                                    layout
                                    key={chat.id}
                                    onClick={() => handleGoToChat(chat.id)}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-muted/20 border border-transparent hover:bg-blue-500 transition-all group overflow-hidden"
                                >
                                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted border border-border/20 group-hover:border-white/30">
                                        {avatar ? <PixelAvatar avatar={avatar} /> : <div className="h-full w-full bg-muted flex items-center justify-center"><Users className="h-5 w-5 text-muted-foreground group-hover:text-white" /></div>}
                                    </div>
                                    <div className="flex-grow min-w-0 text-left overflow-hidden">
                                        <p className="font-bold text-sm truncate text-foreground group-hover:text-white">{name}</p>
                                        <p className="text-xs text-muted-foreground truncate font-medium group-hover:text-white/80 block w-full">{chat.lastMessageText || 'No messages yet'}</p>
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
                    className="h-12 w-full rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-background/50 border-border/50 hover:bg-blue-500 hover:text-white transition-all shadow-none group"
                    onClick={() => { setIsPageLoading(true); router.push('/chat'); }}
                >
                    Circle Hub
                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
