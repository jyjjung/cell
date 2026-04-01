"use client";

import React from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { motion } from 'framer-motion';

interface ActiveCirclesProps {
  recentChats: any[];
  currentUser: any;
  usersMap: Map<string, any>;
  t: any;
  handleLink: (path: string) => void;
}

export const ActiveCircles = React.memo(({ recentChats, currentUser, usersMap, t, handleLink }: ActiveCirclesProps) => (
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/60">{t.messenger}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.activeCircles}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleLink('/chat')} 
            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
          >
            Hub <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentChats.length === 0 ? (
            <p className="col-span-full text-[10px] font-black uppercase tracking-[0.4em] text-center opacity-30 py-10 border border-dashed border-border/50 rounded-[2rem]">
                Static Signal
            </p>
          ) : (
            recentChats.map((c, i) => {
              const peerId = c.members.find((id: string) => id !== currentUser.uid);
              const peer = peerId ? usersMap.get(peerId) : null;
              const name = c.type === 'group' ? c.name : (peer?.firstName ? `${peer.firstName} ${peer.lastName}` : 'Circle');
              
              return (
                <motion.button 
                    key={c.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleLink(`/chat/${c.id}`)} 
                    className="flex items-center gap-4 p-5 rounded-[2.2rem] bg-muted/20 border border-transparent hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-left overflow-hidden group/circle"
                >
                  <div className="h-12 w-12 shrink-0 rounded-[1.2rem] overflow-hidden bg-muted border border-white/5 shadow-2xl transition-transform group-hover/circle:scale-110">
                    {c.type === 'group' ? (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500/20">
                            <Users className="h-5 w-5 text-blue-500"/>
                        </div>
                    ) : (
                        <PixelAvatar avatar={peer?.avatar} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[11px] truncate leading-none uppercase tracking-widest text-white/90">{name}</p>
                    <p className="text-[10px] font-medium opacity-50 truncate mt-2 group-hover/circle:opacity-80 transition-opacity">
                        {c.lastMessageText || 'Direct Connection'}
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
