"use client";

import React from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { motion } from 'framer-motion';
import { formatUserDisplayName } from '@/lib/formatting';

interface ActiveCirclesProps {
  recentChats: any[];
  currentUser: any;
  usersMap: Map<string, any>;
  t: any;
  handleLink: (path: string) => void;
}

export const ActiveCircles = React.memo(({ recentChats, currentUser, usersMap, t, handleLink }: ActiveCirclesProps) => (
    <section className="stack-gap">
        <div className="panel-header border-b border-border/50 pb-3">
          <div>
            <p className="text-micro-label">{t.messenger}</p>
            <h2 className="panel-title">{t.activeCircles}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleLink('/chat')} 
            className="text-primary"
          >
            {t.circleHub} <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recentChats.length === 0 ? (
            <p className="col-span-full empty-inline border border-dashed border-border/50 rounded-lg">
                {t.noCircles}
            </p>
          ) : (
            recentChats.map((c, i) => {
              const peerId = c.members.find((id: string) => id !== currentUser.uid);
              const peer = peerId ? usersMap.get(peerId) : null;
              const name = c.type === 'group' ? c.name || t.unnamedCircle : formatUserDisplayName(peer, t.privateChat);
              
              return (
                <motion.button 
                    key={c.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleLink(`/chat/${c.id}`)} 
                    className="surface-row hover:ring-primary/20 transition-all text-left overflow-hidden group/circle"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted border border-border/50">
                    {c.type === 'group' ? (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                            <Users className="h-4 w-4 text-primary"/>
                        </div>
                    ) : (
                        <PixelAvatar avatar={peer?.avatar} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    <p className="text-micro-label truncate mt-0.5">
                        {c.lastMessageText || t.noMessagesYet}
                    </p>
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
    </section>
));

ActiveCircles.displayName = 'ActiveCircles';
