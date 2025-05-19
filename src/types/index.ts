
import type { Timestamp } from 'firebase/firestore';

export enum EventCategory {
  QT = "QT", // Quiet Time
  Event = "Event",
  Birthday = "Birthday",
  Snack = "Snack",
}

export interface AppEvent {
  id: string; // Firestore document ID
  date: string; // ISO string for date
  category: EventCategory;
  title: string;
  details?: string;
  createdAt?: Timestamp; // Optional: for Firestore server timestamp
  updatedAt?: Timestamp; // Optional: for Firestore server timestamp
}

export interface DailyReading {
  date: string; // YYYY-MM-DD, not a Sunday
  passages: string[]; // Array of scripture references, e.g., ["Genesis 1", "Genesis 2", "Exodus 1:1-15"]
}

export type PlanType = 'canonical' | 'custom';

export interface BibleReadingPlan {
  id?: string; // Firestore document ID (e.g., "current")
  planType: PlanType;
  // For 'canonical', this could be "Canonical order starting from Genesis".
  // For 'custom', this could be "Preset Custom Chronological Order".
  planDescription: string; 
  startDate: string; // ISO string for plan's start date
  dailyReadings: DailyReading[];
  generatedDate: string; // ISO string of when this plan was generated
  updatedAt?: Timestamp; // Optional: for Firestore server timestamp
  // originalReferenceInput is no longer directly applicable as AI input is removed.
  // We use planDescription to store context about the plan.
}

