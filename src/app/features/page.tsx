"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PageHeader, FeedCard } from "@/components/ui/page-layout";
import {
  DocNav,
  DocSummary,
  DocSection,
  DocList,
  DocStepGrid,
  type DocNavItem,
} from "@/components/legal/doc-section";
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Trophy,
  Sparkles,
  UserCircle,
  LayoutDashboard,
  Shield,
  Bell,
  Calendar,
  ClipboardList,
  MessageSquarePlus,
} from "lucide-react";

const NAV: DocNavItem[] = [
  { id: "getting-started", label: "Getting started" },
  { id: "dashboard", label: "Dashboard" },
  { id: "bible", label: "Bible reading plan" },
  { id: "chat", label: "Circles & chat" },
  { id: "rosters", label: "Rosters & events" },
  { id: "notifications", label: "Notifications" },
  { id: "achievements", label: "Achievements" },
  { id: "halos", label: "Halo cosmetics" },
  { id: "avatars", label: "Avatars" },
  { id: "feedback", label: "Feedback" },
  { id: "privacy", label: "Privacy & trust" },
];

const GETTING_STARTED = [
  {
    title: "Create your account",
    description: "Sign up with a verified email. New accounts require admin approval before full access.",
  },
  {
    title: "Set up your profile",
    description: "Build your pixel avatar, pick a language, and optionally enable push notifications.",
  },
  {
    title: "Use the dashboard",
    description: "See today's reading, upcoming duties, events, and shortcuts to chat and tools.",
  },
  {
    title: "Stay in the loop",
    description: "Join circles, check rosters, and mark Bible passages as you read — everything syncs in real time.",
  },
];

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="page-container max-w-5xl space-y-8 pb-16">
      <PageHeader
        title="How It Works"
        description="A guide to the em. portal — community coordination, Bible progress, and member tools in one place."
        action={
          <Button variant="ghost" onClick={() => router.back()} className="h-9 rounded-xl font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <DocNav items={NAV} className="lg:sticky lg:top-24" />

        <div className="space-y-6">
          <DocSummary title="In short">
            <p>
              The em. portal is a private hub for our cell group. It combines a shared Bible reading plan,
              ministry rosters, event schedules, fellowship chat, and lightweight gamification — so everyone
              stays aligned without juggling separate spreadsheets and group chats.
            </p>
          </DocSummary>

          <FeedCard animate={false} className="space-y-10 p-5 sm:p-6">
            <DocSection id="getting-started" title="Getting started" icon={LayoutDashboard} index={0}>
              <DocStepGrid steps={GETTING_STARTED} />
            </DocSection>

            <DocSection id="dashboard" title="Dashboard" icon={LayoutDashboard} index={1}>
              <p>
                After sign-in, your home screen brings together what matters today: Bible reading progress,
                imminent duties (cleaning, QT, worship), upcoming events, and quick links to chat and member
                tools. Data updates in real time via Firebase, so you see the same plan as the rest of the
                cell.
              </p>
              <DocList
                items={[
                  <>Today&apos;s passages with one-tap completion checkboxes.</>,
                  <>Duty banners when you are serving today or tomorrow.</>,
                  <>Calendar and agenda widgets for the wider community schedule.</>,
                  <>Achievement progress and optional Community Progress leaderboard (opt-in).</>,
                ]}
              />
            </DocSection>

            <DocSection id="bible" title="Bible reading plan" icon={BookOpen} index={2}>
              <p>
                Follow the community M&apos;Cheyne-style plan on the checklist and full-plan views. Mark
                passages as you read; progress syncs to your profile and powers Bible-related achievements.
                Passages open in a built-in reader so you can read without leaving the app.
              </p>
              <DocList
                items={[
                  <>Date-scoped completion keys keep duplicate passages accurate across the year.</>,
                  <>Heatmaps and pace tools show how you are doing over time.</>,
                  <>Memorization tools help you track verses alongside the reading plan.</>,
                  <>Community Progress shows aggregate momentum when members opt in.</>,
                ]}
              />
            </DocSection>

            <DocSection id="chat" title="Circles & chat" icon={MessageCircle} index={3}>
              <p>
                Ministry and fellowship groups communicate in dedicated circles. Only members of a circle can
                read its messages. Reactions, threads, and read receipts stay scoped to active participation
                — when someone leaves, they no longer see new activity there.
              </p>
              <DocList
                items={[
                  <>Share events, setlists, rosters, and QT entries inline with slash commands.</>,
                  <>Photos and links have dedicated gallery views per circle.</>,
                  <>Deleted messages show a clear indicator instead of vanishing silently.</>,
                ]}
              />
            </DocSection>

            <DocSection id="rosters" title="Rosters & events" icon={Calendar} index={4}>
              <p>
                Cleaning schedules, QT sharing rotations, worship rosters (including roles like Lighting),
                custom rosters, and event listings keep serving and gathering organized. Admins maintain
                schedules; members see what is coming on the dashboard and dedicated pages.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: ClipboardList, label: "Cleaning & QT", detail: "Rotating duties with member assignments" },
                  { icon: Sparkles, label: "Worship", detail: "Per-service roster slots shared in chat" },
                  { icon: Calendar, label: "Events", detail: "Recurring and one-off gatherings with reminders" },
                ].map(({ icon: Icon, label, detail }) => (
                  <div
                    key={label}
                    className="flex gap-3 rounded-xl border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="notifications" title="Notifications" icon={Bell} index={5}>
              <p>
                Push notifications are optional and require your permission. On some devices you may need
                to install the app as a PWA (Add to Home Screen) first.
              </p>
              <DocList
                items={[
                  <>
                    <strong className="text-foreground">Chat:</strong> alerts for new messages in your circles.
                  </>,
                  <>
                    <strong className="text-foreground">Duty reminders:</strong> one week and one day before
                    cleaning, QT, or worship assignments.
                  </>,
                  <>
                    <strong className="text-foreground">Events:</strong> day-of reminders when you have
                    something scheduled.
                  </>,
                  <>
                    <strong className="text-foreground">Feedback:</strong> updates when your suggestion
                    receives a status change or admin reply.
                  </>,
                ]}
              />
              <p>Manage notifications anytime from your profile settings.</p>
            </DocSection>

            <DocSection id="achievements" title="Achievements" icon={Trophy} index={6}>
              <p>
                Beyond visible milestones, the app includes hidden achievements tied to Bible progress, chat,
                feedback, and exploration. On your own profile you can see descriptions and progress toward
                locked goals; on other members&apos; profiles you only see what they have already unlocked.
              </p>
              <DocList
                items={[
                  <>Bible tiers unlock as you complete larger percentages of the full plan.</>,
                  <>Chat, feedback, and dashboard activity unlock their own milestone tracks.</>,
                  <>Secret discoveries unlock when you visit certain parts of the app.</>,
                ]}
              />
            </DocSection>

            <DocSection id="halos" title="Halo cosmetics" icon={Sparkles} index={7}>
              <p>
                Each unlocked achievement counts toward cosmetic tiers. As you earn more, new halo styles
                unlock — from subtle bronze rings up through master-tier radiance with stronger glow and
                motion.
              </p>
              <p>
                Equip any unlocked halo from your profile. Your choice is saved to your account and shown on
                your avatar across the app. The full picker and locked achievement list stay private to you.
              </p>
            </DocSection>

            <DocSection id="avatars" title="Avatars" icon={UserCircle} index={8}>
              <p>
                Instead of uploading photos, you build a pixel avatar from a compact recipe (skin, hair,
                outfit, and similar options). The recipe is small text stored in your profile — efficient for
                hundreds of members and consistent everywhere avatars appear.
              </p>
            </DocSection>

            <DocSection id="feedback" title="Feedback" icon={MessageSquarePlus} index={9}>
              <p>
                Submit ideas and bug reports on the Feedback page. Admins can update status (Pending, In
                Progress, Completed, or Not Possible), leave a public response, and you receive a push
                notification when your item is updated.
              </p>
              <p>
                Changelog entries in the same tab document what has shipped with each release.
              </p>
            </DocSection>

            <DocSection id="privacy" title="Privacy & trust" icon={Shield} index={10}>
              <p>
                Access is gated by Firebase Authentication and Firestore security rules. You control
                leaderboard visibility, and achievement details follow the unlocked-only display rule.
                The app runs on Vercel with Firebase on Google Cloud.
              </p>
              <p>
                <Link href="/privacy" className="font-semibold text-primary hover:underline">
                  Read the full Privacy Policy →
                </Link>
              </p>
            </DocSection>
          </FeedCard>
        </div>
      </div>
    </div>
  );
}
