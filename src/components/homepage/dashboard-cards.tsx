
"use client";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/homepage/stat-card';
import { CalendarCheck, BookCheck, BrainCircuit } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore } from 'date-fns';
import { motion } from 'framer-motion';
import type { AppUser, AppEvent } from '@/types';
import { usePageLoading } from '@/contexts/page-loading-context';

interface DashboardCardsProps {
    currentUser: AppUser | null;
    loadingAuth: boolean;
    eventsLoading: boolean;
    allEvents: AppEvent[];
    loadingChecklist: boolean;
    planLoading: boolean;
    totalPassagesUpToToday: number;
    completedPassagesCount: number;
    memoryVersesLoading: boolean;
    memoryVersesCount: number;
}

export default function DashboardCards({
    currentUser,
    loadingAuth,
    eventsLoading,
    allEvents,
    loadingChecklist,
    planLoading,
    totalPassagesUpToToday,
    completedPassagesCount,
    memoryVersesLoading,
    memoryVersesCount,
}: DashboardCardsProps) {
    const router = useRouter();
    const { setIsPageLoading } = usePageLoading();

    const handleLinkClick = (path: string) => {
        setIsPageLoading(true);
        router.push(path);
    };

    const readingsLoggedStatValue = useMemo(() => {
        if (loadingChecklist || planLoading) return null;
        const passagesToRead = totalPassagesUpToToday - completedPassagesCount;
        if (passagesToRead <= 0) {
            return totalPassagesUpToToday > 0 ? "All Caught Up!" : "No readings yet";
        }
        return `${passagesToRead} Passages to read`;
    }, [completedPassagesCount, totalPassagesUpToToday, loadingChecklist, planLoading]);

    const upcomingEventsCount = useMemo(() => {
        const today = startOfDay(new Date());
        return allEvents.filter(event => {
            try {
                const eventDate = parseISO(event.date);
                return isValid(eventDate) && !isBefore(eventDate, today);
            } catch(e) { return false; }
        }).length;
    }, [allEvents]);

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 15 } },
    };

    const cards = [
        ...(currentUser ? [
            {
                key: 'events',
                title: "Upcoming Events",
                value: eventsLoading ? null : upcomingEventsCount,
                isLoading: eventsLoading,
                buttonText: "View Events",
                buttonLink: "/#event-calendar-section", // This won't work with router push, should be handled differently if it stays
                IconComponent: CalendarCheck
            },
            {
                key: 'progress',
                title: "Reading Progress",
                value: readingsLoggedStatValue,
                isLoading: loadingAuth || loadingChecklist || planLoading,
                buttonText: "My Checklist",
                buttonLink: "/bible-checklist",
                IconComponent: BookCheck,
                buttonDisabled: (loadingChecklist || planLoading) ? false : totalPassagesUpToToday === 0,
            }
        ] : []),
        {
            key: 'verses',
            title: "Memory Verses",
            value: memoryVersesLoading ? null : memoryVersesCount,
            isLoading: memoryVersesLoading,
            buttonText: "Practice Verses",
            buttonLink: "/memorize",
            IconComponent: BrainCircuit,
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cards.map((card, index) => (
                <motion.div 
                    key={card.key}
                    variants={itemVariants} 
                    initial="hidden" 
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                >
                    <StatCard 
                        title={card.title} 
                        value={card.value} 
                        isLoading={card.isLoading} 
                        buttonText={card.buttonText} 
                        buttonLink={card.buttonLink}
                        onLinkClick={() => handleLinkClick(card.buttonLink)}
                        IconComponent={card.IconComponent} 
                        buttonDisabled={card.buttonDisabled}
                    />
                </motion.div>
            ))}
        </div>
    );
}
