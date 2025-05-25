
import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth'; // Import FirebaseUser

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
  userId?: string; // Optional: to link events like birthdays to a user
  createdAt?: Timestamp; // Optional: for Firestore server timestamp
  updatedAt?: Timestamp; // Optional: for Firestore server timestamp
}

export interface StructuredPassage {
  book: string; // Full book name, e.g., "Genesis"
  chapter: number;
  startVerse?: number; // Optional, implies from verse 1 if not present
  endVerse?: number | 'end'; // Optional, implies to end of chapter if not present or 'end'
  displayText: string; // User-friendly display string, e.g., "Genesis 1", "Exodus 1:1-15"
}

export interface DailyReading {
  date: string; // YYYY-MM-DD, not a Sunday
  passages: StructuredPassage[]; // Array of scripture references
  originalDateKey?: string; // Added to ensure stable key for UI elements if date string format changes
}

export type PlanType = 'canonical' | 'custom';

export interface BibleReadingPlan {
  id?: string; // Firestore document ID (e.g., "current")
  planType: PlanType;
  planDescription: string;
  startDate: string; // ISO string for plan's start date
  dailyReadings: DailyReading[];
  generatedDate: string; // ISO string of when this plan was generated
  updatedAt?: Timestamp; // Optional: for Firestore server timestamp
}

// Extended user type
export interface AppUser extends FirebaseUser {
  displayName: string | null;
  birthday?: string | null; // YYYY-MM-DD format
  // photoURL is already part of FirebaseUser
}


export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  birthday?: string | null; // YYYY-MM-DD format
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


export interface UserBibleChecklist {
  userId: string; // Matches Firebase Auth UID
  userDisplayName: string | null; // To store the user's display name
  completedPassages: string[]; // Stores displayText of completed passages
  updatedAt?: Timestamp;
}
