
import { type NextRequest, NextResponse } from 'next/server';
import type { App as FirebaseAdminApp } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import type { AppEvent, QTRosterEntry, CleaningRosterEntry, AppNotification } from '@/types';
import { eventOccursOnDate } from '@/lib/event-occurrences';

// --- Firebase Admin Initialization ---

function initializeAdminApp(): FirebaseAdminApp {
  const existingApp = getApps().find(app => app.name === 'firebase-admin-cron-reminders');
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('[Admin Init] CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is not defined.');
  }

  try {
    const credential = cert(JSON.parse(serviceAccountKey));
    return initializeApp({ credential }, 'firebase-admin-cron-reminders');
  } catch (e: any) {
    throw new Error(`[Admin Init] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize app. Error: ${e.message}`);
  }
}

// --- Notification Creation Helper ---
async function createNotificationIfNotExists(db: FirebaseFirestore.Firestore, notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>): Promise<string | null> {
    if (!notificationData.userId && !notificationData.isGlobal) {
        console.warn('Skipping notification without a target user (and not global):', notificationData.title);
        return null;
    }

    const notificationsRef = db.collection('notifications');
    let q: FirebaseFirestore.Query = notificationsRef;

    // Build a query to check for duplicates based on the target and title
    if (notificationData.isGlobal) {
        q = q.where('isGlobal', '==', true)
             .where('title', '==', notificationData.title)
             .where('relatedUrl', '==', notificationData.relatedUrl || null);
    } else {
        q = q.where('userId', '==', notificationData.userId)
             .where('title', '==', notificationData.title)
             .where('relatedUrl', '==', notificationData.relatedUrl || null);
    }
    
    const existingNotifsSnap = await q.get();
    
    // Only create if no exact duplicate exists
    if (existingNotifsSnap.empty) {
        const dataToSave = {
            ...notificationData,
            createdAt: FieldValue.serverTimestamp(),
            readBy: [],
        };
        const docRef = await notificationsRef.add(dataToSave);
        return docRef.id;
    }
    return null;
}

// --- Main API Route ---

export async function GET(request: NextRequest) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    try {
      const adminApp = initializeAdminApp();
      const db = getFirestore(adminApp);
      
      const today = new Date();
      const tomorrow = addDays(today, 1);
      const datesToCheck = [format(today, 'yyyy-MM-dd'), format(tomorrow, 'yyyy-MM-dd')];
      const todayDay = startOfDay(today);
      const tomorrowDay = startOfDay(tomorrow);
  
      let notificationsCreated = 0;
      const newNotificationIds: string[] = [];

    const toEventIso = (raw: unknown): string => {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && 'toDate' in (raw as object)) {
            return (raw as Timestamp).toDate().toISOString();
        }
        return '';
    };

    // --- 1. Event Reminders (Global) — includes recurring / multi-day patterns ---
    const eventSnapshots = await db.collection('events').get();

    for (const docSnap of eventSnapshots.docs) {
        const d = docSnap.data();
        const event: AppEvent = {
            id: docSnap.id,
            title: d.title,
            date: toEventIso(d.date),
            endDate: d.endDate ? toEventIso(d.endDate) : undefined,
            startTime: d.startTime,
            endTime: d.endTime,
            allDay: d.allDay ?? true,
            category: d.category,
            details: d.details,
            recurrence: d.recurrence,
            recurrenceUntil: d.recurrenceUntil ? toEventIso(d.recurrenceUntil) : undefined,
            weekdays: Array.isArray(d.weekdays) ? d.weekdays : undefined,
        };
        let title = '';

        if (eventOccursOnDate(event, todayDay)) {
            title = `Today: ${event.title}`;
        } else if (eventOccursOnDate(event, tomorrowDay)) {
            title = `Tomorrow: ${event.title}`;
        } else continue;
        
        // Event reminders are global
        const newId = await createNotificationIfNotExists(db, { 
            title, 
            message: `This event is happening ${eventOccursOnDate(event, todayDay) ? 'today' : 'tomorrow'}.`, 
            type: 'reminder', 
            isGlobal: true, 
            relatedUrl: `/events#${event.id}` 
        });
        if (newId) {
            newNotificationIds.push(newId);
            notificationsCreated++;
        }
    }

    // --- 2. QT Roster Reminders (User-specific) ---
    const qtSnapshots = await db.collection('qtRosters').where('date', 'in', datesToCheck).get();

    for (const doc of qtSnapshots.docs) {
        const qtEntry = doc.data() as QTRosterEntry;
        if (!qtEntry.userId) continue;

        const entryDate = Timestamp.fromMillis(Date.parse(qtEntry.date)).toDate();
        let title = '';
        
        if (isSameDay(entryDate, today)) {
            title = `Reminder: You are sharing QT today`;
        } else if (isSameDay(entryDate, tomorrow)) {
            title = `Reminder: You are sharing QT tomorrow`;
        } else continue;

        const newId = await createNotificationIfNotExists(db, {
            title,
            message: `Your topic is "${qtEntry.title}" on ${qtEntry.passage}.`,
            type: 'reminder',
            isGlobal: false,
            userId: qtEntry.userId,
            relatedUrl: '/qt'
        });
        if (newId) {
            newNotificationIds.push(newId);
            notificationsCreated++;
        }
    }
    
    // --- 3. Cleaning Roster Reminders (User-specific) ---
    const cleaningSnapshots = await db.collection('cleaningRosters').where('date', 'in', datesToCheck).get();

    for (const doc of cleaningSnapshots.docs) {
        const cleaningEntry = doc.data() as CleaningRosterEntry;
        if (!cleaningEntry.assignedUserIds || cleaningEntry.assignedUserIds.length === 0) continue;

        const entryDate = Timestamp.fromMillis(Date.parse(cleaningEntry.date)).toDate();
        let title = '';

        if (isSameDay(entryDate, today)) {
            title = `Reminder: You are on cleaning duty today`;
        } else if (isSameDay(entryDate, tomorrow)) {
            title = `Reminder: You are on cleaning duty tomorrow`;
        } else continue;
        
        for (const userId of cleaningEntry.assignedUserIds) {
            const newId = await createNotificationIfNotExists(db, {
                title,
                message: `Please remember your cleaning assignment for ${isSameDay(entryDate, today) ? 'today' : 'tomorrow'}.`,
                type: 'reminder',
                isGlobal: false,
                userId: userId,
                relatedUrl: '/cleaning-roster'
            });
            if (newId) {
                newNotificationIds.push(newId);
                notificationsCreated++;
            }
        }
    }

    // Trigger push notifications for all newly created reminders
    if (newNotificationIds.length > 0) {
        const pushUrl = new URL('/api/send-push', request.url).toString();
        // Since this is a cron job, wait for the pushes to complete to ensure Vercel doesn't kill the worker
        await Promise.allSettled(newNotificationIds.map(id => 
            fetch(pushUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id })
            })
        ));
    }

    return NextResponse.json({ success: true, message: `Reminder check complete. ${notificationsCreated} potential notifications processed.` });

  } catch (error: any) {
    console.error('Cron job for reminders failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
