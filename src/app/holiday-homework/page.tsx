
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useHolidayChecklist } from '@/hooks/use-holiday-checklist';
import { BIBLE_BOOKS_DATA, NEW_TESTAMENT_ORDER } from '@/lib/bible-data';
import { differenceInDays, isAfter, startOfDay, parseISO, eachDayOfInterval, getDay, format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Loader2, BookCheck, ClipboardList, Target, CalendarClock, Book, Hourglass, CheckCircle, ArrowLeft } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import BiblePlanDisplay from '@/components/bible-plan/bible-plan-display';
import type { HolidayHomeworkPreferences, DailyReading, StructuredPassage } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const REJOICE_DEADLINE = new Date('2026-01-16T00:00:00');
const SCHOOL_DEADLINE = new Date('2026-01-27T00:00:00');
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const newTestamentReadingUnits: StructuredPassage[] = NEW_TESTAMENT_ORDER.flatMap(bookName => {
    const bookData = BIBLE_BOOKS_DATA[bookName];
    if (!bookData) return [];
    return Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(chapter => ({
        book: bookName,
        chapter,
        displayText: `${bookName} ${chapter}`
    }));
});
const totalNewTestamentChapters = newTestamentReadingUnits.length;

type HolidayWeek = {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    readings: DailyReading[];
};

type ViewState = 
  | { view: 'all-weeks' }
  | { view: 'single-week-details'; week: HolidayWeek };


