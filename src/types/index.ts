
import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AvatarCosmeticTier } from '@/lib/avatar-cosmetics';
import type { AppThemeId } from '@/lib/app-themes';
import type { TypographyPreferences } from '@/lib/typography-preferences';
import type { BibleTextVersion } from '@/lib/bible-versions';
import type { RoleCapability, RoleStatus } from '@/lib/role-capabilities';

// Layout types removed: react-grid-layout is no longer used
type Layouts = Record<string, any>;

export interface AppRole {
  id: string;
  name: string;
  capabilities?: RoleCapability[];
  status?: RoleStatus;
  chatId?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  archivedAt?: Timestamp;
}

export interface AppInvite {
  id: string;
  roles: string[];
  label?: string;
  createdAt?: Timestamp;
  createdBy?: string;
  allowedEmail?: string | null;
  expiresAt?: Timestamp | null;
  maxUses?: number;
  useCount?: number;
  usedBy?: string[];
  lastUsedAt?: Timestamp;
}

export enum EventCategory {
  Event = "Event",
  Birthday = "Birthday",
  Snack = "Snack",
}

/** none: single or multi-day span. daily/weekly: repeats until recurrenceUntil. */
export type EventRecurrence = 'none' | 'daily' | 'weekly';

export interface AppEvent {
  id: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  category: string; // "Event", "Birthday", "Snack", or anything custom
  title: string;
  details?: string;
  location?: string;
  userId?: string;
  /** Targeted roles: if empty/undefined, everyone can see. */
  allowedRoleIds?: string[];
  /** Repeating pattern; omit or 'none' for one-off / date-span only. */
  recurrence?: EventRecurrence;
  /** ISO date — last day the recurrence can occur (required when recurrence is daily or weekly). */
  recurrenceUntil?: string;
  /** 0–6 Sun–Sat. Multi-day span: limit to these weekdays in range. Recurring weekly: repeat on these days (default: start date’s weekday). Recurring daily: optional; empty = every day. */
  weekdays?: number[];
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

export type RosterFieldType = 'text' | 'person' | 'user';

export interface RosterFieldDefinition {
  id: string;
  label: string;
  type: RosterFieldType;
  order: number;
}

export interface RosterEditPermissions {
  allowedUserIds?: string[];
  allowedRoleIds?: string[];
}

export interface RosterDefinition {
  id: string;
  name: string;
  createdAt: Timestamp;
  visibility?: RosterVisibility;
  fields?: RosterFieldDefinition[];
  editPermissions?: RosterEditPermissions;
}

export interface RosterFieldValue {
  text?: string;
  userId?: string | null;
}

export interface CustomRosterEntry {
  id: string;
  date: string;
  time?: string;
  fieldValues?: Record<string, RosterFieldValue>;
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

type PlanType = 'canonical' | 'custom' | 'mcheyne';

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

interface EditableAvatarData {
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

export type AvatarMode = 'custom' | 'initials' | 'animal' | 'landscape' | 'robot' | 'pixel-art' | 'image';

export interface AvatarData extends Partial<EditableAvatarData> {
  mode?: AvatarMode;
  seed?: string;
  initials?: string;
  imageUrl?: string;
  cosmeticTier?: AvatarCosmeticTier;
}

export interface AppUser extends FirebaseUser {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  roleIds?: string[];
  capabilityKeys?: RoleCapability[];
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isAdmin?: boolean;
  isApproved?: boolean;
  isYouth?: boolean;
  avatar?: AvatarData;
  avatarChangesEnabled?: boolean;
  fcmTokens?: string[];
  /** Client should hard-rebind FCM SW + token on next open. */
  fcmNeedsResync?: boolean;
  fcmLastHealedAt?: Timestamp;
  fcmHealVersion?: string;
  preferredLanguage?: 'en' | 'ko';
  appTheme?: AppThemeId;
  typography?: TypographyPreferences;
  bibleTextVersion?: BibleTextVersion;
  prayerRequestsLastSeenAt?: Timestamp;
}


export interface UserProfileData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  roleIds?: string[];
  capabilityKeys?: RoleCapability[];
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isApproved?: boolean;
  avatar?: AvatarData;
  avatarChangesEnabled?: boolean;
  fcmTokens?: string[];
  /** Client should hard-rebind FCM SW + token on next open. */
  fcmNeedsResync?: boolean;
  fcmLastHealedAt?: Timestamp;
  fcmHealVersion?: string;
  preferredLanguage?: 'en' | 'ko';
  appTheme?: AppThemeId;
  typography?: TypographyPreferences;
  bibleTextVersion?: BibleTextVersion;
  prayerRequestsLastSeenAt?: Timestamp;
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
  scheduledFor?: Timestamp | null;
  pushSentAt?: Timestamp | null;
  /** Emoji → user ids who reacted (announcements). */
  reactions?: { [emoji: string]: string[] };
}

export interface PrayerRequest {
  id: string;
  text: string;
  isAnonymous: boolean;
  submitterId: string;
  submitterDisplayName?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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

/** Who may create a given chat type. `everyone` = all approved users (youth rules still apply). */
export type ChatCreationAccessMode = 'everyone' | 'roles';

export interface ChatTypeCreationPermission {
  mode: ChatCreationAccessMode;
  /** When mode is `roles`, only users with one of these role IDs may create. Empty = nobody (except app admins). */
  allowedRoleIds: string[];
}

export interface ChatCreationPermissions {
  privateChat: ChatTypeCreationPermission;
  groupChat: ChatTypeCreationPermission;
}

/** Serializable chat row returned by the admin list-chats API. */
export interface AdminChatSummary {
  id: string;
  type: 'private' | 'group';
  name?: string;
  members: string[];
  memberInfo: { [uid: string]: ChatMemberInfo };
  lastMessageText?: string;
  lastMessageSentAtMs: number | null;
  createdAtMs: number | null;
}

export type DeletedMessageContentType =
  | 'message'
  | 'image'
  | 'event'
  | 'setlist'
  | 'roster'
  | 'song'
  | 'poll'
  | 'qt'
  | 'cleaning'
  | 'doc';

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  seenBy: string[];
  reactions?: { [key: string]: string[] };
  replyToId?: string;
  replyCount?: number;
  latestReplySenderId?: string;
  latestReplyText?: string;
  latestReplyImageUrl?: string;
  eventId?: string;
  setlistId?: string;
  /** Display name captured when the setlist was shared (for previews/pushes). */
  setlistName?: string;
  rosterId?: string;
  qtDate?: string;
  cleaningDate?: string;
  songId?: string;
  songTitle?: string;
  sheetKey?: string;
  /** Shared document attached to this chat message. */
  docId?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedContentType?: DeletedMessageContentType;
  /** Centered system line in chat (e.g. group photo changed). */
  systemEvent?: 'groupPhotoChanged' | 'groupPhotoRemoved';
  /** Main-chat message mirroring a thread reply; opens thread on parent. */
  threadParentId?: string;
  poll?: ChatPoll;
  /** Option index (string) → voter user ids */
  pollVotes?: Record<string, string[]>;
  /** Bumped when someone votes so the poll sorts to the latest activity. */
  pollUpdatedAt?: Timestamp;
}

export interface ChatPoll {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  /** When true, voting is closed; everyone can still view results. */
  resultsLocked?: boolean;
}

// ── Worship Portal ──────────────────────────────────────────────────────────

export type ChordKey =
  | 'numbers'
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F'
  | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export interface SongChordSheet {
  /** Unique id within the song's chordSheets array */
  id: string;
  key: ChordKey;
  imageUrl: string;
  storagePath: string;
  uploadedAt: Timestamp;
}

export interface WorshipSong {
  id: string;
  title: string;
  artist?: string;
  chordSheets: SongChordSheet[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** Per-setlist YouTube reference link with an optional label (e.g. "For intro only"). */
export interface ReferenceTrack {
  url: string;
  note?: string;
}

export interface SetlistSong {
  songId: string;
  title: string;
  key: ChordKey;
  order: number;
  /** Per-setlist reference tracks (YouTube watch or youtu.be URLs) */
  referenceTracks?: ReferenceTrack[];
  /** Explicit chord sheet IDs from the song library for this key; omit = all sheets for key */
  chordSheetIds?: string[];
}

export interface WorshipSetlist {
  id: string;
  name: string;
  date: string;  // ISO yyyy-MM-dd
  songs: SetlistSong[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  rosterId?: string; // linked worship roster
}

// ── Worship Roster ───────────────────────────────────────────────────────────

export type WorshipRole =
  | 'Lead'
  | 'Drums'
  | 'Keys 1'
  | 'Keys 2'
  | 'Bass'
  | 'Vox 1'
  | 'Vox 2'
  | 'Vox 3'
  | 'E/G 1'
  | 'E/G 2'
  | 'A/G'
  | 'PPT'
  | 'Sound'
  | 'Lighting';

export const WORSHIP_ROLES: WorshipRole[] = [
  'Lead', 'Drums', 'Keys 1', 'Keys 2', 'Bass',
  'Vox 1', 'Vox 2', 'Vox 3', 'E/G 1', 'E/G 2',
  'A/G', 'PPT', 'Sound', 'Lighting',
];

/** Ensures every defined role exists (e.g. after new roles are added). */
export function mergeWorshipRosterSlots(slots: WorshipRosterSlot[]): WorshipRosterSlot[] {
  const byRole = new Map(slots.map((s) => [s.role, s]));
  return WORSHIP_ROLES.map((role, order) => {
    const existing = byRole.get(role);
    return existing ? { ...existing, order } : { role, members: [], order };
  });
}

export interface WorshipRosterMember {
  /** uid of the site user, or null for guests */
  userId: string | null;
  /** Display name – required for guests, optional override for site users */
  displayName: string;
}

export interface WorshipRosterSlot {
  role: WorshipRole;
  members: WorshipRosterMember[];
  order: number;
}

export interface WorshipRoster {
  id: string;
  name: string;
  /** ISO yyyy-MM-dd – used to auto-link with setlists on the same date */
  date: string;
  /** Optional explicit link to a setlist id */
  setlistId?: string | null;
  slots: WorshipRosterSlot[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── Links ─────────────────────────────────────────────────────────────────────

export interface CommunityLink {
  id: string;
  title: string;
  description?: string;
  url: string;
  createdBy: string;
  createdAt: Timestamp;
}

/** Homepage information widget (freeform text panel). */
export interface InfoWidget {
  id: string;
  title: string;
  titleKo?: string;
  body: string;
  bodyKo?: string;
  order: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

// ── Shared documents ──────────────────────────────────────────────────────────

export type DocVisibility = 'private' | 'shared';

export interface DocNote {
  id: string;
  /** Optional display title; empty string means untitled. */
  title: string;
  content: string;
  visibility: DocVisibility;
  ownerId: string;
  /** Everyone who has authored or edited the document (includes owner). */
  authorIds: string[];
  sharedWith: string[];
  memberIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface DocComment {
  id: string;
  text: string;
  authorId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

