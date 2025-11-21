
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import StatCard from '@/components/homepage/stat-card';
import { CalendarCheck, BookCheck, BrainCircuit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfDay, parseISO, isValid, isBefore } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { AppUser, AppEvent } from '@/types';

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    useEffect(() => {
        const scrollEl = scrollContainerRef.current;
        const checkArrows = () => {
            if (!scrollEl) return;
            const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
            setShowLeftArrow(scrollLeft > 1);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
        };

        checkArrows();
        scrollEl?.addEventListener('scroll', checkArrows, { passive: true });
        window.addEventListener('resize', checkArrows);

        const observer = new ResizeObserver(checkArrows);
        if(scrollEl) observer.observe(scrollEl);

        return () => {
            scrollEl?.removeEventListener('scroll', checkArrows);
            window.removeEventListener('resize', checkArrows);
            if(scrollEl) observer.unobserve(scrollEl);
        };
    }, []);

    const scrollLeft = () => {
        scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
    };

    const scrollRight = () => {
        scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
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

    return (
        <div className="relative w-full group">
            <div
                ref={scrollContainerRef}
                className="flex gap-4 sm:gap-6 w-full mx-auto overflow-x-auto snap-x snap-mandatory py-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {currentUser && (
                    <>
                        <motion.div variants={itemVariants} initial="hidden" animate="visible" viewport={{ once: true, amount: 0.2 }} className="w-60 sm:w-64 flex-shrink-0 snap-center">
                            <StatCard title="Upcoming Events" value={eventsLoading ? null : upcomingEventsCount} isLoading={eventsLoading} buttonText="View Events" buttonLink="#event-calendar-section" IconComponent={CalendarCheck} />
                        </motion.div>
                        <motion.div variants={itemVariants} initial="hidden" animate="visible" viewport={{ once: true, amount: 0.2, delay: 0.1 }} className="w-60 sm:w-64 flex-shrink-0 snap-center">
                            <StatCard title="Reading Progress" value={readingsLoggedStatValue} isLoading={loadingAuth || loadingChecklist || planLoading} buttonText="My Checklist" buttonLink="/bible-checklist" IconComponent={BookCheck} buttonDisabled={(loadingChecklist || planLoading) ? false : totalPassagesUpToToday === 0} />
                        </motion.div>
                    </>
                )}
                <motion.div variants={itemVariants} initial="hidden" animate="visible" viewport={{ once: true, amount: 0.2, delay: 0.2 }} className="w-60 sm:w-64 flex-shrink-0 snap-center">
                    <StatCard title="Memory Verses" value={memoryVersesLoading ? null : memoryVersesCount} isLoading={memoryVersesLoading} buttonText="Practice Verses" buttonLink="/memorize" IconComponent={BrainCircuit} />
                </motion.div>
            </div>
            
            {showLeftArrow && (
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
            )}
            {showRightArrow && (
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 hover:bg-background"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            )}
        </div>
    );
}
