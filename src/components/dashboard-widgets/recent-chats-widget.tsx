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
import { translations } from '@/lib/translations';

export default function RecentChatsWidget() {
    const { chats, loading } = useChats();
    const { currentUser } = useAuth();
    const t = translations[currentUser?.preferredLanguage || 'en'];
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
        <div className="widget-surface relative h-fit overflow-hidden">
            <div className="panel-header">
                <div className="min-w-0">
                    <h3 className="panel-title">{t.activeCircles}</h3>
                    <p className="panel-subtitle">{t.recentMessenger}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                </div>
            </div>

            <div className="stack-gap-sm mb-3">
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-40" />
                    </div>
                ) : recentChats.length === 0 ? (
                    <div className="empty-inline">
                        <MessageCircle className="h-6 w-6 mb-2 text-muted-foreground" />
                        <p>{t.noCircles}</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {recentChats.map(chat => {
                            const isGroup = chat.type === 'group';
                            const peerId = chat.members.find(id => id !== currentUser.uid);
                            
                            const peerProfile = peerId ? allUsers.find(u => u.uid === peerId) : null;
                            const infoFromChat = peerId ? chat.memberInfo[peerId] : null;
                            
                            let name = t.privateChat;
                            if (isGroup) {
                                name = chat.name || t.unnamedCircle;
                            } else if (peerProfile && peerProfile.firstName) {
                                name = formatUserDisplayName(peerProfile);
                            } else if (infoFromChat) {
                                name = getMemberDisplayName(infoFromChat, t.privateChat);
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
                                    className="surface-row w-full hover:ring-primary/20 transition-all group text-left"
                                >
                                    <div className="h-9 w-9 shrink-0 rounded-full glass-thin overflow-hidden">
                                        <GroupChatAvatar avatar={avatar} photoURL={photoURL} />
                                    </div>
                                    <div className="flex-grow min-w-0 text-left overflow-hidden">
                                        <p className="font-semibold text-sm truncate text-foreground">{name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessageText || t.noMessagesYet}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setIsPageLoading(true); router.push('/chat'); }}
            >
                {t.circleHub}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
