
"use client";

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useWorshipRosters } from '@/hooks/useWorshipRosters';
import { useWorshipSetlists } from '@/hooks/useWorshipSetlists';
import { useWorshipSongs } from '@/hooks/useWorshipSongs';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { isValid, parse } from 'date-fns';
import { motion } from 'framer-motion';
import {
    ArrowLeft, ArrowUp, Bell, Calendar, ClipboardList, Edit, ListMusic, Loader2, MessageSquarePlus, Music, Sparkles, User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type WizardState = 
  | 'IDLE'
  | 'EVENT_TITLE' | 'EVENT_CATEGORY' | 'EVENT_START_DATE' | 'EVENT_END_DATE' | 'EVENT_START_TIME' | 'EVENT_END_TIME' | 'EVENT_LOCATION' | 'EVENT_CONFIRM'
  | 'ANN_TITLE' | 'ANN_MSG' | 'ANN_CONFIRM'
  | 'SONG_TITLE' | 'SONG_ARTIST' | 'SONG_CONFIRM'
  | 'SETLIST_NAME' | 'SETLIST_DATE' | 'SETLIST_CONFIRM'
  | 'ROSTER_NAME' | 'ROSTER_DATE' | 'ROSTER_CONFIRM';

type Message = {
  id: string;
  sender: 'user' | 'system';
  content: string;
  timestamp: Date;
  isInteractive?: boolean;
};

export default function SystemChat() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { addEvent } = useEvents();
  const { createNotification } = useNotifications();
  const { addSong } = useWorshipSongs();
  const { createSetlist } = useWorshipSetlists();
  const { createRoster } = useWorshipRosters();
  const { toast } = useToast();
  const router = useRouter();

  const [wizardState, setWizardState] = useState<WizardState>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form Data State
  const [formData, setFormData] = useState<any>({});

  // Focus input helper
  const focusInput = useCallback(() => {
    setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
  }, []);

  // Hide scrollbar style
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const addMessage = useCallback((sender: 'user' | 'system', content: string, isInteractive = false) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      content,
      timestamp: new Date(),
      isInteractive
    }]);
  }, []);

  const systemSay = useCallback((text: string, delay = 600) => {
    setIsTyping(true);
    setTimeout(() => {
      addMessage('system', text);
      setIsTyping(false);
      focusInput();
    }, delay);
  }, [addMessage, focusInput]);

  // Initial welcome
  useEffect(() => {
    if (messages.length === 0 && currentUser) {
        const timeout = setTimeout(() => {
            systemSay(`Hi ${currentUser.firstName || 'there'}! I'm the creation wizard. You can manage **Events**, **Songs**, **Setlists**, or **Rosters** here. To share these items in any chat, just type **'/'** at any time!`);
        }, 1000);
        return () => clearTimeout(timeout);
    }
  }, [currentUser, messages.length, systemSay]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const startEventFlow = () => {
    setWizardState('EVENT_TITLE');
    setFormData({});
    systemSay("Great! Let's create an **Event**. First, what is the **title**? (e.g. Youth Retreat)");
  };

  const startAnnouncementFlow = () => {
    setWizardState('ANN_TITLE');
    setFormData({});
    systemSay("Copy that. Let's draft an **Announcement**. What's the **headline**?");
  };
  
  const startSongFlow = () => {
    setWizardState('SONG_TITLE');
    setFormData({});
    systemSay("Nice! Let's catalog a **New Song**. What is the **title**?");
  };

  const startSetlistFlow = () => {
    setWizardState('SETLIST_NAME');
    setFormData({});
    systemSay("Understood. Let's build a **Setlist**. What should we **name** it? (e.g. Sunday Service)");
  };

  const startRosterFlow = () => {
    setWizardState('ROSTER_NAME');
    setFormData({});
    systemSay("Copy. Let's create a **Worship Roster**. What is the **name** for this roster?");
  };

  const handleUserInput = (val: string) => {
    const text = val.trim();
    if (isTyping) return;
    
    // For confirm states, we need text. For optional parameters, we allow empty.
    const isOptional = wizardState.endsWith('_TIME') || 
                       wizardState.endsWith('_LOCATION') || 
                       wizardState.endsWith('_DESC') ||
                       wizardState === 'EVENT_END_DATE';
    
    if (!text && !isOptional && wizardState !== 'IDLE') {
        return;
    }

    addMessage('user', text || '(skipped)');
    setInputValue('');

    // Handle flow transitions
    if (wizardState === 'IDLE') {
        const lower = text.toLowerCase();
        if (lower.includes('event')) startEventFlow();
        else if (lower.includes('announcement')) startAnnouncementFlow();
        else if (lower.includes('song')) startSongFlow();
        else if (lower.includes('setlist')) startSetlistFlow();
        else if (lower.includes('roster')) startRosterFlow();
        else systemSay("I didn't quite get that. Would you like to create an **Event**, a **Song**, a **Setlist**, or a **Roster**?");
        return;
    }

    // EVENT FLOW
    if (wizardState === 'EVENT_TITLE') {
        setFormData({ ...formData, title: text });
        setWizardState('EVENT_CATEGORY');
        systemSay(`Got it: "${text}". What is the **Category**? (e.g. Service, Outreach, Fellowship)`);
    } else if (wizardState === 'EVENT_CATEGORY') {
        setFormData({ ...formData, category: text });
        setWizardState('EVENT_START_DATE');
        systemSay("When does it start? Format: YYYY-MM-DD (e.g. 2024-07-25).");
    } else if (wizardState === 'EVENT_START_DATE') {
        const parsedDate = parse(text, 'yyyy-MM-dd', new Date());
        if (!isValid(parsedDate)) {
            systemSay("Invalid format. Please try again with YYYY-MM-DD.");
            return;
        }
        setFormData({ ...formData, date: text });
        setWizardState('EVENT_END_DATE');
        systemSay("Does it have an **End Date**? (e.g. 2024-07-27). Press **Enter** to skip.");
    } else if (wizardState === 'EVENT_END_DATE') {
        if (text) {
            const parsedEnd = parse(text, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedEnd)) {
                systemSay("Invalid format. Please use YYYY-MM-DD or press Enter to skip.");
                return;
            }
            setFormData({ ...formData, endDate: text });
        }
        setWizardState('EVENT_START_TIME');
        systemSay("Is there a **Start Time**? (e.g. 6:30 PM). Enter to skip.");
    } else if (wizardState === 'EVENT_START_TIME') {
        setFormData({ ...formData, startTime: text || '' });
        setWizardState('EVENT_END_TIME');
        systemSay("And the **End Time**? (e.g. 9:00 PM). Enter to skip.");
    } else if (wizardState === 'EVENT_END_TIME') {
        setFormData({ ...formData, endTime: text || '' });
        setWizardState('EVENT_LOCATION');
        systemSay("Where is the **Location**? Enter to skip.");
    } else if (wizardState === 'EVENT_LOCATION') {
        const finalData = { ...formData, location: text || '', allDay: !formData.startTime };
        setFormData(finalData);
        setWizardState('EVENT_CONFIRM');
        const dateStr = formData.endDate ? `${formData.date} to ${formData.endDate}` : formData.date;
        const timeStr = formData.startTime ? ` at ${formData.startTime}` : '';
        systemSay(`I'm ready to create the event: **${formData.title}** (${dateStr}${timeStr}). Proceed? (Yes/Cancel)`);
    } else if (wizardState === 'EVENT_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            addEvent(formData).then(() => {
                systemSay(`SUCCESS! The event **${formData.title}** is live.`);
                setWizardState('IDLE');
                toast({ title: t.adminEventCreated });
            });
        } else {
            systemSay("Aborted. What else?");
            setWizardState('IDLE');
        }
    }

    // ANNOUNCEMENT FLOW
    else if (wizardState === 'ANN_TITLE') {
        setFormData({ ...formData, title: text });
        setWizardState('ANN_MSG');
        systemSay("What is the **message**?");
    } else if (wizardState === 'ANN_MSG') {
        const finalData = { ...formData, message: text, type: 'announcement', isGlobal: true };
        setFormData(finalData);
        setWizardState('ANN_CONFIRM');
        systemSay("Broadcast this? (Yes/No)");
    } else if (wizardState === 'ANN_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            createNotification(formData).then(() => {
                systemSay("Announcement sent.");
                setWizardState('IDLE');
                toast({ title: t.adminAnnouncementLive });
            });
        } else {
            systemSay("Discarded. Anything else?");
            setWizardState('IDLE');
        }
    }

    // SONG FLOW
    else if (wizardState === 'SONG_TITLE') {
        setFormData({ ...formData, title: text });
        setWizardState('SONG_ARTIST');
        systemSay("Who is the **artist**? Enter to skip.");
    } else if (wizardState === 'SONG_ARTIST') {
        setFormData({ ...formData, artist: text || 'Unknown Artist' });
        setWizardState('SONG_CONFIRM');
        systemSay(`Save **${formData.title}** by **${text || 'Unknown Artist'}** to the library? (Yes/No)`);
    } else if (wizardState === 'SONG_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            addSong(formData.title, formData.artist).then(() => {
                systemSay(`Song **${formData.title}** has been added.`);
                setWizardState('IDLE');
                toast({ title: t.adminSongAdded });
            });
        } else {
            systemSay("Cancelled.");
            setWizardState('IDLE');
        }
    }

    // SETLIST FLOW
    else if (wizardState === 'SETLIST_NAME') {
        setFormData({ ...formData, name: text });
        setWizardState('SETLIST_DATE');
        systemSay("What is the **Date**? YYYY-MM-DD (e.g. 2024-07-28)");
    } else if (wizardState === 'SETLIST_DATE') {
        setFormData({ ...formData, date: text });
        setWizardState('SETLIST_CONFIRM');
        systemSay(`Create setlist **${formData.name}** for **${text}**? (Yes/No)`);
    } else if (wizardState === 'SETLIST_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            createSetlist(formData.name, formData.date).then(() => {
                systemSay("Setlist created.");
                setWizardState('IDLE');
                toast({ title: t.adminSetlistCreated });
            });
        } else {
            systemSay("Discarded.");
            setWizardState('IDLE');
        }
    }

    // ROSTER FLOW
    else if (wizardState === 'ROSTER_NAME') {
        setFormData({ ...formData, name: text });
        setWizardState('ROSTER_DATE');
        systemSay("What's the **Date**? YYYY-MM-DD (e.g. 2024-07-28)");
    } else if (wizardState === 'ROSTER_DATE') {
        setFormData({ ...formData, date: text });
        setWizardState('ROSTER_CONFIRM');
        systemSay(`Generate roster **${formData.name}** for **${text}**? (Yes/No)`);
    } else if (wizardState === 'ROSTER_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            createRoster(formData.name, formData.date).then(() => {
                systemSay("Worship roster is ready.");
                setWizardState('IDLE');
                toast({ title: t.adminRosterCreated });
            });
        } else {
            systemSay("Cancelled.");
            setWizardState('IDLE');
        }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="flex-shrink-0 flex items-center justify-between py-4 px-6 z-20">
        <button 
          onClick={() => router.back()}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="flex flex-col items-center gap-1 opacity-40">
           <MessageSquarePlus className="h-4 w-4 text-white" />
           <h2 className="text-micro-label">{t.adminCreationAssistant}</h2>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Scrollable Message Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 hide-scrollbar relative"
      >
        <div className="max-w-3xl mx-auto w-full flex flex-col pb-32">
            {messages.map((msg) => (
            <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                    "flex gap-4 w-full mb-8",
                    msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                )}
            >
                <div className={cn(
                    "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-500 mt-1",
                    msg.sender === 'user' 
                        ? "bg-muted border-white/10 text-foreground/40" 
                        : "bg-primary/10 border-primary/20 text-primary"
                )}>
                    {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                <div className={cn(
                    "flex flex-col gap-2 max-w-[85%]",
                    msg.sender === 'user' ? "items-end text-right" : "items-start text-left"
                )}>
                    <div className={cn(
                        "px-6 py-4 rounded-[1.8rem] group relative transition-all duration-300",
                        msg.sender === 'user' 
                            ? "bg-primary text-primary-foreground font-semibold rounded-tr-xl shadow-lg shadow-black/10" 
                            : "bg-card/40 border border-border text-foreground font-inter rounded-tl-xl"
                    )}>
                        <p className="text-[15px] leading-relaxed relative z-10 !text-white" style={{ color: 'white' }}>
                            {msg.content}
                        </p>
                        
                        {msg.sender === 'user' && (
                            <button 
                                onClick={() => { setInputValue(msg.content); focusInput(); }}
                                className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                                title="Copy to input for editing"
                            >
                                <Edit className="h-4 w-4 text-muted-foreground/40" />
                            </button>
                        )}
                    </div>
                    <span className="text-micro-label px-2">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </motion.div>
            ))}

            {/* Quick Actions for Idle State */}
            {wizardState === 'IDLE' && !isTyping && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 justify-start max-w-3xl mx-auto w-full px-12"
                >
                    <Button 
                        onClick={startEventFlow}
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-micro-label !opacity-100"
                    >
                        <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                        {t.events}
                    </Button>
                    <Button 
                        onClick={startAnnouncementFlow}
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-micro-label !opacity-100"
                    >
                        <Bell className="mr-2 h-3.5 w-3.5 text-primary" />
                        {t.adminBroadcast}
                    </Button>
                    <div className="w-full h-px bg-white/5 my-1" />
                    <Button 
                        onClick={startSongFlow}
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-white/5 border-border hover:bg-white/10 text-micro-label !opacity-100"
                    >
                        <Music className="mr-2 h-3.5 w-3.5 text-primary" />
                        {t.adminNewSong}
                    </Button>
                    <Button 
                        onClick={startSetlistFlow}
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-white/5 border-border hover:bg-white/10 text-micro-label !opacity-100"
                    >
                        <ListMusic className="mr-2 h-3.5 w-3.5 text-primary" />
                        {t.adminSetlist}
                    </Button>
                    <Button 
                        onClick={startRosterFlow}
                        variant="outline"
                        className="h-9 px-4 rounded-xl bg-white/5 border-border hover:bg-white/10 text-micro-label !opacity-100"
                    >
                        <ClipboardList className="mr-2 h-3.5 w-3.5 text-primary" />
                        {t.adminTeamRoster}
                    </Button>
                </motion.div>
            )}

            {isTyping && (
                <div className="flex gap-4 items-start px-2">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <div className="px-5 py-3 rounded-full bg-white/5 flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Fixed Input Bar Matching Main App */}
      <div className="px-4 py-6 bg-gradient-to-t from-background via-background/90 to-transparent shrink-0 z-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <div className="flex justify-end px-6">
                <button 
                    onClick={() => { setWizardState('IDLE'); setMessages([]); focusInput(); }} 
                    className="text-micro-label hover:text-destructive/70 transition-colors"
                >
                    {t.adminResetChat}
                </button>
            </div>
            
            <div className="flex items-center gap-2 bg-card/40 backdrop-blur-3xl px-6 py-1.5 rounded-full border border-border focus-within:bg-card/60 transition-all relative group">
                <input 
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserInput(inputValue)}
                    placeholder={
                        wizardState === 'IDLE' ? "Start typing to create..." : 
                        "Type your answer here..."
                    }
                    disabled={isTyping}
                    className="flex-1 bg-transparent border-none outline-none text-white py-2 px-0 text-[16px] placeholder:text-muted-foreground/40 disabled:opacity-50"
                />

                <button 
                    onClick={() => handleUserInput(inputValue)}
                    disabled={isTyping}
                    className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0",
                        inputValue.trim() || wizardState !== 'IDLE' ? "bg-primary text-primary-foreground shadow-lg shadow-black/20" : "bg-white/10 text-muted-foreground opacity-20"
                    )}
                >
                    <ArrowUp className="h-4 w-4" strokeWidth={3} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
