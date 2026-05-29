"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, FeedCard } from '@/components/ui/page-layout';
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Trophy,
  Sparkles,
  UserCircle,
  LayoutDashboard,
  Shield,
  Cloud,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={itemVariants} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="pl-0 sm:pl-12 text-muted-foreground leading-relaxed font-medium space-y-3">
        {children}
      </div>
    </motion.section>
  );
}

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="page-container max-w-4xl space-y-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        <motion.div variants={itemVariants}>
          <PageHeader
            title="How It Works"
            action={
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-9 rounded-xl font-bold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            }
          />
          <p className="text-muted-foreground font-medium mt-2 max-w-2xl">
            A quick guide to the em. portal—how the community stays synced, how progress is tracked, and
            how achievements and avatars fit together.
          </p>
        </motion.div>

        <FeedCard>
          <Section title="One Hub for the Community" icon={LayoutDashboard}>
            <p>
              After sign-in and approval, your dashboard brings together today&apos;s Bible reading, upcoming
              duties, QT and cleaning rosters, events, and shortcuts to chat and member tools. Everything
              updates in real time so you always see the same plan as the rest of the cell.
            </p>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Bible Reading Plan" icon={BookOpen}>
            <p>
              Follow the community M&apos;Cheyne-style plan on the checklist and full-plan views. Mark passages
              as you read; progress syncs to your profile and powers Bible-related achievements. Passages
              open in a built-in reader so you can read without leaving the app.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Date-scoped completion keys keep duplicate passages accurate across the year.</li>
              <li>Heatmaps and pace tools help you see how you&apos;re doing over time.</li>
              <li>Community Progress shows aggregate reading momentum (when members opt in).</li>
            </ul>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Circles & Communication" icon={MessageCircle}>
            <p>
              Ministry and fellowship groups chat in dedicated circles. Only members of a circle can read
              its messages. Reactions and read receipts stay scoped to active participation—when someone
              leaves, they no longer see new activity there.
            </p>
            <p>
              Push notifications (via installed PWA + FCM) alert you to important community messages when
              you enable them.
            </p>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Hidden Achievements" icon={Trophy}>
            <p>
              Beyond visible milestones, the app includes a large set of hidden achievements tied to Bible
              progress, chat, feedback, and exploration. On your own profile you can see descriptions and
              progress toward locked goals; on other members&apos; profiles you only see what they have already
              unlocked.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Bible tiers unlock as you complete larger percentages of the full plan.</li>
              <li>Chat, feedback, and dashboard activity unlock their own milestone tracks.</li>
              <li>Secret discoveries unlock when you visit certain parts of the app (QT, events, media, and more).</li>
            </ul>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Halo Cosmetics" icon={Sparkles}>
            <p>
              Each unlocked achievement counts toward cosmetic tiers. As you earn more, new halo styles
              unlock—from subtle bronze rings up through master-tier radiance with stronger glow and motion.
            </p>
            <p>
              Equip any unlocked halo from your profile settings. Others see your equipped halo on your
              avatar across the app; the picker and locked achievement list stay private to you.
            </p>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Recipe-Based Avatars" icon={UserCircle}>
            <p>
              Instead of uploading photos, you build a pixel avatar from a compact recipe (skin, hair,
              outfit, and similar options). The recipe is tiny text stored in your profile—efficient for
              hundreds of members and easy to render everywhere consistently.
            </p>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Service & Rosters" icon={Cloud}>
            <p>
              Cleaning schedules, QT sharing rotations, worship rosters, and event listings keep serving
              and gathering organized. Admins maintain rosters; members see what&apos;s coming on the dashboard
              and dedicated pages.
            </p>
          </Section>
        </FeedCard>

        <FeedCard>
          <Section title="Privacy & Hosting" icon={Shield}>
            <p>
              Access is gated by Firebase Authentication and Firestore rules. You control leaderboard
              visibility, and achievement details respect the unlocked-only display rule described above.
            </p>
            <p>
              The app runs on Vercel with Firebase on Google Cloud—free-tier friendly architecture
              (recipe avatars, denormalized chat data, optimistic UI) keeps the portal fast without
              unnecessary storage or read costs.
            </p>
            <p>
              <Link
                href="/privacy"
                className="text-primary font-bold hover:underline text-sm"
              >
                Read the full Privacy Policy →
              </Link>
            </p>
          </Section>
        </FeedCard>
      </motion.div>
    </div>
  );
}
