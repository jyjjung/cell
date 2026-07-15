"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Clock, Check, MessageSquare, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavPageHeader, FeedCard } from '@/components/ui/page-layout';
import { formatAppDateTime, getAppLocale, getStatusLabel } from '@/lib/formatting';
import { notifyFeedbackChange } from '@/lib/feedback-notify';

/* ── Animation variants ─────────────────────────────────── */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ── Status helpers ──────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { icon: React.ElementType; classes: string }> = {
  completed: { icon: Check, classes: 'bg-success/10 text-success' },
  'not-possible': { icon: XCircle, classes: 'bg-destructive/10 text-destructive' },
  'in-progress': { icon: Loader2, classes: 'bg-muted text-primary' },
  pending: { icon: Clock, classes: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status, locale }: { status: string; locale: 'en' | 'ko' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-micro-label font-medium ${cfg.classes}`}>
      <Icon className={`spinner-standard w-3 h-3 ${status === 'in-progress' ? 'animate-spin' : ''}`} />
      {getStatusLabel(status, locale)}
    </span>
  );
}

/* ── Changelogs ──────────────────────────────────────────── */

const changelogs = [
  {
    version: "v1.3.107",
    subtitle: "Poll lock closes voting",
    date: "July 15, 2026",
    changes: [
      "Locking a poll closes voting only — everyone can still see percentages and who voted",
      "Creators can lock or unlock voting when creating a poll or anytime afterward",
    ],
  },
  {
    version: "v1.3.106",
    subtitle: "Poll vote notifications",
    date: "July 15, 2026",
    changes: [
      "You’ll get a push notification when someone votes on a poll you created in chat",
    ],
  },
  {
    version: "v1.3.105",
    subtitle: "Lock poll results",
    date: "July 15, 2026",
    changes: [
      "Poll creators can lock results so others can’t see percentages or who voted",
      "Choose “Lock results” when creating a poll, or lock and unlock later from the poll",
      "The creator still sees full results while they stay locked for everyone else",
    ],
  },
  {
    version: "v1.3.104",
    subtitle: "Push notification repair",
    date: "July 15, 2026",
    changes: [
      "Automatically repairs push for opted-in users whose app still had an old notification handler (including chat)",
      "Opening the app rebinds this device’s push subscription to the current messaging service worker",
      "Profile “Fix push notifications” now reconnects immediately instead of only reloading",
      "Duty and other server reminders record whether the push was delivered",
    ],
  },


  {
    version: "v1.3.103",
    subtitle: "Group chat photos",
    date: "July 14, 2026",
    changes: [
      "Any member of a group chat can change or remove the group photo from chat settings",
    ],
  },
  {
    version: "v1.3.102",
    subtitle: "Group chat photo fix",
    date: "July 14, 2026",
    changes: [
      "Fixed changing the group chat photo from chat settings, especially on mobile",
      "Shows a clear error if a group photo upload fails or the file is invalid",
    ],
  },
  {
    version: "v1.3.101",
    subtitle: "Bible reader caching",
    date: "July 9, 2026",
    changes: [
      "Bible chapters now cache only after you open them instead of preloading the whole Bible in the background",
      "Bible reader caching is lighter on server runtime while keeping reopened chapters fast",
    ],
  },
  {
    version: "v1.3.100",
    subtitle: "Bible text refresh",
    date: "Early-July 2026",
    changes: [
      "Updated Bible passage caching so corrected verse text refreshes after app updates",
    ],
  },
  {
    version: "v1.3.99",
    subtitle: "Bible verse text fix",
    date: "Early-July 2026",
    changes: [
      "Fixed a missing space in Proverbs 7:1 in the Bible reader text",
    ],
  },
  {
    version: "v1.3.98",
    subtitle: "Bible popup picker",
    date: "Early-July 2026",
    changes: [
      "Tapping outside the Bible popup plan assignment picker now closes it",
    ],
  },
  {
    version: "v1.3.97",
    subtitle: "Bible popup progress bar",
    date: "Early-July 2026",
    changes: [
      "Duplicate chapter progress in the Bible popup now keeps the primary progress bar style at 100% (2 of 2 complete), matching the partial-read appearance",
    ],
  },
  {
    version: "v1.3.96",
    subtitle: "Bible popup picker",
    date: "Early-July 2026",
    changes: [
      "The Bible popup plan assignment picker closes automatically when you open a passage from the plan or mark an assignment complete",
    ],
  },
  {
    version: "v1.3.95",
    subtitle: "Bible popup progress bar",
    date: "Early-July 2026",
    changes: [
      "Bible popup mark button shows a primary progress fill for duplicate chapters (e.g. 1 of 2 read), with base styling when unread and full primary when complete",
    ],
  },
  {
    version: "v1.3.94",
    subtitle: "Bible popup button colors",
    date: "Early-July 2026",
    changes: [
      "Bible popup mark button uses base styling when unread and primary styling once any plan assignment is marked",
    ],
  },
  {
    version: "v1.3.93",
    subtitle: "Bible popup layout",
    date: "Early-July 2026",
    changes: [
      "Mark chapter as read stays pinned to the bottom of the Bible popup, with no cancel button on the assignment picker",
    ],
  },
  {
    version: "v1.3.92",
    subtitle: "Bible popup progress",
    date: "Early-July 2026",
    changes: [
      "The Bible popup mark button turns green when a chapter is already complete",
      "For chapters that appear more than once in your plan, the button fill reflects how much of that chapter you have read",
    ],
  },
  {
    version: "v1.3.91",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Setlist viewer now matches light mode with readable controls, song chips, and reference player styling",
    ],
  },
  {
    version: "v1.3.90",
    subtitle: "Bible popup plan status",
    date: "Early-July 2026",
    changes: [
      "When a chapter appears more than once in your reading plan, the Bible popup now shows whether each plan assignment is already marked complete",
      "You can mark or unmark plan assignments directly from the Bible popup — tap an assignment row, or use Unmark as read for single-assignment chapters",
      "The plan assignment picker only appears after you tap Mark chapter as read (or Chapter complete for duplicate chapters)",
    ],
  },
  {
    version: "v1.3.89",
    subtitle: "Home page stability",
    date: "Early-July 2026",
    changes: [
      "Fixed a dashboard load type-safety issue so the home page waits for your signed-in profile before rendering",
    ],
  },
  {
    version: "v1.3.88",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "The Worship page now uses the same full setlist viewer as chat, with trackpad scrolling to pan and pinch to zoom",
    ],
  },
  {
    version: "v1.3.87",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Cleaned up a viewer initialization call to improve reliability when opening from chat",
    ],
  },
  {
    version: "v1.3.86",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Setlist viewer in chat now pans with macOS trackpad scroll instead of zooming",
      "Pinch/trackpad zoom behavior stays enabled for chord sheet zooming",
    ],
  },
  {
    version: "v1.3.85",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Each song title bar now sits directly above its own chart and below the previous one",
      "Setlist titles are rendered in the content flow for simpler spacing between songs",
    ],
  },
  {
    version: "v1.3.77",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Restored natural pinch-zoom and panning across the full setlist in chat",
      "Song titles stay readable at a fixed size while chord sheets zoom",
    ],
  },
  {
    version: "v1.3.76",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Song titles stay fixed at normal size while you zoom chord sheets",
      "Scrolling uses native vertical scroll; zoom only applies to the chart images",
    ],
  },
  {
    version: "v1.3.75",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Setlist viewer no longer lets you pan into empty black space around chord sheets",
      "The scroll area now matches the actual sheet width and stays clamped to the content edges",
    ],
  },
  {
    version: "v1.3.74",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Chat setlist viewer now uses natural pinch-zoom and free panning in all directions",
      "Reference track Listen buttons are back on each song in the setlist viewer",
      "Song chips at the bottom jump you to any song while keeping the full scrollable setlist",
    ],
  },
  {
    version: "v1.3.73",
    subtitle: "Setlist viewer",
    date: "Early-July 2026",
    changes: [
      "Setlists opened from chat now show all chord sheets on one scrollable page",
      "Pinch, zoom buttons, and scroll let you move around the full setlist while practicing",
    ],
  },
  {
    version: "v1.3.72",
    subtitle: "Chat & security",
    date: "Early-July 2026",
    changes: [
      "Deleted chat messages now show clear placeholders like “This message has been deleted” or “This image has been deleted”",
      "Shared rosters, songs, events, and other attachments show a deleted notice when the original item is removed",
      "Push notifications and admin actions require proper sign-in",
      "Profile and notification permissions are tighter in Firestore security rules",
    ],
  },
  {
    version: "v1.3.71",
    subtitle: "Security & reliability",
    date: "Early-July 2026",
    changes: [
      "Scheduled announcements now go out on their chosen day via the morning reminder job",
      "Admin role access syncs correctly with Firestore permissions",
      "Tighter notification and chat file upload security rules",
      "Cleaning days in use on the roster can no longer be deleted",
      "Invalid invite signups redirect to the pending-approval screen",
    ],
  },
  {
    version: "v1.3.70",
    subtitle: "Safer invites",
    date: "Early-July 2026",
    changes: [
      "Invite links are now single-use, expire after 7 days, and can be locked to one email",
      "Invites are redeemed on the server instead of auto-approving anyone with the link",
    ],
  },
  {
    version: "v1.3.69",
    date: "Early-July 2026",
    changes: [
      "The Admin role now grants admin access, matching the existing Leader role behavior",
    ],
  },
  {
    version: "v1.3.68",
    subtitle: "Invites & signup alerts",
    date: "Early-July 2026",
    changes: [
      "Admins receive a notification when someone signs up and is waiting for approval",
      "Invite button on Admin → Users and Members to create signup links with optional roles",
      "Invite links can be shown as a QR code to scan or download",
    ],
  },
  {
    version: "v1.3.67",
    subtitle: "Worship & duty reminders",
    date: "Early-July 2026",
    changes: [
      "Worship roster assignments now send push notifications when you're added to a role, including Keys",
      "Daily duty reminders now include same-day alerts for QT, cleaning, and worship team duties",
      "Birthday push reminders now read Firestore event dates correctly and match birthdays in the community timezone",
    ],
  },
  {
    version: "v1.3.66",
    subtitle: "Icon polish",
    date: "Early-July 2026",
    changes: [
      "The sidebar toggle now uses a clearer open/close icon and stays visible in the header so you can collapse the sidebar on desktop.",
      "Header and sidebar navigation icons now share consistent sizing and styling with the rest of the app chrome.",
    ],
  },
  {
    version: "v1.3.65",
    subtitle: "Bible popup selection",
    date: "Late-June 2026",
    changes: [
      "When a chapter appears multiple times in your reading plan, the Bible popup now asks which assignment to mark complete instead of checking off all matches.",
    ],
  },
  {
    version: "v1.3.64",
    subtitle: "Bible popup progress",
    date: "Late-June 2026",
    changes: [
      "Marking a chapter complete in the Bible popup now checks off only the earliest matching plan passage instead of every repeated occurrence.",
    ],
  },
  {
    version: "v1.3.63",
    date: "Late-June 2026",
    changes: [
      "Renamed Custom rosters to Other rosters",
    ],
  },
  {
    version: "v1.3.62",
    date: "Late-June 2026",
    changes: [
      "Custom rosters now show as an upcoming/past list instead of a month grid",
      "Editors add or update entries from a dialog on each roster page",
    ],
  },
  {
    version: "v1.3.61",
    subtitle: "Custom rosters",
    date: "Late-June 2026",
    changes: [
      "Admins can create custom rosters with their own fields (name, member, or text)",
      "Control who can view and edit each roster by role or member",
      "Custom rosters appear on the Schedule tab, dashboard, and Apps",
      "Fixed community progress being cleared when a member had no bible checklist yet",
    ],
  },
  {
    version: "v1.3.60",
    date: "Late-June 2026",
    changes: [
      "Fixed chat song picker showing no results when attaching a song from the + menu",
    ],
  },
  {
    version: "v1.3.59",
    subtitle: "New EM logo",
    date: "Late-June 2026",
    changes: [
      "Updated favicon, app icon, and home screen tiles to the new EM logo",
      "Icons refresh for all users, including installed PWAs",
    ],
  },
  {
    version: "v1.3.58",
    subtitle: "Look, layout & performance",
    date: "Late-June 2026",
    changes: [
      "New unified accent themes on Profile → Look — saved to your account and sync across devices",
      "Light, dark, and system mode stay on this device only (header toggle)",
      "Faster loading with shared data providers — fewer duplicate Firestore listeners across the app",
      "Dashboard, chat, bible reader, and command menu layout polish",
      "Landing, How it works, and Privacy pages rewritten for members",
      "Halos updated; legacy achievements removed",
      "Chat polls and attachment menu; slash commands removed",
      "Fixed dashboard permission errors for custom rosters",
      "Fixed profile page crash when switching tabs",
    ],
  },
  {
    version: "v1.3.57",
    date: "Mid-June 2026",
    changes: [
      "Fixed read receipts jumping between messages in chat",
    ],
  },
  {
    version: "v1.3.56",
    subtitle: "Group Chat Photos",
    date: "Mid-June 2026",
    changes: [
      "Group photo changes now appear as centered system lines in chat, like deleted messages",
    ],
  },
  {
    version: "v1.3.55",
    subtitle: "Group Chat Photos",
    date: "Mid-June 2026",
    changes: [
      "Any group member can change the group chat photo from chat settings",
      "Changing the photo posts a message like \"Alex changed the group chat picture\"",
      "Group photos are cached for faster loading and offline use",
    ],
  },
  {
    version: "v1.3.54",
    subtitle: "Birthday Reminders",
    date: "Mid-June 2026",
    changes: [
      "Fixed birthday push reminders — birthdays now match by month and day every year, not just the stored birth year",
      "Birthday notifications use a clearer title and message on the day",
    ],
  },
  {
    version: "v1.3.53",
    subtitle: "Prayer Requests",
    date: "Mid-June 2026",
    changes: [
      "You can edit or delete your own prayer requests after submitting",
      "Shepherd Claire gets push notifications and sidebar badges for new requests",
    ],
  },
  {
    version: "v1.3.52",
    subtitle: "Prayer Requests",
    date: "Mid-June 2026",
    changes: [
      "New Prayer Requests page — share needs privately with Shepherd Claire",
      "Anonymous submissions are the default; only Claire and you can see your request",
      "Dashboard button and sidebar link to submit a prayer request",
    ],
  },
  {
    version: "v1.3.51",
    subtitle: "Avatar Curator",
    date: "Mid-June 2026",
    changes: [
      "Curator account can edit any member's profile photo from their member page",
      "Curator can lock or unlock whether a member may change their own photo (unlocked by default)",
    ],
  },
  {
    version: "v1.3.50",
    subtitle: "Profile Photo Fix",
    date: "Mid-June 2026",
    changes: [
      "Fixed broken profile photos when the stored image file was missing from storage",
      "Uploading a new photo no longer deletes your old one until the new upload succeeds",
      "Avatars fall back to your pixel character if a photo fails to load",
    ],
  },
  {
    version: "v1.3.49",
    subtitle: "Members & Progress Sync",
    date: "Mid-June 2026",
    changes: [
      "Fixed members and leaderboard showing only yourself on new devices",
      "Profile photos and halos refresh from the server when you open the app",
      "Stopped partial offline cache from being mistaken for the full member list",
    ],
  },
  {
    version: "v1.3.48",
    subtitle: "New Device & Cache Fixes",
    date: "Mid-June 2026",
    changes: [
      "Fixed empty members, resources, and worship data on new devices and fresh sign-ins",
      "Cached directories now wait for sign-in and retry from the server instead of sticking on empty results",
      "Added Firestore and storage rules for worship, community links, and media uploads",
    ],
  },
  {
    version: "v1.3.47",
    subtitle: "Profile & Chat Fixes",
    date: "Mid-June 2026",
    changes: [
      "Fixed creating new DMs and group chats when the chat didn't exist yet",
      "Profile photos and equipped halos now update across chats, members, and the leaderboard without waiting on stale cache",
      "Avatar initials and uploaded photos render more reliably when profile data is incomplete",
    ],
  },
  {
    version: "v1.3.46",
    subtitle: "Leaderboard Fix",
    date: "Mid-June 2026",
    changes: [
      "Fixed the community progress leaderboard showing no data after the read-reduction update",
      "Leaderboard now refreshes on open and no longer caches an empty result",
    ],
  },
  {
    version: "v1.3.45",
    subtitle: "Chat Fix",
    date: "Mid-June 2026",
    changes: [
      "Fixed chat messages not loading or sending due to Firestore membership checks on the wrong document",
      "Added thread message security rules and support for image-only and special message types",
    ],
  },
  {
    version: "v1.3.45",
    date: "Early-July 2026",
    changes: [
      "Fixed sessions appearing to log out when leaving a page while your profile was still syncing",
      "Auth now keeps your Firebase session during brief Firestore cache misses instead of signing you out",
    ],
  },
  {
    version: "v1.3.44",
    subtitle: "Stability Fix",
    date: "Mid-June 2026",
    changes: [
      "Fixed a crash on app load caused by Bible checklist sync running before it was initialized",
      "Hardened cached notifications so timestamps and read state no longer break the dashboard",
      "YouTube reference playlist now loads only when you start listening, not on every page",
    ],
  },
  {
    version: "v1.3.43",
    subtitle: "Faster Loads",
    date: "Mid-June 2026",
    changes: [
      "Chat loads only the latest messages first — scroll up for older history",
      "Users, events, notifications, and announcements are cached on your device to cut repeat Firestore reads",
      "Leaderboard and member profiles use shared community progress instead of loading every private checklist",
      "Dashboard custom rosters use one query instead of many live listeners",
      "Feedback suggestions list is capped to the 50 most recent entries",
    ],
  },
  {
    version: "v1.3.42",
    subtitle: "Chat Input Keyboard Behavior",
    date: "Mid-June 2026",
    changes: [
      "Desktop chat now sends on Enter while Shift+Enter inserts a new line",
      "Mobile/on-screen keyboards keep Return as a line break and use the send button to post",
    ],
  },
  {
    version: "v1.3.41",
    subtitle: "Privacy & How It Works",
    date: "Mid-June 2026",
    changes: [
      "Privacy Policy rewritten with clearer sections, data table, and your rights",
      "How It Works page updated with getting-started steps, notifications, and feedback guides",
    ],
  },
  {
    version: "v1.3.42",
    date: "Early-July 2026",
    changes: [
      "New users who have not sent a prayer request see a prompt on site open with a link to the prayer page",
      "Don't ask again hides the prayer request prompt for your account",
    ],
  },
  {
    version: "v1.3.41",
    date: "Early-July 2026",
    changes: [
      "Today's QT on the home dashboard is now a compact section instead of a tall card",
      "Fixed sessions dropping when leaving a page due to a brief profile sync hiccup",
    ],
  },
  {
    version: "v1.3.40",
    date: "Mid-June 2026",
    changes: [
      "Admins can mark feedback as Not Possible when a suggestion cannot be implemented",
    ],
  },
  {
    version: "v1.3.39",
    subtitle: "Halo Fix, Lighting Role & Notifications",
    date: "Mid-June 2026",
    changes: [
      "Equipped avatar halos now stay saved — your manual halo choice is no longer overwritten on the home screen",
      "Added Lighting to the worship roster with a dedicated slot on new and existing rosters",
      "Push notifications for feedback submissions, status updates, and admin replies",
      "Day-of push reminders when you have an event scheduled for today",
    ],
  },
  {
    version: "v1.3.38",
    date: "Mid-June 2026",
    changes: [
      "Duty reminders now catch up if a roster is published late, so you still get a heads-up before serving",
      "Fixed server-side Firebase Admin setup for cron jobs and API routes",
    ],
  },
  {
    version: "v1.3.38",
    date: "Early-July 2026",
    changes: [
      "Home dashboard now shows a Today's QT widget with the topic, passage, and sharer",
      "QT passages open the Bible reader when tapped, including spaced-out references like \"J o e l 1 : 1 - 2 0\"",
    ],
  },
  {
    version: "v1.3.37",
    date: "Mid-June 2026",
    changes: [
      "Push notifications now remind you one day and one week before QT, cleaning, or worship team duty",
    ],
  },
  {
    version: "v1.3.36",
    date: "Mid-June 2026",
    changes: [
      "Deleted chat messages now show who removed them instead of disappearing",
      "Chat list previews update to \"deleted a message.\" when the last message is deleted",
    ],
  },
  {
    version: "v1.3.35",
    date: "Early-June 2026",
    changes: [
      "Chat setlist widgets have a Playlist button that queues reference tracks and keeps playing in the background",
      "Removed message-count achievements; feedback stats still load from your profile",
    ],
  },
  {
    version: "v1.3.34",
    date: "Early-June 2026",
    changes: [
      "Reaction popover and pills are easier to read with clearer text and background contrast",
    ],
  },
  {
    version: "v1.3.33",
    date: "Early-June 2026",
    changes: [
      "Setlist songs can have multiple YouTube reference links, each with an optional note (e.g. For intro only)",
    ],
  },
  {
    version: "v1.3.32",
    date: "Early-June 2026",
    changes: [
      "Listen button moved next to chart viewer navigation with a working play/pause scrubber panel",
    ],
  },
  {
    version: "v1.3.31",
    date: "Early-June 2026",
    changes: [
      "Deleted messages no longer show a placeholder in chat",
      "Setlist reference tracks use a Listen button that opens the audio player on tap",
    ],
  },
  {
    version: "v1.3.30",
    date: "Early-June 2026",
    changes: [
      "Worship setlist cards in chat fit narrow screens without clipping",
      "Deleted message notices stay visible and no longer get covered by nearby messages",
    ],
  },
  {
    version: "v1.3.29",
    date: "Early-June 2026",
    changes: [
      "Setlist reference player shows the YouTube video title instead of a generic label",
    ],
  },
  {
    version: "v1.3.28",
    date: "Early-June 2026",
    changes: [
      "Reference track player stays expanded at the bottom of the setlist chart viewer",
    ],
  },
  {
    version: "v1.3.27",
    date: "Early-June 2026",
    changes: [
      "Reference tracks in the setlist viewer now use an audio-style player with play/pause, seek slider, and collapse",
    ],
  },
  {
    version: "v1.3.26",
    date: "Early-June 2026",
    changes: [
      "Setlist chart viewer in chat now shows YouTube reference tracks for each song",
    ],
  },
  {
    version: "v1.3.25",
    subtitle: "Setlist Song Options",
    date: "Early-June 2026",
    changes: [
      "Add YouTube reference tracks per song when building a setlist",
      "Upload chord sheets while adding songs to a setlist",
      "Choose which chart pages to use when a key has multiple sheets",
    ],
  },
  {
    version: "v1.3.24",
    subtitle: "Chat Links & Shared Media",
    date: "Early-June 2026",
    changes: [
      "Links tab in each chat — browse URLs shared in messages with favicons and sender info",
      "All Photos and All Links pages on the chat list — see shared media across every conversation",
      "Fixed scrolling on the global photos and links pages",
    ],
  },
  {
    version: "v1.3.23",
    subtitle: "Smoother Chat Scrolling",
    date: "Early-June 2026",
    changes: [
      "Chat scrolling feels smoother — fewer unnecessary re-renders and lighter message bubbles",
      "YouTube links show a thumbnail until you tap to play, instead of loading embeds for every message",
      "Reaction and reply controls stay visible on every message",
    ],
  },
  {
    version: "v1.3.22",
    subtitle: "Chat Photos & Performance",
    date: "Early-June 2026",
    changes: [
      "Photos tab in each chat — browse shared images in a grid; add photos with a dedicated button",
      "Thread replies also appear in the main chat with a link back to the full thread",
      "Names show last initials everywhere (e.g. Jane D.) in chats, rosters, and widgets",
      "Much lower Firestore usage — one shared users list, lazy slash commands, targeted summary loads, no typing writes",
      "Full chat history caches on device for offline access",
    ],
  },
  {
    version: "v1.3.21",
    subtitle: "Chat Photo Viewer",
    date: "Early-June 2026",
    changes: [
      "Tap a chat photo to browse all images in the conversation — swipe left or right to move between them",
      "Fullscreen viewer toolbar stays visible and respects the notch on mobile",
      "Zoom out is capped at fit-to-screen so photos never shrink with empty bars on the sides",
    ],
  },
  {
    version: "v1.3.20",
    subtitle: "Multi-Photo Chat",
    date: "Early-June 2026",
    changes: [
      "Send multiple photos at once in chat — select several images from the picker and each is posted as its own message",
    ],
  },
  {
    version: "v1.3.19",
    subtitle: "Faster Desktop Load",
    date: "Late-May 2026",
    changes: [
      "Home and app shell load faster on desktop — dashboard and wallpaper load after the first paint",
      "Chat and notification listeners start only after you sign in",
      "All appearance fonts remain available immediately when changing typography",
      "Updated Vercel Speed Insights for more reliable performance data",
    ],
  },
  {
    version: "v1.3.18",
    subtitle: "Readings Widget Fix",
    date: "Late-May 2026",
    changes: [
      "Pace to finish stats on My Readings no longer replay their entry animation when checklist data updates",
    ],
  },
  {
    version: "v1.3.17",
    subtitle: "Speed & Bible Preferences",
    date: "Late-May 2026",
    changes: [
      "Bible popup and passage viewer remember your KRV or ESV choice and sync it to your account",
      "Chat messages resync when you return to the app; fewer duplicate listeners and missed updates",
      "Faster first paint — the app shell loads sooner and heavy UI is deferred",
      "Bible passages, chat history, and avatars cache more aggressively for offline use",
    ],
  },
  {
    version: "v1.3.16",
    subtitle: "Readings Stability",
    date: "Late-May 2026",
    changes: [
      "My Readings no longer reloads when your profile or achievements update in the background",
      "Plan tab shows a loading skeleton instead of a blank flash while the reading plan loads",
      "Fixed avatar photo cleanup on profile when replacing an uploaded photo",
    ],
  },
  {
    version: "v1.3.15",
    subtitle: "Look & Profile Polish",
    date: "Late-May 2026",
    changes: [
      "Profile Settings buttons and controls scale with your website font size",
      "Appearance preferences — colors, fonts, glass, theme, and background — sync to your account",
      "Original lake scenic wallpapers restored; backgrounds cache on device after first load",
      "Fixed a crash when prefetching media in the background",
    ],
  },
  {
    version: "v1.3.11",
    subtitle: "Typography & Glass Polish",
    date: "Late-May 2026",
    changes: [
      "Website and Bible font size labels are clearer; website font size now scales the whole UI correctly",
      "18 font choices (sans, serif, mono) including Geist, Literata, Merriweather, JetBrains Mono, and more",
      "Glass mode uses clean solid borders instead of gradient-style outlines",
    ],
  },
  {
    version: "v1.3.10",
    subtitle: "Disable Glass Option",
    date: "Late-May 2026",
    changes: [
      "Turn off frosted glass effects in Profile → Look for solid card and panel backgrounds",
      "Glass preference syncs to your account across devices",
    ],
  },
  {
    version: "v1.3.9",
    subtitle: "Look & Typography",
    date: "Late-May 2026",
    changes: [
      "Simplified color palette picker in Look — compact swatches and a segmented background control",
      "Choose website and Bible font family (Sans, Serif, Mono) and size (S–XL) from Profile → Look",
      "Typography preferences sync to your account and apply across the app and Bible readers",
    ],
  },
  {
    version: "v1.3.8",
    subtitle: "Profile Tab Polish",
    date: "Late-May 2026",
    changes: [
      "Profile card and avatar editor now live only on the Profile tab — other tabs stay focused",
      "Larger avatar with a clear Edit Avatar button; tap the picture or button to customize",
      "Unlocked halos are shown on the Profile tab so you can preview and equip them in one place",
    ],
  },
  {
    version: "v1.3.7",
    subtitle: "Profile Bottom Tabs",
    date: "Late-May 2026",
    changes: [
      "Profile is now split into four tabs — Profile, Rewards, Look, and Settings — with a bottom tab bar",
      "Your avatar stays pinned at the top; each tab shows only its section so the page is easier to scan",
    ],
  },
  {
    version: "v1.3.6",
    subtitle: "Color Style Options",
    date: "Late-May 2026",
    changes: [
      "Choose from 16 color palettes in Profile — Monochrome, Azure, Forest, Rose, and more",
      "Pick a background mode: Scenic lake wallpaper, Minimal solid surface, or soft Gradient",
      "Your color and background choices sync to your account across devices",
    ],
  },
  {
    version: "v1.3.5",
    subtitle: "Bible Popup Readability Tuning",
    date: "Late-May 2026",
    changes: [
      "Increased Bible popup body text readability with a subtle paragraph size bump",
      "Fine-tuned the size back down after review to keep the reading view balanced on mobile and desktop",
    ],
  },
  {
    version: "v1.3.4",
    subtitle: "Header Button Contrast",
    date: "Late-May 2026",
    changes: [
      "Fixed unreadable header action labels on Worship Portal and Links by matching the standard glass header button style",
      "Added a solid primary button variant for form submit actions where high-contrast fills are needed",
    ],
  },
  {
    version: "v1.3.3",
    subtitle: "Achievements, Halo Cosmetics & UI Polish",
    date: "Late-May 2026",
    changes: [
      "Added hidden achievements across Bible reading, chat, feedback, and dashboard activity with unlock notifications",
      "Introduced tiered avatar halo cosmetics (12 styles) equippable from your own profile settings, visible on avatars app-wide",
      "Added a subtle daily “Click me!” dashboard button that counts toward dedicated achievements",
      "Improved light-mode text contrast and unified glass styling across pages; profile pictures are now consistently round",
      "Community progress and member profiles show unlocked achievements only; cosmetics picker and locked list stay on your profile",
      "Expanded Bible/feedback/click achievement tiers and streamlined chat milestones to fewer, meaningful steps",
    ],
  },
  {
    version: "v1.3.2",
    subtitle: "Profile & Chat Roster Refinements",
    date: "Late-May 2026",
    changes: [
      "Refreshed profile settings surfaces to use shared glass-card and glass-thin styling for visual consistency",
      "Reworked worship roster chat summary into a compact table layout and improved name formatting readability",
      "Added/updated translation dictionary entries for new profile and roster summary copy in English and Korean",
    ],
  },
  {
    version: "v1.3.1",
    subtitle: "UX Polish & Glass Tuning",
    date: "Late-May 2026",
    changes: [
      "Added suggestion lifecycle timeline milestones (posted, response left, completed) to Feedback",
      "Updated QT roster editor to allow blank fields and simplified the action label to Save",
      "Removed top-edge highlight artifacts and body margin gap that caused thin white lines",
      "Retuned global glass transparency/blur for stronger consistency across light and dark themes without white edge glow",
    ],
  },
  {
    version: "v1.3.0",
    subtitle: "Liquid Glass & Admin Refresh",
    date: "Late-May 2026",
    changes: [
      "Rolled out a consistent liquid-glass visual system across headers, cards, dialogs, forms, tabs, and table surfaces in light and dark mode",
      "Unified page shell spacing, header rhythm, and mobile top-bar behavior to remove cross-page alignment drift",
      "Refreshed admin area with compact Notion-style table density and standardized admin page layouts/navigation placement",
      "Improved schedule and readings flows, including corrected pace-to-finish calculations and aligned bottom navigation icon centering",
    ],
  },
  {
    version: "v1.2.1",
    date: "Mid-May 2026",
    changes: [
      "Fixed M'Cheyne duplicate passage checking with date-scoped keys and auto-migrated legacy keys",
      "Corrected typo in Genesis 37:18 within engESV.xml",
    ],
  },
  {
    version: "v1.2.0",
    subtitle: "Chat & Performance Overhaul",
    date: "Early-May 2026",
    changes: [
      "Optimized chat with O(1) user lookups and enhanced reaction UI with detailed popovers",
      "Critical mobile performance fixes: Removed per-bubble Firestore listeners and reduced DOM density",
      "Extreme stability fixes: Removed background image priming and singleton subscriptions for global hooks",
      "Refactored components: Moved userMap to parent and TooltipProvider to layout to prevent crashes",
    ],
  },
  {
    version: "v1.1.2",
    date: "May 5, 2026",
    changes: [
      "Redesigned dashboard schedule and upcoming duties UI",
      "Modernized dashboard roster view and condensed layout",
      "Optimized Bible reading widget to show only past missed reading and single unread passage",
      "Restored standard font sizes in dashboard",
    ],
  },
  {
    version: "v1.1.1",
    subtitle: "Profiles & PWA",
    date: "Late-April 2026",
    changes: [
      "Added profile picture image upload and cropping support",
      "Implemented caching for profile pictures, chats, and worship setlists",
      "Added user settings to hide bible reading progress and removed 'member since' from public profile",
      "Simplified PWA config, fixed mobile zoom issues, and modernized profile pages",
    ],
  },
  {
    version: "v1.1.0",
    subtitle: "Notifications Revamp",
    date: "Mid-April 2026",
    changes: [
      "Switched header dropdown to a tabbed panel showing Notifications, Announcements, and Messages",
      "Cleanly removed redundant alerts section from sidebar and dashboard stats row",
      "Hardened push notification reliability with APNS priority headers and token pruning",
      "Fixed background notifications, app badging, and token accumulation issues on mobile",
      "Added breadcrumbs navigation for mobile screens",
    ],
  },
  {
    version: "v1.0.1",
    date: "Early-April 2026",
    changes: [
      "Fixed PDF rendering to support multi-page scrolling and added external link fallback",
      "Restricted PDF uploads for chord sheets and implemented message deletion in chat",
      "Fixed the global Plus button launcher to correctly open the command menu",
    ],
  },
];

type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

const exactDateOverridesByFirstChange: Record<string, string> = {
  "Fixed sessions appearing to log out when leaving a page while your profile was still syncing":
    "July 7, 2026",
  "New users who have not sent a prayer request see a prompt on site open with a link to the prayer page":
    "July 7, 2026",
  "Today's QT on the home dashboard is now a compact section instead of a tall card":
    "July 7, 2026",
  "Home dashboard now shows a Today's QT widget with the topic, passage, and sharer":
    "July 7, 2026",
};

function getExactChangelogDate(log: ChangelogEntry): string {
  if (!/^(Early|Mid|Late)-/.test(log.date)) return log.date;

  const firstChange = log.changes[0];
  if (firstChange && exactDateOverridesByFirstChange[firstChange]) {
    return exactDateOverridesByFirstChange[firstChange];
  }

  switch (log.version) {
    case 'v1.3.100':
    case 'v1.3.99':
    case 'v1.3.98':
    case 'v1.3.97':
    case 'v1.3.96':
    case 'v1.3.95':
    case 'v1.3.94':
    case 'v1.3.93':
    case 'v1.3.92':
    case 'v1.3.91':
    case 'v1.3.90':
      return 'July 9, 2026';
    case 'v1.3.89':
    case 'v1.3.88':
    case 'v1.3.87':
    case 'v1.3.86':
      return 'July 8, 2026';
    case 'v1.3.85':
    case 'v1.3.77':
    case 'v1.3.76':
    case 'v1.3.75':
    case 'v1.3.74':
    case 'v1.3.73':
    case 'v1.3.72':
    case 'v1.3.71':
    case 'v1.3.70':
    case 'v1.3.69':
    case 'v1.3.68':
      return 'July 7, 2026';
    case 'v1.3.67':
      return 'July 4, 2026';
    case 'v1.3.66':
    case 'v1.3.65':
    case 'v1.3.64':
      return 'July 1, 2026';
    case 'v1.3.63':
    case 'v1.3.62':
    case 'v1.3.61':
      return 'June 28, 2026';
    case 'v1.3.60':
      return 'June 27, 2026';
    case 'v1.3.59':
    case 'v1.3.58':
      return 'June 26, 2026';
    case 'v1.3.57':
    case 'v1.3.56':
    case 'v1.3.55':
    case 'v1.3.54':
    case 'v1.3.53':
    case 'v1.3.52':
    case 'v1.3.51':
      return 'June 21, 2026';
    case 'v1.3.50':
    case 'v1.3.49':
    case 'v1.3.48':
    case 'v1.3.47':
    case 'v1.3.46':
      return 'June 19, 2026';
    case 'v1.3.44':
    case 'v1.3.43':
      return 'June 18, 2026';
    case 'v1.3.42':
      return 'June 16, 2026';
    case 'v1.3.41':
    case 'v1.3.40':
    case 'v1.3.39':
      return 'June 15, 2026';
    case 'v1.3.38':
    case 'v1.3.37':
      return 'June 14, 2026';
    case 'v1.3.36':
      return 'June 13, 2026';
    case 'v1.3.35':
    case 'v1.3.34':
    case 'v1.3.33':
    case 'v1.3.32':
    case 'v1.3.31':
    case 'v1.3.30':
    case 'v1.3.29':
    case 'v1.3.28':
    case 'v1.3.27':
    case 'v1.3.26':
    case 'v1.3.25':
    case 'v1.3.24':
      return 'June 9, 2026';
    case 'v1.3.23':
    case 'v1.3.22':
    case 'v1.3.21':
    case 'v1.3.20':
      return 'June 7, 2026';
    case 'v1.3.19':
    case 'v1.3.18':
    case 'v1.3.17':
      return 'June 3, 2026';
    case 'v1.3.16':
    case 'v1.3.15':
    case 'v1.3.11':
    case 'v1.3.10':
    case 'v1.3.9':
    case 'v1.3.8':
    case 'v1.3.7':
    case 'v1.3.6':
      return 'May 31, 2026';
    case 'v1.3.5':
    case 'v1.3.4':
      return 'May 29, 2026';
    case 'v1.3.3':
    case 'v1.3.2':
    case 'v1.3.1':
    case 'v1.3.0':
      return 'May 28, 2026';
    case 'v1.2.1':
    case 'v1.2.0':
    case 'v1.1.1':
    case 'v1.1.0':
    case 'v1.0.1':
      return 'May 26, 2026';
    default:
      return log.date;
  }
}

/* ── Page ────────────────────────────────────────────────── */

export default function FeedbackPage() {
  const { currentUser, isAdmin } = useAuth();
  const locale = getAppLocale(currentUser?.preferredLanguage);
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('suggestions');

  /* ── Firestore listener ───────────────────────────────── */

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestionsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  /* ── Handlers ─────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'suggestions'), {
        text: suggestion,
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.firstName || 'Anonymous',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      void notifyFeedbackChange({
        action: 'submitted',
        suggestionId: docRef.id,
        previewText: suggestion.trim(),
      });
      toast({ title: "Success", description: "Suggestion submitted! Thank you." });
      setSuggestion('');
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit suggestion. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (item: any, newStatus: string) => {
    try {
      const payload: Record<string, any> = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'not-possible') {
        if (!item.completedAt) payload.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'suggestions', item.id), payload);
      void notifyFeedbackChange({
        action: 'status_updated',
        suggestionId: item.id,
        previewText: item.text,
        status: newStatus,
      });
      toast({ title: "Status Updated", description: "Feedback status has been updated." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleSaveNote = async (id: string) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), {
        adminNote: adminNoteText,
        respondedAt: adminNoteText.trim() ? serverTimestamp() : null,
      });
      const item = suggestionsList.find((s) => s.id === id);
      void notifyFeedbackChange({
        action: 'admin_note_updated',
        suggestionId: id,
        previewText: item?.text,
      });
      toast({ title: "Note Saved", description: "Admin response has been added." });
      setEditingNoteId(null);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save note." });
    }
  };

  /* ── Render ───────────────────────────────────────────── */

  return (
    <div className="page-container">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">

          <NavPageHeader />

          {/* Tabs */}
          <motion.div variants={fadeUp}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 h-10">
                <TabsTrigger value="suggestions" className="rounded-md text-sm font-medium">
                  Suggestions
                </TabsTrigger>
                <TabsTrigger value="changelog" className="rounded-md text-sm font-medium">
                  Changelog
                </TabsTrigger>
              </TabsList>

              {/* ─── Suggestions ─────────────────────────────── */}
              <TabsContent value="suggestions" className="space-y-4">
                {/* Submit form */}
                <FeedCard className="p-4">
                  <h2 className="mb-1 text-base font-semibold">Have an idea?</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    We&apos;re always looking to improve. Let us know what you&apos;d like to see!
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Textarea
                      placeholder="I think it would be great if..."
                      className="min-h-[120px] resize-none rounded-xl focus-visible:ring-primary/50"
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" variant="primary" disabled={!suggestion.trim() || isSubmitting} className="h-9 rounded-xl">
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Suggestion
                      </Button>
                    </div>
                  </form>
                </FeedCard>

                {/* Suggestion list */}
                {suggestionsList.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="px-1 text-sm font-semibold text-muted-foreground">Community Feedback</h3>

                    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                      {suggestionsList.map((item, index) => (
                        <FeedCard
                          key={item.id}
                          index={index}
                          className="p-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <p className="min-w-0 flex-1 text-sm font-medium">{item.text}</p>
                              {/* Status badge (admin = dropdown, user = static) */}
                              <div className="shrink-0">
                                {isAdmin ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="transition-opacity hover:opacity-80">
                                        <StatusBadge status={item.status} locale={locale} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                                      <DropdownMenuItem
                                        onClick={() => { setEditingNoteId(item.id); setAdminNoteText(item.adminNote || ''); }}
                                        className="text-xs font-bold rounded-lg cursor-pointer"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 mr-2" />
                                        {item.adminNote ? 'Edit Note' : 'Add Note'}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'pending')} className="text-xs font-bold rounded-lg cursor-pointer">
                                        <Clock className="w-3.5 h-3.5 mr-2" /> Mark Pending
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'in-progress')} className="text-xs font-bold rounded-lg cursor-pointer text-foreground focus:text-foreground focus:bg-muted">
                                        <Loader2 className="w-3.5 h-3.5 mr-2" /> Mark In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'completed')} className="text-xs font-bold rounded-lg cursor-pointer text-success focus:text-success focus:bg-success/10">
                                        <Check className="w-3.5 h-3.5 mr-2" /> Mark Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(item, 'not-possible')} className="text-xs font-bold rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <XCircle className="w-3.5 h-3.5 mr-2" /> Not Possible
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <StatusBadge status={item.status} locale={locale} />
                                )}
                              </div>
                            </div>

                            {/* Admin note (read-only) */}
                            {item.adminNote && editingNoteId !== item.id && (
                              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                                <div className="mb-1.5 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                  <span className="text-micro-label text-primary">Admin response</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{item.adminNote}</p>
                              </div>
                            )}

                            {/* Admin note (editing) */}
                            {editingNoteId === item.id && (
                              <div className="w-full space-y-2">
                                <Textarea
                                  value={adminNoteText}
                                  onChange={(e) => setAdminNoteText(e.target.value)}
                                  placeholder="Write an admin response..."
                                  className="min-h-[72px] text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                                  <Button size="sm" variant="primary" className="h-8 rounded-lg" onClick={() => handleSaveNote(item.id)}>Save Note</Button>
                                </div>
                              </div>
                            )}

                            {/* Timeline */}
                            <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                              <p className="mb-2 text-micro-label text-muted-foreground">Timeline</p>
                              <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                  <span>Posted</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.createdAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>Response left</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.respondedAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span>{item.status === 'not-possible' ? 'Closed' : 'Completed'}</span>
                                  <span className="text-foreground/90">{formatAppDateTime(item.completedAt?.toDate?.() ?? null, locale)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </FeedCard>
                      ))}
                    </motion.div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Changelog ───────────────────────────────── */}
              <TabsContent value="changelog">
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                  {changelogs.map((log, index) => (
                    <motion.div
                      key={index}
                      variants={fadeUp}
                      className="rounded-2xl border border-border/40 bg-card/60 p-4"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="text-base font-bold">{log.version}</h3>
                        {log.subtitle && (
                          <span className="text-xs font-semibold text-primary">{log.subtitle}</span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {getExactChangelogDate(log)}
                        </span>
                      </div>

                      <ul className="mt-2 space-y-1.5">
                        {log.changes.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 text-primary">•</span>
                            <span className="leading-relaxed">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>

      </motion.div>
    </div>
  );
}