export default function HolidayHomeworkPage() {
    const { currentUser, loadingAuth, updateUserProfile } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const { completedChapters, toggleChapterCompletion, loadingChecklist } = useHolidayChecklist();

    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [deadlineOption, setDeadlineOption] = useState<'rejoice' | 'school'>('rejoice');
    const [viewState, setViewState] = useState<ViewState>({ view: 'all-weeks' });

    const DEADLINE = useMemo(() => {
        return deadlineOption === 'rejoice' ? REJOICE_DEADLINE : SCHOOL_DEADLINE;
    }, [deadlineOption]);

    useEffect(() => { 
        setIsMounted(true); 
        if (currentUser?.holidayHomework) {
            setDeadlineOption(currentUser.holidayHomework.deadline ?? 'rejoice');
            setSelectedDays(currentUser.holidayHomework.readingDays ?? ['1', '2', '3', '4', '5']);
        }
    }, [currentUser]);

    const handlePreferencesChange = useCallback((prefs: Partial<HolidayHomeworkPreferences>) => {
        if (!currentUser || loadingAuth) return;
        const newPrefs = {
            deadline: deadlineOption,
            readingDays: selectedDays,
            ...prefs
        };
        updateUserProfile(currentUser.uid, { holidayHomework: newPrefs });
    }, [currentUser, loadingAuth, deadlineOption, selectedDays, updateUserProfile]);

    const handleDeadlineChange = (value: 'rejoice' | 'school') => {
        if (!value) return;
        setDeadlineOption(value);
        handlePreferencesChange({ deadline: value });
    };

    const handleDaysChange = (value: string[]) => {
        if (value.length === 0) return; // Prevent unselecting all days
        setSelectedDays(value);
        handlePreferencesChange({ readingDays: value });
    };

    const { daysLeft, isPastDeadline } = useMemo(() => {
        const today = startOfDay(new Date());
        const deadlineDay = startOfDay(DEADLINE);
        const diff = differenceInDays(deadlineDay, today);
        return {
            daysLeft: Math.max(0, diff),
            isPastDeadline: isAfter(today, deadlineDay)
        };
    }, [DEADLINE]);

    const { dynamicHomeworkPlan, chaptersPerDay } = useMemo(() => {
        const today = startOfDay(new Date());
        if (isPastDeadline || selectedDays.length === 0) return { dynamicHomeworkPlan: [], chaptersPerDay: 0 };
        
        const unreadChapters = newTestamentReadingUnits.filter(unit => !completedChapters.has(unit.displayText));

        const readingDaysInRange = eachDayOfInterval({ start: today, end: DEADLINE }).filter(date => {
            const dayOfWeek = getDay(date);
            return selectedDays.includes(dayOfWeek.toString());
        }).length;

        const calculatedChaptersPerDay = readingDaysInRange > 0 ? Math.ceil(unreadChapters.length / readingDaysInRange) : unreadChapters.length;
        if (calculatedChaptersPerDay === 0) return { dynamicHomeworkPlan: [], chaptersPerDay: 0 };
        
        let plan: DailyReading[] = [];
        let chapterIdx = 0;
        eachDayOfInterval({ start: today, end: DEADLINE }).forEach(date => {
            const dayOfWeek = getDay(date);
            if (selectedDays.includes(dayOfWeek.toString()) && chapterIdx < unreadChapters.length) {
                const passagesForDay = unreadChapters.slice(chapterIdx, chapterIdx + calculatedChaptersPerDay);
                plan.push({
                    date: format(date, 'yyyy-MM-dd'),
                    passages: passagesForDay
                });
                chapterIdx += calculatedChaptersPerDay;
            }
        });
        return { dynamicHomeworkPlan: plan, chaptersPerDay: calculatedChaptersPerDay };
    }, [completedChapters, isPastDeadline, selectedDays, DEADLINE]);
    
    const weeklyHomeworkData = useMemo((): HolidayWeek[] => {
        const weeksMap = new Map<string, DailyReading[]>();
        dynamicHomeworkPlan.forEach(reading => {
            const date = parseISO(reading.date);
            const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
            const weekKey = format(weekStart, 'yyyy-MM-dd');
            if (!weeksMap.has(weekKey)) {
                weeksMap.set(weekKey, []);
            }
            weeksMap.get(weekKey)!.push(reading);
        });

        return Array.from(weeksMap.entries()).map(([weekKey, readings], index) => {
            const weekStartDate = parseISO(weekKey);
            return {
                weekNumber: index + 1,
                startDate: weekStartDate,
                endDate: endOfWeek(weekStartDate, { weekStartsOn: 0 }),
                readings,
            };
        }).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
    }, [dynamicHomeworkPlan]);

    const overallProgressPercentage = useMemo(() => {
        if (totalNewTestamentChapters === 0) return 0;
        return (completedChapters.size / totalNewTestamentChapters) * 100;
    }, [completedChapters]);

    useEffect(() => {
        if (isMounted && !loadingAuth && !currentUser) {
            router.push('/login');
        }
    }, [currentUser, loadingAuth, isMounted, router]);

    if (!isMounted || loadingAuth || loadingChecklist) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (isPastDeadline) {
        return (
             <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                         <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
                            <Hourglass className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Homework Period Over</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The holiday homework period has ended.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };
    
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    const viewVariants = {
      hidden: { opacity: 0, scale: 0.98 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <AnimatePresence mode="wait">
                <div key={viewState.view}>
                    {viewState.view === 'single-week-details' && (
                        <motion.div 
                            className="space-y-6"
                            variants={viewVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                        >
                            <Button variant="ghost" onClick={() => setViewState({ view: 'all-weeks' })} className="mb-4">
                                <ArrowLeft className="mr-2 h-4 w-4"/> Back to Plan
                            </Button>
                            <h1 className="text-3xl font-bold tracking-tight">Week {viewState.week.weekNumber}: {format(viewState.week.startDate, 'MMM d')} - {format(viewState.week.endDate, 'MMM d')}</h1>
                            <Accordion type="single" collapsible className="w-full space-y-2" defaultValue={isSameDay(startOfWeek(new Date(), {weekStartsOn: 0}), viewState.week.startDate) ? format(new Date(), 'yyyy-MM-dd') : undefined}>
                                {viewState.week.readings.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()).map(reading => (
                                    <BiblePlanDisplay
                                        key={reading.date}
                                        readingToDisplay={reading}
                                        currentUser={currentUser}
                                        completedPassages={Array.from(completedChapters)}
                                        togglePassageCompletion={toggleChapterCompletion}
                                        allPassageTextsForDay={reading.passages.map(p => p.displayText)}
                                        loading={loadingChecklist}
                                        planAvailable={true}
                                        hidePlanMeta={true}
                                        defaultOpen={isSameDay(new Date(), parseISO(reading.date))}
                                    />
                                ))}
                            </Accordion>
                        </motion.div>
                    )}

                    {viewState.view === 'all-weeks' && (
                        <motion.div 
                            className="space-y-8"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.div variants={itemVariants} className="flex items-center space-x-3 mb-6">
                                <BookCheck className="h-8 w-8 text-primary" />
                                <h1 className="text-3xl font-bold tracking-tight">Holiday Homework: New Testament</h1>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Pace Calculator</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <Label htmlFor="deadline-options" className="mb-2 block font-medium">Select your deadline:</Label>
                                            <RadioGroup id="deadline-options" value={deadlineOption} onValueChange={handleDeadlineChange} className="flex space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="rejoice" id="rejoice" />
                                                    <Label htmlFor="rejoice">Rejoice Conference (16/01/26)</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="school" id="school" />
                                                    <Label htmlFor="school">Start of School (27/01/26)</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                        <div>
                                            <Label htmlFor="reading-days" className="mb-2 block font-medium">Select your reading days:</Label>
                                            <ToggleGroup 
                                                id="reading-days"
                                                type="multiple" 
                                                variant="outline" 
                                                value={selectedDays} 
                                                onValueChange={handleDaysChange}
                                                className="flex-wrap justify-start"
                                            >
                                                {DAYS_OF_WEEK.map((day, index) => (
                                                    <ToggleGroupItem key={day} value={index.toString()} aria-label={`Toggle ${day}`}>
                                                        {day}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>My Plan</CardTitle>
                                        <div className="text-sm text-muted-foreground pt-2">
                                            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                                                <span><strong className="text-foreground">{chaptersPerDay}</strong> chapters/day</span>
                                                <span><strong className="text-foreground">{daysLeft}</strong> days left</span>
                                                <span><strong className="text-foreground">{totalNewTestamentChapters - completedChapters.size}</strong> chapters left</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Progress value={overallProgressPercentage} className="h-2" />
                                        <p className="text-right text-xs mt-1 text-muted-foreground">{Math.round(overallProgressPercentage)}% Complete ({completedChapters.size}/{totalNewTestamentChapters})</p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {weeklyHomeworkData.length > 0 ? (
                                <motion.div variants={itemVariants} className="space-y-4">
                                     <h2 className="text-2xl font-bold tracking-tight">Weekly Schedule</h2>
                                    {weeklyHomeworkData.map(week => (
                                        <Card 
                                            key={week.weekNumber}
                                            className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
                                            onClick={() => setViewState({ view: 'single-week-details', week })}
                                        >
                                            <CardHeader>
                                                <CardTitle>Week {week.weekNumber}: {format(week.startDate, 'MMM d')} - {format(week.endDate, 'MMM d')}</CardTitle>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div variants={itemVariants}>
                                    <Card className="text-center p-8">
                                        <CardContent>
                                            <p className="text-muted-foreground">Your reading plan will appear here once you set your preferences.</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </div>
            </AnimatePresence>
        </div>
    );
}
