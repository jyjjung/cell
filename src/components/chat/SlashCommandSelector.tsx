"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Mail, 
  Music, 
  ClipboardList,
  Search,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { useInvitations } from '@/hooks/use-invitations';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { format } from 'date-fns';

interface SlashCommandSelectorProps {
  inputValue: string;
  onSelect: (type: 'invitation' | 'event' | 'setlist' | 'roster', id: string) => void;
  onClose: () => void;
}

const COMMANDS = [
  { id: 'invite', label: '/invite', icon: Mail, description: 'Share an invitation' },
  { id: 'event', label: '/event', icon: Calendar, description: 'Share an event' },
  { id: 'setlist', label: '/setlist', icon: Music, description: 'Share a worship setlist' },
  { id: 'roster', label: '/roster', icon: ClipboardList, description: 'Share a worship roster' },
];

export default function SlashCommandSelector({ inputValue, onSelect, onClose }: SlashCommandSelectorProps) {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { events } = useEvents();
  const { invitations } = useInvitations();
  const { setlists } = useWorshipSetlists();
  const { rosters } = useWorshipRosters();

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.startsWith('/invite')) {
      setActiveCommand('invite');
      setSearchTerm(trimmed.replace('/invite', '').trim());
    } else if (trimmed.startsWith('/event')) {
      setActiveCommand('event');
      setSearchTerm(trimmed.replace('/event', '').trim());
    } else if (trimmed.startsWith('/setlist')) {
      setActiveCommand('setlist');
      setSearchTerm(trimmed.replace('/setlist', '').trim());
    } else if (trimmed.startsWith('/roster')) {
      setActiveCommand('roster');
      setSearchTerm(trimmed.replace('/roster', '').trim());
    } else if (trimmed === '/') {
      setActiveCommand(null);
      setSearchTerm('');
    } else if (!trimmed.startsWith('/')) {
      onClose();
    }
  }, [inputValue, onClose]);

  const filteredItems = React.useMemo(() => {
    if (!activeCommand) return [];
    
    const search = searchTerm.toLowerCase();
    
    if (activeCommand === 'invite') {
      return invitations
        .filter(i => i.title.toLowerCase().includes(search))
        .slice(0, 5)
        .map(i => ({ id: i.id, title: i.title, subtitle: i.description, date: i.dateOptions[0], type: 'invitation' }));
    }
    if (activeCommand === 'event') {
      return events
        .filter(e => e.title.toLowerCase().includes(search))
        .slice(0, 5)
        .map(e => ({ id: e.id, title: e.title, subtitle: e.category, date: e.date, type: 'event' }));
    }
    if (activeCommand === 'setlist') {
      return setlists
        .filter(s => s.name.toLowerCase().includes(search))
        .slice(0, 5)
        .map(s => ({ id: s.id, title: s.name, subtitle: `${s.songs?.length || 0} songs`, date: s.date, type: 'setlist' }));
    }
    if (activeCommand === 'roster') {
      return rosters
        .filter(r => r.name.toLowerCase().includes(search))
        .slice(0, 5)
        .map(r => ({ id: r.id, title: r.name, subtitle: `${r.slots?.length || 0} roles`, date: r.date, type: 'roster' }));
    }
    return [];
  }, [activeCommand, searchTerm, invitations, events, setlists, rosters]);

  if (!inputValue.startsWith('/')) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-0 right-0 mb-4 w-full bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-[100] flex flex-col"
    >
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center">
                {activeCommand ? (
                    (() => {
                        const Icon = COMMANDS.find(c => c.id === activeCommand)?.icon;
                        return Icon ? <Icon className="w-3.5 h-3.5 text-primary" /> : null;
                    })()
                ) : (
                    <Search className="w-3.5 h-3.5 text-primary" />
                )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                {activeCommand ? `Shared ${activeCommand}` : "Quick Actions"}
            </span>
        </div>
        {activeCommand && (
            <button 
                onClick={() => setActiveCommand(null)}
                className="text-[9px] font-bold text-primary hover:underline transition-all"
            >
                Back
            </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto py-2 custom-scrollbar">
        {!activeCommand ? (
          <div className="flex flex-col px-2">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => setActiveCommand(cmd.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <cmd.icon className="w-5 h-5 text-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{cmd.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{cmd.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col px-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.type as any, item.id)}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center shrink-0 overflow-hidden">
                    {(() => {
                      try {
                        if (!item.date) throw new Error();
                        const date = new Date(item.date);
                        if (isNaN(date.getTime())) {
                            // If it's a raw string like "Saturday, Aug 12th", just show the first letter of first word or something
                            return <Calendar className="w-5 h-5 text-primary/40" />;
                        }
                        return (
                          <>
                            <span className="text-[10px] font-black text-primary uppercase leading-none">
                              {format(date, 'MMM')}
                            </span>
                            <span className="text-[14px] font-black text-white leading-none mt-0.5">
                              {format(date, 'd')}
                            </span>
                          </>
                        );
                      } catch {
                        return <Calendar className="w-5 h-5 text-primary/40" />;
                      }
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate opacity-70">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">No matching results</p>
                <p className="text-[10px] text-muted-foreground/20 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
