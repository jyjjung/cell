"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Calendar, 
  Mail, 
  Bell, 
  ArrowUp,
  User,
  Loader2,
  Edit,
  MessageSquarePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import { useInvitations } from '@/hooks/use-invitations';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { parse, isValid, format } from 'date-fns';

type WizardState = 
  | 'IDLE'
  | 'EVENT_TITLE' | 'EVENT_CATEGORY' | 'EVENT_START_DATE' | 'EVENT_END_DATE' | 'EVENT_START_TIME' | 'EVENT_END_TIME' | 'EVENT_LOCATION' | 'EVENT_CONFIRM'
  | 'INVITE_TITLE' | 'INVITE_DESC' | 'INVITE_DATE' | 'INVITE_START_TIME' | 'INVITE_END_TIME' | 'INVITE_LOCATION' | 'INVITE_CONFIRM'
  | 'ANN_TITLE' | 'ANN_MSG' | 'ANN_CONFIRM';

type Message = {
  id: string;
  sender: 'user' | 'system';
  content: string;
  timestamp: Date;
  isInteractive?: boolean;
};

export default function SystemChat() {
  const { currentUser } = useAuth();
  const { addEvent } = useEvents();
  const { addInvitation } = useInvitations();
  const { createNotification } = useNotifications();
  const { toast } = useToast();

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
            systemSay(`Hi ${currentUser.firstName || 'there'}! I'm the creation wizard. What would you like to create today? Click an option below or type your choice.`);
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

  const startInviteFlow = () => {
    setWizardState('INVITE_TITLE');
    setFormData({});
    systemSay("Awesome! Let's start an **Invitation**. What's the **title** of this invite? (e.g. Annual BBQ)");
  };

  const startAnnouncementFlow = () => {
    setWizardState('ANN_TITLE');
    setFormData({});
    systemSay("Copy that. Let's draft an **Announcement**. What's the **headline**?");
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
        else if (lower.includes('invite')) startInviteFlow();
        else if (lower.includes('announcement')) startAnnouncementFlow();
        else systemSay("I didn't quite get that. Would you like to create an **Event**, an **Invite**, or an **Announcement**?");
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
                toast({ title: "Event Created" });
            });
        } else {
            systemSay("Aborted. What else?");
            setWizardState('IDLE');
        }
    }

    // INVITE FLOW
    else if (wizardState === 'INVITE_TITLE') {
        setFormData({ ...formData, title: text });
        setWizardState('INVITE_DESC');
        systemSay("Now, provide a short **Description**. Enter to skip.");
    } else if (wizardState === 'INVITE_DESC') {
        setFormData({ ...formData, description: text || '' });
        setWizardState('INVITE_DATE');
        systemSay("What is the **Date**? (e.g. Saturday, Aug 12th)");
    } else if (wizardState === 'INVITE_DATE') {
        setFormData({ ...formData, rawDate: text });
        setWizardState('INVITE_START_TIME');
        systemSay("What's the **Start Time**? (e.g. 7:00 PM). Enter to skip.");
    } else if (wizardState === 'INVITE_START_TIME') {
        setFormData({ ...formData, startTime: text || '' });
        setWizardState('INVITE_END_TIME');
        systemSay("What's the **End Time**? (e.g. 9:00 PM). Enter to skip.");
    } else if (wizardState === 'INVITE_END_TIME') {
        setFormData({ ...formData, endTime: text || '' });
        setWizardState('INVITE_LOCATION');
        systemSay("What is the **Location**? Enter to skip.");
    } else if (wizardState === 'INVITE_LOCATION') {
        const timeStr = formData.startTime ? (formData.endTime ? ` ${formData.startTime}-${formData.endTime}` : ` ${formData.startTime}`) : '';
        const finalData = { 
            ...formData, 
             location: text || '',
             dateOptions: [`${formData.rawDate}${timeStr}`]
        };
        setFormData(finalData);
        setWizardState('INVITE_CONFIRM');
        systemSay(`Launch the invitation **${formData.title}**? (Yes/No)`);
    } else if (wizardState === 'INVITE_CONFIRM') {
        if (text.toLowerCase().includes('yes')) {
            addInvitation(formData).then(() => {
                systemSay("The invitation is live.");
                setWizardState('IDLE');
                toast({ title: "Invite Created" });
            });
        } else {
            systemSay("Cancelled. What next?");
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
                toast({ title: "Announcement Live" });
            });
        } else {
            systemSay("Discarded. Anything else?");
            setWizardState('IDLE');
        }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Scrollable Message Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-12 hide-scrollbar relative"
      >
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-8 pb-32">
            <div className="flex flex-col items-center justify-center mb-12 opacity-30">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <MessageSquarePlus className="h-6 w-6" />
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/80 font-inter">Creation Assistant</h2>
            </div>

            {messages.map((msg) => (
            <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                    "flex gap-4 w-full",
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
                            ? "bg-[#007AFF] font-black rounded-tr-xl shadow-xl shadow-blue-500/10" 
                            : "bg-[#3B3B3D]/20 border border-white/5 text-foreground font-inter rounded-tl-xl"
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
                    <span className="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest px-2">
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
                        className="h-10 px-6 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group scale-100 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                        Event
                    </Button>
                    <Button 
                        onClick={startInviteFlow}
                        variant="outline"
                        className="h-10 px-6 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group scale-100 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Mail className="mr-2 h-3.5 w-3.5 text-primary" />
                        Invite
                    </Button>
                    <Button 
                        onClick={startAnnouncementFlow}
                        variant="outline"
                        className="h-10 px-6 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group scale-100 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                    >
                        <Bell className="mr-2 h-3.5 w-3.5 text-primary" />
                        Broadcast
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
      <div className="px-4 py-8 bg-gradient-to-t from-background via-background/90 to-transparent shrink-0 z-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <div className="flex justify-end px-6">
                <button 
                    onClick={() => { setWizardState('IDLE'); setMessages([]); focusInput(); }} 
                    className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-red-500/60 transition-colors"
                >
                    Reset Chat
                </button>
            </div>
            
            <div className="flex items-center gap-2 bg-[#3B3B3D]/30 backdrop-blur-3xl px-6 py-1.5 rounded-full border border-white/5 focus-within:bg-[#3B3B3D]/50 transition-all relative group">
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
                        inputValue.trim() || wizardState !== 'IDLE' ? "bg-[#007AFF] text-white shadow-lg shadow-blue-500/20" : "bg-white/10 text-muted-foreground opacity-20"
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
