
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
  summary?: string; // New field for AI summary
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

export interface SidebarPreferences {
  home: boolean;
  notifications: boolean;
  events: boolean;
  memorize: boolean;
  checklist: boolean;
  fullPlan: boolean;
  leaderboard: boolean;
  adminEvents?: boolean;
  adminMemoryVerses?: boolean;
  adminBiblePlan?: boolean;
  adminNotifications?: boolean;
}

// Extended user type
export interface AppUser extends FirebaseUser {
  displayName: string | null;
  showInCommunityProgress?: boolean;
  sidebar?: Partial<SidebarPreferences>;
  isAdmin?: boolean;
}


export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  showInCommunityProgress?: boolean;
  sidebar?: Partial<SidebarPreferences>;
  isAdmin?: boolean;
}


export interface UserBibleChecklist {
  userId: string; // Matches Firebase Auth UID
  completedPassages: string[]; // Stores displayText of completed passages
  updatedAt?: Timestamp;
}

export interface MemoryVerse {
  id: string; // Firestore document ID
  reference: string; // e.g., "John 3:16", "Psalm 23:1-3", or "The Lord's Prayer"
  textOverride?: string; // Full text for special entries like The Lord's Prayer
  order?: number; // Optional, for custom ordering if needed
  addedAt: Timestamp;
  isLordsPrayerChunk?: boolean; // To identify parts of the Lord's Prayer or the single entry
}


export interface WeeklyProgress {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  readings: DailyReading[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isOverdue: boolean;
  passageSummary: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'admin' | 'event' | 'reading_progress' | 'reminder';
  isGlobal: boolean; // True for admin-created global notifications
  userId?: string; // For user-specific notifications
  createdAt: Timestamp;
  readBy: string[]; // Array of user UIDs who have read it
  relatedUrl?: string; // e.g., link to the event or reading plan
}
