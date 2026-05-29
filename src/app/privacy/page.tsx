"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Fingerprint, Trophy } from 'lucide-react';
import { PageHeader, FeedCard } from '@/components/ui/page-layout';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="page-container max-w-4xl space-y-10">
      <PageHeader
        title="Privacy Policy"
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

      <p className="text-sm text-muted-foreground font-medium -mt-4">
        Last updated: May 2026
      </p>

      <div className="space-y-6 text-muted-foreground leading-relaxed font-medium">
        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                What We Collect
              </h2>
            </div>
            <p>
              The em. portal follows a minimal-collection approach. We store only what is needed to run
              the community app:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Account:</strong> verified email, name, approval status,
                and role assignments for access control.
              </li>
              <li>
                <strong className="text-foreground">Profile & avatar:</strong> a small recipe string that
                generates your pixel avatar (not a photo file), plus your chosen halo cosmetic tier when
                equipped.
              </li>
              <li>
                <strong className="text-foreground">Spiritual journey:</strong> Bible plan passage completion
                keys, memorization lists, and related progress used on your dashboard and profile.
              </li>
              <li>
                <strong className="text-foreground">Community activity:</strong> messages in circles you
                belong to, feedback you submit, and optional engagement counters (for example, dashboard
                interactions) used to compute achievements.
              </li>
              <li>
                <strong className="text-foreground">Achievements:</strong> secret-discovery keys you unlock
                by visiting certain areas of the app; visible milestones are derived from your activity
                and are not sold or shared for advertising.
              </li>
              <li>
                <strong className="text-foreground">Notifications:</strong> device push tokens if you enable
                alerts (requires installing the app as a PWA on some platforms).
              </li>
            </ul>
            <p>
              We do not sell, rent, or trade your personal information with third-party marketers.
            </p>
          </section>
        </FeedCard>

        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                What Others Can See
              </h2>
            </div>
            <p>
              Member profiles and Community Progress show <strong className="text-foreground">unlocked</strong>{' '}
              achievements only—not locked milestones or hidden requirements. Your equipped halo appears on
              your avatar wherever it is shown. Chat history is limited to participants in each circle.
            </p>
            <p>
              Secret achievements appear on your profile only after you discover them; we do not broadcast
              unlock notifications to the rest of the community.
            </p>
          </section>
        </FeedCard>

        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                Security & Access
              </h2>
            </div>
            <p>
              Sign-in is handled by <strong className="text-foreground">Firebase Authentication</strong>.
              Data access is enforced with <strong className="text-foreground">Firestore Security Rules</strong>{' '}
              so members can read and write only what their role and circle membership allow. When someone
              leaves a circle, they lose access to future messages in that space.
            </p>
          </section>
        </FeedCard>

        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                Infrastructure
              </h2>
            </div>
            <p>
              Data is stored on <strong className="text-foreground">Google Cloud (Firebase)</strong> and
              the app is delivered through the <strong className="text-foreground">Vercel</strong> network.
              Both providers maintain industry-standard security practices. Push alerts use{' '}
              <strong className="text-foreground">Firebase Cloud Messaging (FCM)</strong> when you opt in—
              we do not use it for background location or unrelated tracking.
            </p>
          </section>
        </FeedCard>

        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                Achievements & Cosmetics
              </h2>
            </div>
            <p>
              Achievement progress is calculated from your Bible plan completion, participation in chat and
              feedback, and similar in-app activity. Unlocking more achievements unlocks additional halo
              cosmetics you may equip on your own profile. This data stays within the community platform
              and is used solely to power your experience.
            </p>
          </section>
        </FeedCard>

        <FeedCard>
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">
                Your Choices
              </h2>
            </div>
            <p>
              You can hide yourself from the Community Progress leaderboard at any time in profile settings.
              Halo cosmetics and achievement details on your profile are under your control. For a data
              review or to request account removal, contact a community administrator.
            </p>
          </section>
        </FeedCard>
      </div>
    </div>
  );
}
