
import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Layout, Layouts } from 'react-grid-layout';

export interface AppRole {
  id: string;
  name: string;
  chatId?: string;
  createdAt: Timestamp;
}

export enum EventCategory {
  Event = "Event",
  Birthday = "Birthday",
  Snack = "Snack",
}

export interface AppEvent {
  id: string;
  date: string;
  category: EventCategory;
  title: string;
  details?: string;
  summary?: string;
  userId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface QTRosterEntry {
  id: string;
  date: string;
  userId?: string;
  personName: string;
  title: string;
  passage: string;
}

export interface CleaningDay {
  id: string;
  name: string;
  order: number;
}

export interface CleaningRosterEntry {
  id: string;
  date: string;
  dayId: string;
  assignedUserIds: string[];
  isCompleted: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  updatedAt?: Timestamp;
}

export interface RosterVisibility {
  type: 'public' | 'private';
  allowedUserIds?: string[];
  allowedRoleIds?: string[];
}

export interface RosterDefinition {
  id: string;
  name: string;
  createdAt: Timestamp;
  visibility?: RosterVisibility;
}

export interface RosterAssignment {
  person: string;
  duty: string;
  userId?: string | null;
}

export interface CustomRosterEntry {
  id: string;
  date: string;
  time?: string;
  assignments: RosterAssignment[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StructuredPassage {
  book: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number | 'end';
  displayText: string;
}

export interface DailyReading {
  date: string;
  passages: StructuredPassage[];
  originalDateKey?: string;
}

export type PlanType = 'canonical' | 'custom';

export interface BibleReadingPlan {
  id?: string;
  planType: PlanType;
  planDescription: string;
  startDate: string;
  dailyReadings: DailyReading[];
  generatedDate: string;
  updatedAt?: Timestamp;
  readingsPerDay?: number;
  readingDays?: number[];
}

export interface DashboardPreferences {
  widgetVisibility: {
    notifications: boolean;
    todayReading: boolean;
    upcomingEvents: boolean;
    nextReading: boolean;
    [key: string]: boolean;
  },
  layouts: Layouts;
}

export interface EditableAvatarData {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  accessory: string;
  outfitColor: string;
  accessoryColor: string;
  mouth: string;
  facialHair: string;
  facialHairColor: string;
  backgroundColor: string;
}

export type AvatarMode = 'custom' | 'initials' | 'animal' | 'landscape' | 'robot' | 'pixel-art';

export interface AvatarData extends Partial<EditableAvatarData> {
  mode?: AvatarMode;
  seed?: string;
  initials?: string;
}

export interface AppUser extends FirebaseUser {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  roleIds?: string[];
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isAdmin?: boolean;
  isApproved?: boolean;
  isYouth?: boolean;
  avatar?: AvatarData;
  fcmTokens?: string[];
  preferredLanguage?: 'en' | 'ko';
}


export interface UserProfileData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  roleIds?: string[];
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isAdmin?: boolean;
  isApproved?: boolean;
  isYouth?: boolean;
  avatar?: AvatarData;
  fcmTokens?: string[];
  preferredLanguage?: 'en' | 'ko';
}


export interface UserBibleChecklist {
  userId: string;
  completedPassages: string[];
  updatedAt?: Timestamp;
}

export interface MemoryVerse {
  id: string;
  reference: string;
  textOverride?: string;
  order?: number;
  addedAt: Timestamp;
  isLordsPrayerChunk?: boolean;
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

export type AppNotificationType = 'announcement' | 'event' | 'reading_progress' | 'reminder' | 'admin';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  isGlobal: boolean;
  userId?: string;
  createdAt: Timestamp;
  readBy: string[];
  relatedUrl?: string;
}

export interface ChatMemberInfo {
  firstName?: string;
  lastName?: string;
  avatar: AvatarData;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  members: string[];
  memberInfo: { [uid: string]: ChatMemberInfo };
  admins?: string[];
  name?: string;
  photoURL?: string;
  lastMessageText?: string;
  lastMessageSentAt?: Timestamp;
  lastMessageSenderId?: string;
  typing?: { [uid: string]: Timestamp };
  memberSeen: { [uid: string]: Timestamp };
  createdAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  createdAt: Timestamp;
  seenBy: string[];
  reactions?: { [key: string]: string[] };
}
