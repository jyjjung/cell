"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Mail, 
  Music, 
  ClipboardList,
  Search,
  ChevronRight,
  BookOpen,
  Upload,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvents } from '@/hooks/use-events';
import { useInvitations } from '@/hooks/use-invitations';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { format } from 'date-fns';

interface SlashCommandSelectorProps {
  inputValue: string;
  onSelect: (type: 'invitation' | 'event' | 'setlist' | 'roster' | 'qt' | 'cleaning' | 'song' | 'chords' | 'new-song' | 'new-setlist' | 'new-roster' | 'image', id: string, metadata?: any) => void;
  onClose: () => void;
  onCategoryClick?: (category: string) => void;
  showWorshipCreation?: boolean;
}

const COMMANDS = [
  { id: 'image', label: 'Attach Image', icon: ImageIcon, description: 'Share a photo with the group' },
  { id: 'invite', label: '/invite', icon: Mail, description: 'Share an invitation' },
  { id: 'event', label: '/event', icon: Calendar, description: 'Share an event' },
  { id: 'setlist', label: '/setlist', icon: Music, description: 'Share a worship setlist' },
  { id: 'roster', label: '/roster', icon: ClipboardList, description: 'Share a worship roster' },
  { id: 'qt', label: '/qt', icon: BookOpen, description: 'Share a QT roster entry' },
  { id: 'cleaning', label: '/cleaning', icon: ClipboardList, description: 'Share a cleaning roster session' },
  { id: 'song', label: '/song', icon: Music, description: 'Share a song' },
  { id: 'chords', label: '/chords', icon: Upload, description: 'Upload a chord sheet' },
  { id: 'new-song', label: '/new-song', icon: Music, description: 'Create a new song', isWorshipCreation: true },
  { id: 'new-setlist', label: '/new-setlist', icon: Music, description: 'Create a new setlist', isWorshipCreation: true },
  { id: 'new-roster', label: '/new-roster', icon: ClipboardList, description: 'Create a new roster', isWorshipCreation: true },
];

