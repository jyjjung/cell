
import { type NextRequest, NextResponse } from 'next/server';
import type { App as FirebaseAdminApp } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase-admin/firestore';
import { addDays, format, isSameDay } from 'date-fns';
import type { AppEvent, QTRosterEntry, CleaningRosterEntry, AppNotification } from '@/types';

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
async function createNotificationIfNotExists(db: FirebaseFirestore.Firestore, notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) {
    if (!notificationData.userId && !notificationData.isGlobal) {
        console.warn('Skipping notification without a target user (and not global):', notificationData.title);
        return;
    }

    const notificationsRef = collection(db, 'notifications');
    let q;

    // Build a query to check for duplicates based on the target and title
    if (notificationData.isGlobal) {
        q = query(notificationsRef,
            where('isGlobal', '==', true),
            where('title', '==', notificationData.title),
            where('relatedUrl', '==', notificationData.relatedUrl || null)
        );
    } else {
        q = query(notificationsRef,
            where('userId', '==', notificationData.userId),
            where('title', '==', notificationData.title),
            where('relatedUrl', '==', notificationData.relatedUrl || null)
        );
    }
    
    const existingNotifsSnap = await getDocs(q);
    
    // Only create if no exact duplicate exists
    if (existingNotifsSnap.empty) {
        const dataToSave = {
            ...notificationData,
            createdAt: serverTimestamp(),
            readBy: [],
        };
        await addDoc(notificationsRef, dataToSave);
    }
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
    
    let notificationsCreated = 0;

    // --- 1. Event Reminders (Global) ---
    const eventsQuery = query(collection(db, 'events'), where('date', 'in', datesToCheck));
    const eventSnapshots = await getDocs(eventsQuery);

    for (const doc of eventSnapshots.docs) {
        const event = { id: doc.id, ...doc.data() } as AppEvent;
        const eventDate = Timestamp.fromMillis(Date.parse(event.date)).toDate();
        let title = '';

        if (isSameDay(eventDate, today)) {
            title = `Today: ${event.title}`;
        } else if (isSameDay(eventDate, tomorrow)) {
            title = `Tomorrow: ${event.title}`;
        } else continue;
        
        // Event reminders are global
        await createNotificationIfNotExists(db, { 
            title, 
            message: `This event is happening ${isSameDay(eventDate, today) ? 'today' : 'tomorrow'}.`, 
            type: 'reminder', 
            isGlobal: true, 
            relatedUrl: `/events#${event.id}` 
        });
        notificationsCreated++;
    }

    // --- 2. QT Roster Reminders (User-specific) ---
    const qtRosterQuery = query(collection(db, 'qtRosters'), where('date', 'in', datesToCheck));
    const qtSnapshots = await getDocs(qtRosterQuery);

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

        await createNotificationIfNotExists(db, {
            title,
            message: `Your topic is "${qtEntry.title}" on ${qtEntry.passage}.`,
            type: 'reminder',
            isGlobal: false,
            userId: qtEntry.userId,
            relatedUrl: '/qt'
        });
        notificationsCreated++;
    }
    
    // --- 3. Cleaning Roster Reminders (User-specific) ---
    const cleaningRosterQuery = query(collection(db, 'cleaningRosters'), where('date', 'in', datesToCheck));
    const cleaningSnapshots = await getDocs(cleaningRosterQuery);

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
            await createNotificationIfNotExists(db, {
                title,
                message: `Please remember your cleaning assignment for ${isSameDay(entryDate, today) ? 'today' : 'tomorrow'}.`,
                type: 'reminder',
                isGlobal: false,
                userId: userId,
                relatedUrl: '/cleaning-roster'
            });
            notificationsCreated++;
        }
    }

    return NextResponse.json({ success: true, message: `Reminder check complete. ${notificationsCreated} potential notifications processed.` });

  } catch (error: any) {
    console.error('Cron job for reminders failed:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
