
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useHolidayChecklist } from '@/hooks/use-holiday-checklist';
import { BIBLE_BOOKS_DATA, NEW_TESTAMENT_ORDER } from '@/lib/bible-data';
import { differenceInDays, isAfter, startOfDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, BookCheck, ClipboardList, Target, CalendarClock, Book, Hourglass } from 'lucide-react';

const DEADLINE = new Date('2026-01-27T00:00:00');

const totalNewTestamentChapters = NEW_TESTAMENT_ORDER.reduce((acc, bookName) => {
    return acc + (BIBLE_BOOKS_DATA[bookName]?.chapters || 0);
}, 0);


export default function HolidayHomeworkPage() {
    const { currentUser, loadingAuth } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const { completedChapters, toggleChapterCompletion, loadingChecklist } = useHolidayChecklist();

    useEffect(() => { setIsMounted(true); }, []);

    const { daysLeft, isPastDeadline } = useMemo(() => {
        const today = startOfDay(new Date());
        const deadlineDay = startOfDay(DEADLINE);
        const diff = differenceInDays(deadlineDay, today);
        return {
            daysLeft: Math.max(0, diff),
            isPastDeadline: isAfter(today, deadlineDay)
        };
    }, []);

    const chaptersLeft = useMemo(() => {
        return totalNewTestamentChapters - completedChapters.size;
    }, [completedChapters]);

    const chaptersPerDay = useMemo(() => {
        if (daysLeft === 0 || chaptersLeft === 0) return chaptersLeft;
        return parseFloat((chaptersLeft / daysLeft).toFixed(2));
    }, [chaptersLeft, daysLeft]);
    
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
                        <p className="text-muted-foreground">The holiday homework period ended on January 27, 2026.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, title, value, unit }: { icon: React.ElementType, title: string, value: string | number, unit: string }) => (
        <Card className="flex-1">
            <CardContent className="p-4 flex items-center space-x-4">
                <Icon className="h-8 w-8 text-primary" />
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value} <span className="text-lg font-medium text-muted-foreground">{unit}</span></p>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
             <div className="flex items-center space-x-3 mb-6">
                <ClipboardList className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Holiday Homework: New Testament</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={overallProgressPercentage} className="h-4" />
                    <p className="text-right text-sm mt-2 text-muted-foreground">{Math.round(overallProgressPercentage)}% Complete</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Target} title="Chapters Left" value={chaptersLeft} unit="chapters" />
                <StatCard icon={CalendarClock} title="Days Left" value={daysLeft} unit="days" />
                <StatCard icon={Book} title="Pace" value={chaptersPerDay} unit="chapters/day" />
            </div>

            <Accordion type="multiple" className="w-full space-y-2">
                {NEW_TESTAMENT_ORDER.map(bookName => {
                     const bookData = BIBLE_BOOKS_DATA[bookName];
                     if (!bookData) return null;
                     const totalChaptersInBook = bookData.chapters;
                     const completedInBook = Array.from({ length: totalChaptersInBook }, (_, i) => i + 1)
                        .filter(ch => completedChapters.has(`${bookName} ${ch}`)).length;
                     const isBookComplete = completedInBook === totalChaptersInBook;

                     return (
                        <AccordionItem value={bookName} key={bookName}>
                             <AccordionTrigger className="p-4 bg-muted/50 rounded-md hover:bg-muted/80 text-lg font-semibold [&[data-state=open]]:rounded-b-none">
                                <div className="flex justify-between items-center w-full pr-4">
                                    <span>{bookName}</span>
                                    <span className="text-sm text-muted-foreground">{completedInBook} / {totalChaptersInBook}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border border-t-0 rounded-b-md">
                                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(chapter => {
                                    const chapterId = `${bookName} ${chapter}`;
                                    const isChecked = completedChapters.has(chapterId);
                                    return (
                                        <div key={chapterId} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={chapterId} 
                                                checked={isChecked}
                                                onCheckedChange={() => toggleChapterCompletion(chapterId)}
                                            />
                                            <Label htmlFor={chapterId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {chapter}
                                            </Label>
                                        </div>
                                    )
                                })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                     )
                })}
            </Accordion>
        </div>
    );
}