export default function SlashCommandSelector({ 
  inputValue, 
  onSelect, 
  onClose,
  onCategoryClick,
  showWorshipCreation = false 
}: SlashCommandSelectorProps) {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  
  const { events } = useEvents();
  const { invitations } = useInvitations();
  const { setlists } = useWorshipSetlists();
  const { rosters } = useWorshipRosters();
  const { roster: qtRoster } = useQTRoster();
  const { roster: cleaningRoster } = useCleaningRoster();
  const { cleaningDays } = useCleaningDays();
  const { songs } = useWorshipSongs();

  const selectedSong = useMemo(() => 
    selectedSongId ? songs.find(s => s.id === selectedSongId) : null,
    [songs, selectedSongId]
  );

  useEffect(() => {
    const trimmed = inputValue.trim();
    
    // Pattern matching for slash commands
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
    } else if (trimmed.startsWith('/qt')) {
      setActiveCommand('qt');
      setSearchTerm(trimmed.replace('/qt', '').trim());
    } else if (trimmed.startsWith('/cleaning')) {
      setActiveCommand('cleaning');
      setSearchTerm(trimmed.replace('/cleaning', '').trim());
    } else if (trimmed.startsWith('/song')) {
      setActiveCommand('song');
      setSearchTerm(trimmed.replace('/song', '').trim());
    } else if (trimmed.startsWith('/chords')) {
      setActiveCommand('chords');
      setSearchTerm(trimmed.replace('/chords', '').trim());
    } else if (trimmed.startsWith('/')) {
      // Partial command pattern (e.g., '/s')
      setActiveCommand(null);
      setSearchTerm(trimmed.substring(1).trim());
    } else if (trimmed.length > 0 && !trimmed.startsWith('/')) {
      if (activeCommand) {
        setSearchTerm(trimmed);
      } else {
        onClose();
      }
    } else if (trimmed === '') {
      // If input is totally empty, we might have been triggered by the '+' button
      // In this case, keep the activeCommand if it exists
      setSearchTerm('');
    }
    setSelectedIndex(0);
  }, [inputValue, onClose]); 

  // Reset selected index when search term changes or active command changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, activeCommand]);

  const filteredItems = useMemo(() => {
    const search = searchTerm.toLowerCase();

    if (!activeCommand) {
        return COMMANDS
            .filter(cmd => !cmd.isWorshipCreation || showWorshipCreation)
            .filter(cmd => 
                cmd.label.toLowerCase().includes(search) || 
                cmd.description.toLowerCase().includes(search) ||
                cmd.id.toLowerCase().includes(search)
            );
    }
    
    if (activeCommand === 'invite') {
      return invitations
        .filter(i => i.title.toLowerCase().includes(search))
        .map(i => ({ id: i.id, title: i.title, subtitle: i.description, date: i.dateOptions[0], type: 'invitation' }));
    }
    if (activeCommand === 'event') {
      return events
        .filter(e => e.title.toLowerCase().includes(search))
        .map(e => ({ id: e.id, title: e.title, subtitle: e.category, date: e.date, type: 'event' }));
    }
    if (activeCommand === 'setlist') {
      return setlists
        .filter(s => s.name.toLowerCase().includes(search))
        .map(s => ({ id: s.id, title: s.name, subtitle: `${s.songs?.length || 0} songs`, date: s.date, type: 'setlist' }));
    }
    if (activeCommand === 'roster') {
      return rosters
        .filter(r => r.name.toLowerCase().includes(search))
        .map(r => ({ id: r.id, title: r.name, subtitle: `${r.slots?.length || 0} roles`, date: r.date, type: 'roster' }));
    }
    if (activeCommand === 'qt') {
      return qtRoster
        .filter(r => r.passage.toLowerCase().includes(search) || r.personName.toLowerCase().includes(search))
        .map(r => ({ id: r.date, title: r.passage, subtitle: r.personName, date: r.date, type: 'qt' }));
    }
    if (activeCommand === 'cleaning') {
      return cleaningRoster
        .filter(r => r.date.toLowerCase().includes(search))
        .map(r => {
          const day = cleaningDays.find(d => d.id === r.dayId);
          return { id: r.date, title: day?.name || 'Cleaning Session', subtitle: `${r.assignedUserIds.length} members`, date: r.date, type: 'cleaning' };
        });
    }
    if (activeCommand === 'song' || activeCommand === 'chords') {
      return songs
        .filter(s => s.title.toLowerCase().includes(search) || (s.artist?.toLowerCase().includes(search)))
        .map(s => ({ 
          id: s.id, 
          title: s.title, 
          subtitle: s.artist || 'Unknown Artist', 
          date: null, 
          type: activeCommand 
        }));
    }
    return [];
  }, [activeCommand, searchTerm, invitations, events, setlists, rosters, qtRoster, cleaningRoster, cleaningDays, songs, showWorshipCreation]);

  const handleKeyboardSelect = (index: number) => {
    const items = filteredItems;
    if (!items[index]) return;

    if (!activeCommand) {
        const cmd = items[index] as any;
        if (cmd.id === 'image') {
            onSelect('image', '');
        } else if (cmd.isWorshipCreation) {
            onSelect(cmd.id as any, '');
        } else {
            setActiveCommand(cmd.id);
            if (onCategoryClick) onCategoryClick(cmd.id);
        }
    } else {
        const item = items[index] as any;
        if (item.type === 'song') {
            setSelectedSongId(item.id);
        } else {
            onSelect(item.type, item.id, { label: item.title });
        }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const items = filteredItems;
        if (items.length === 0 && !selectedSong) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        } else if (e.key === 'Enter') {
            if (selectedSong) return; // Song key selector doesn't use the filteredItems list
            e.preventDefault();
            handleKeyboardSelect(selectedIndex);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, activeCommand, selectedSong]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full left-0 right-0 mb-4 w-full bg-popover/90 backdrop-blur-2xl border border-border/20 rounded-[2rem] shadow-2xl overflow-hidden z-[100] flex flex-col"
    >
      <div className="p-4 border-b border-border/10 bg-foreground/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center">
                {activeCommand ? (
                    (() => {
                        const Icon = COMMANDS.find(c => c.id === activeCommand)?.icon || Search;
                        return <Icon className="w-3.5 h-3.5 text-primary" />;
                    })()
                ) : (
                    <Search className="w-3.5 h-3.5 text-primary" />
                )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                {selectedSong ? "Pick Key" : (activeCommand ? `Shared ${activeCommand}` : "Quick Actions")}
            </span>
        </div>
        {(activeCommand || selectedSong) && (
            <button 
                onClick={() => {
                    if (selectedSong) setSelectedSongId(null);
                    else setActiveCommand(null);
                }}
                className="text-[9px] font-bold text-primary hover:underline transition-all"
            >
                Back
            </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto py-2 custom-scrollbar">
        {selectedSong ? (
          <div className="p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Available Keys</p>
            <div className="grid grid-cols-4 gap-2">
                {selectedSong.chordSheets.length > 0 ? (
                    Array.from(
                      selectedSong.chordSheets.reduce((map, sheet) => {
                        if (!map.has(sheet.key)) map.set(sheet.key, []);
                        map.get(sheet.key)!.push(sheet.imageUrl);
                        return map;
                      }, new Map<string, string[]>()).entries()
                    ).map(([key, urls]) => (
                        <button
                            key={key}
                            onClick={() => {
                                onSelect('song', selectedSong.id, { 
                                    imageUrl: urls[0],
                                    imageUrls: urls,
                                    sheetKey: key,
                                    songTitle: selectedSong.title,
                                    artist: selectedSong.artist,
                                    label: `${selectedSong.title} (${key})`
                                });
                                onClose();
                            }}
                            className="h-12 rounded-xl bg-foreground/5 border border-border/10 flex items-center justify-center text-[13px] font-black hover:bg-primary hover:text-white transition-all active:scale-95"
                        >
                            {key}
                        </button>
                    ))
                ) : (
                    <div className="col-span-4 p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">No Sheets Uploaded</p>
                    </div>
                )}
            </div>
          </div>
        ) : !activeCommand ? (
          <div className="flex flex-col px-2">
            {COMMANDS
              .filter(cmd => !cmd.isWorshipCreation || showWorshipCreation)
              .map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                   if (cmd.id === 'image') {
                    onSelect('image', '');
                  } else if (cmd.isWorshipCreation) {
                    onSelect(cmd.id as any, '');
                  } else {
                    setActiveCommand(cmd.id);
                    if (onCategoryClick) onCategoryClick(cmd.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-2xl hover:bg-foreground/5 transition-all text-left group",
                  cmd.isWorshipCreation ? "border-l-2 border-primary/40 bg-primary/5" : "",
                  cmd.id === 'image' ? "bg-primary/5 border border-primary/10 mb-2" : "",
                  !activeCommand && selectedIndex === COMMANDS.indexOf(cmd) && "bg-foreground/10"
                )}
              >
                <div className={cn(
                    "h-10 w-10 rounded-xl bg-foreground/5 border border-border/10 flex items-center justify-center group-hover:scale-110 transition-transform",
                    cmd.id === 'image' ? "bg-primary/10" : ""
                )}>
                  <cmd.icon className={cn("w-5 h-5 text-foreground/70", cmd.id === 'image' ? "text-primary" : "")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-bold text-foreground group-hover:text-primary transition-colors", cmd.id === 'image' ? "text-primary/90" : "")}>{cmd.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{cmd.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col px-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'song') {
                        // For song type, we enter the key selector
                        setSelectedSongId(item.id);
                    } else {
                        onSelect(item.type, item.id, { label: item.title });
                    }
                  }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-2xl hover:bg-foreground/5 transition-all text-left group",
                    activeCommand && selectedIndex === filteredItems.indexOf(item) && "bg-foreground/10"
                  )}
                >
                  <div className="h-10 w-10 rounded-xl bg-foreground/5 border border-border/10 flex flex-col items-center justify-center shrink-0 overflow-hidden">
                    {(() => {
                      try {
                        if (!item.date) throw new Error();
                        const date = new Date(item.date);
                        if (isNaN(date.getTime())) {
                            return <Calendar className="w-5 h-5 text-primary/40" />;
                        }
                        return (
                          <>
                            <span className="text-[10px] font-black text-primary uppercase leading-none">
                              {format(date, 'MMM')}
                            </span>
                            <span className="text-[14px] font-black text-foreground leading-none mt-0.5">
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
                    <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
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
