
import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { AvatarCosmeticTier } from '@/lib/avatar-cosmetics';
import type { AppThemeId } from '@/lib/app-themes';
import type { UserAvatars } from '@/lib/user-avatars';

export type { UserAvatars };
import type { BibleTextVersion } from '@/lib/bible-versions';
import type { RoleCapability, RoleStatus, RoleAppScope } from '@/lib/role-capabilities';
import type { AppAccessFlags, CommunityAppId, CommunityAppPrefs, CommunityPreferences, NdcpcRole, NotificationAppPrefs } from '@/lib/app-access';

export type { AppAccessFlags, CommunityAppId, CommunityAppPrefs, CommunityPreferences, NdcpcRole, NotificationAppPrefs };

// Layout types removed: react-grid-layout is no longer used
type Layouts = Record<string, any>;

export interface AppRole {
  id: string;
  name: string;
  appScope?: RoleAppScope;
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
  phone?: string | null;
  /** ISO date yyyy-MM-dd when known (e.g. from forms). */
  birthday?: string | null;
  roleIds?: string[];
  ndcpcRoleIds?: string[];
  capabilityKeys?: RoleCapability[];
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isAdmin?: boolean;
  isApproved?: boolean;
  access?: AppAccessFlags;
  ndcpcRole?: NdcpcRole;
  preferences?: CommunityPreferences;
  legacyNdcpcUid?: string;
  migratedFrom?: 'ndcpc';
  isYouth?: boolean;
  avatar?: AvatarData;
  /** Per-app profile photos — Cell includes halos; NDCPC does not. */
  avatars?: UserAvatars;
  avatarChangesEnabled?: boolean;
  fcmTokens?: string[];
  /** Client should hard-rebind FCM SW + token on next open. */
  fcmNeedsResync?: boolean;
  fcmLastHealedAt?: Timestamp;
  fcmHealVersion?: string;
  preferredLanguage?: 'en' | 'ko';
  appTheme?: AppThemeId;
  bibleTextVersion?: BibleTextVersion;
  prayerRequestsLastSeenAt?: Timestamp;
  /** Last active signed-in client (throttled). Used for admin inactive filter. */
  lastSeenAt?: Timestamp;
}


export interface UserProfileData {
  uid: string;
  email: string | null;
  /** Additional contact emails (not Firebase Auth login). */
  contactEmails?: string[];
  firstName: string;
  lastName: string;
  /** Optional contact phone collected from forms / profile. */
  phone?: string | null;
  /** ISO date yyyy-MM-dd collected from forms / profile. */
  birthday?: string | null;
  roleIds?: string[];
  ndcpcRoleIds?: string[];
  capabilityKeys?: RoleCapability[];
  photoURL?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  showInCommunityProgress?: boolean;
  dashboard?: DashboardPreferences;
  isApproved?: boolean;
  access?: AppAccessFlags;
  ndcpcRole?: NdcpcRole;
  preferences?: CommunityPreferences;
  legacyNdcpcUid?: string;
  migratedFrom?: 'ndcpc';
  avatar?: AvatarData;
  /** Per-app profile photos — Cell includes halos; NDCPC does not. */
  avatars?: UserAvatars;
  avatarChangesEnabled?: boolean;
  fcmTokens?: string[];
  /** Client should hard-rebind FCM SW + token on next open. */
  fcmNeedsResync?: boolean;
  fcmLastHealedAt?: Timestamp;
  fcmHealVersion?: string;
  preferredLanguage?: 'en' | 'ko';
  appTheme?: AppThemeId;
  bibleTextVersion?: BibleTextVersion;
  prayerRequestsLastSeenAt?: Timestamp;
  /** Last active signed-in client (throttled). Used for admin inactive filter. */
  lastSeenAt?: Timestamp;
}

export interface NdcpcVolunteer {
  id: string;
  name: string;
  userId?: string | null;
  email?: string | null;
  createdAt?: Timestamp;
}

/** Legacy roster doc — five named roles per Sunday. */
export interface NdcpcSchedule {
  id: string;
  date: Timestamp | { seconds: number };
  worship: string;
  offering: string;
  sermon: string;
  chant: string;
  activity: string;
}

export interface NdcpcAnnouncement {
  id: string;
  title: string;
  /** Migrated legacy field */
  content?: string;
  body?: string;
  date?: Timestamp | { seconds: number };
  createdAt?: Timestamp;
}

export type NdcpcChatReplyTo = {
  messageId: string;
  authorName: string;
  text: string;
};

export interface NdcpcChatMessage {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL?: string | null;
  authorAvatar?: AvatarData;
  createdAt: Timestamp | { seconds: number; toDate?: () => Date };
  deleted?: boolean;
  replyTo?: NdcpcChatReplyTo | string | null;
  reactions?: Record<string, string[]>;
  seenBy?: Record<string, { name?: string; at?: unknown }>;
}

export type NdcpcResourceCategory = 'chants' | 'songs' | 'schedules' | 'announcements';

export interface NdcpcResource {
  id: string;
  title: string;
  url: string;
  category: NdcpcResourceCategory;
  createdAt?: Timestamp;
  description?: string;
  startSeconds?: number;
  endSeconds?: number;
}

export interface NdcpcSetlist {
  id: string;
  date: Timestamp | { seconds: number };
  songIds?: string[];
  chantIds?: string[];
  resourceIds?: string[];
  createdAt?: Timestamp;
}

export interface NdcpcPhoto {
  id: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt?: Timestamp;
  caption?: string;
}

export interface NdcpcPrayerTopic {
  id: string;
  topic: string;
  date?: Timestamp | { seconds: number };
}

export type NdcpcWorshipFormatItem = {
  id?: string;
  label?: string;
  timeFrom?: string;
  timeTo?: string;
  roles?: ('worship' | 'offering' | 'sermon' | 'chant' | 'activity')[];
};

export interface NdcpcWorshipFormat {
  id: string;
  items: NdcpcWorshipFormatItem[] | string[];
  updatedAt?: Timestamp;
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
  reactions?: { [emoji: string]: string[] };
  relatedUrl?: string;
  scheduledFor?: Timestamp | null;
  pushSentAt?: Timestamp | null;
  pushClaimedAt?: Timestamp | null;
  pushDeliveredCount?: number;
  pushNeedsRetry?: boolean;
  pushRetryCount?: number;
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
  /** Which app owns this chat — role chats for preschool use `ndcpc`. */
  appScope?: 'cell' | 'ndcpc';
  /** Preschool team room (managers only) vs role circle. */
  ndcpcKind?: 'team' | 'role';
  photoURL?: string;
  lastMessageText?: string;
  lastMessageSentAt?: Timestamp;
  lastMessageSenderId?: string;
  typing?: { [uid: string]: Timestamp };
  memberSeen: { [uid: string]: Timestamp };
  /** Per-member unseen message counts for badges (incremented on send, cleared on seen). */
  memberUnreadCount?: { [uid: string]: number };
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
  /** Smaller JPEG for album grids / bubbles; full image stays in imageUrl. */
  imageThumbUrl?: string;
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

export interface ChordChartPoint {
  x: number;
  y: number;
}

export interface ChordChartStroke {
  id: string;
  color: string;
  width: number;
  points: ChordChartPoint[];
}

export interface ChordChartAnnotation {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  strokes: ChordChartStroke[];
}

export interface SongChordSheet {
  /** Unique id within the song's chordSheets array */
  id: string;
  key: ChordKey;
  imageUrl: string;
  storagePath: string;
  uploadedAt: Timestamp;
  /** Pasted text chart (preferred) or image/PDF upload */
  kind?: 'image' | 'text';
  /** Original pasted chart (SongSelect / ChordPro). Stored in `key`. */
  sourceText?: string;
  annotations?: ChordChartAnnotation[];
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
  /** Stable row id so the same library song can appear more than once. */
  entryId?: string;
  title: string;
  key: ChordKey;
  order: number;
  /** Per-setlist reference tracks (YouTube watch or youtu.be URLs) */
  referenceTracks?: ReferenceTrack[];
  /** Explicit chord sheet IDs from the song library for this key; omit = all sheets for key */
  chordSheetIds?: string[];
  /** Annotation set to show on pasted charts for this setlist entry */
  annotationId?: string;
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
  /** Chats this doc was shared into (used to sync ACL when members join). */
  sourceChatIds?: string[];
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

