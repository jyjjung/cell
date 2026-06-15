"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Fingerprint,
  Bell,
  Cookie,
  Globe,
  FileText,
  Mail,
  Scale,
  Trash2,
} from "lucide-react";
import { PageHeader, FeedCard } from "@/components/ui/page-layout";
import {
  DocNav,
  DocSummary,
  DocSection,
  DocList,
  DocDataTable,
  type DocNavItem,
} from "@/components/legal/doc-section";

const NAV: DocNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "collection", label: "Information we collect" },
  { id: "use", label: "How we use information" },
  { id: "sharing", label: "Sharing & service providers" },
  { id: "storage", label: "Cookies & device storage" },
  { id: "notifications", label: "Push notifications" },
  { id: "visibility", label: "What others can see" },
  { id: "retention", label: "Data retention" },
  { id: "rights", label: "Your choices & rights" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "transfers", label: "International transfers" },
  { id: "changes", label: "Policy updates" },
  { id: "contact", label: "Contact" },
];

const COLLECTION_ROWS = [
  {
    category: "Account",
    examples: "Email, name, approval status, role assignments",
    purpose: "Authentication, access control, and community membership",
  },
  {
    category: "Profile",
    examples: "Avatar recipe, equipped halo, language and appearance preferences",
    purpose: "Personalization across the app",
  },
  {
    category: "Spiritual progress",
    examples: "Bible passage completions, memorization lists, reading preferences",
    purpose: "Checklists, dashboards, and achievement progress",
  },
  {
    category: "Community activity",
    examples: "Chat messages, reactions, feedback submissions, roster assignments",
    purpose: "Ministry coordination and communication",
  },
  {
    category: "Achievements",
    examples: "Unlocked milestones and secret-discovery keys",
    purpose: "Rewards, profile display, and halo cosmetics",
  },
  {
    category: "Device",
    examples: "FCM push tokens, optional local cache for chat and UI settings",
    purpose: "Notifications and faster loading when enabled",
  },
  {
    category: "Usage",
    examples: "Anonymized page-view analytics via Vercel Analytics",
    purpose: "Understanding aggregate app usage (not sold for ads)",
  },
];

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="page-container max-w-5xl space-y-8 pb-16">
      <PageHeader
        title="Privacy Policy"
        description="How the em. portal collects, uses, and protects your information."
        action={
          <Button variant="ghost" onClick={() => router.back()} className="h-9 rounded-xl font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <p className="text-sm font-medium text-muted-foreground">Effective date: June 13, 2026</p>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <DocNav items={NAV} className="lg:sticky lg:top-24" />

        <div className="space-y-6">
          <DocSummary title="At a glance">
            <DocList
              items={[
                <>
                  We collect only what is needed to run a private community app for our cell group.
                </>,
                <>We do not sell your personal information or use it for third-party advertising.</>,
                <>
                  Chat, rosters, and progress data are access-controlled — members see only what their
                  role and circle membership allow.
                </>,
                <>
                  You can opt out of the Community Progress leaderboard and disable push notifications
                  at any time.
                </>,
              ]}
            />
          </DocSummary>

          <FeedCard animate={false} className="space-y-10 p-5 sm:p-6">
            <DocSection id="overview" title="Overview" icon={ShieldCheck} index={0}>
              <p>
                The <strong className="text-foreground">em. portal</strong> is a community platform for
                our church cell group. It helps members coordinate Bible reading, rosters, events, and
                fellowship chat. This policy explains what information we process, why we process it, and
                the choices available to you.
              </p>
              <p>
                By creating an account or using the app, you agree to this policy. If you do not agree,
                please do not use the service. For a product overview, see{" "}
                <Link href="/features" className="font-semibold text-primary hover:underline">
                  How It Works
                </Link>
                .
              </p>
            </DocSection>

            <DocSection id="collection" title="Information we collect" icon={Fingerprint} index={1}>
              <p>
                We follow a minimal-collection approach. The table below summarizes the main categories of
                information stored in our systems.
              </p>
              <DocDataTable rows={COLLECTION_ROWS} />
              <p>
                We do not collect precise location data, contacts from your device, or payment card
                information through this app.
              </p>
            </DocSection>

            <DocSection id="use" title="How we use information" icon={Scale} index={2}>
              <DocList
                items={[
                  <>
                    <strong className="text-foreground">Provide the service:</strong> sign-in, profiles,
                    Bible plans, chat, rosters, events, and notifications.
                  </>,
                  <>
                    <strong className="text-foreground">Community safety:</strong> admin approval, role-based
                    access, and moderation of shared spaces.
                  </>,
                  <>
                    <strong className="text-foreground">Personalization:</strong> avatars, halos, language,
                    and appearance settings you choose.
                  </>,
                  <>
                    <strong className="text-foreground">Engagement features:</strong> achievements and
                    progress displays derived from your in-app activity.
                  </>,
                  <>
                    <strong className="text-foreground">Improve reliability:</strong> anonymized usage
                    metrics to understand how the app is used in aggregate.
                  </>,
                ]}
              />
              <p>We do not use your information for cross-site advertising profiles or data brokerage.</p>
            </DocSection>

            <DocSection id="sharing" title="Sharing & service providers" icon={Database} index={3}>
              <p>
                We do not sell, rent, or trade your personal information. We share data only in these
                limited circumstances:
              </p>
              <DocList
                items={[
                  <>
                    <strong className="text-foreground">Within the community:</strong> other approved
                    members may see information described in{" "}
                    <a href="#visibility" className="font-semibold text-primary hover:underline">
                      What others can see
                    </a>
                    .
                  </>,
                  <>
                    <strong className="text-foreground">Service providers</strong> that help us operate
                    the app under contractual safeguards:
                  </>,
                ]}
              />
              <div className="overflow-hidden rounded-xl border border-border/50 text-sm">
                {[
                  ["Google Firebase", "Authentication, database, file storage, push messaging"],
                  ["Vercel", "Application hosting and content delivery"],
                  ["Vercel Analytics", "Privacy-focused, anonymized usage statistics"],
                ].map(([name, detail], i) => (
                  <div
                    key={name}
                    className={`flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${i !== 0 ? "border-t border-border/40" : ""}`}
                  >
                    <span className="font-semibold text-foreground">{name}</span>
                    <span className="text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
              <p>
                We may also disclose information if required by law or to protect the safety and rights of
                members and administrators.
              </p>
            </DocSection>

            <DocSection id="storage" title="Cookies & device storage" icon={Cookie} index={4}>
              <p>
                The app uses your browser&apos;s <strong className="text-foreground">local storage</strong>{" "}
                to remember UI preferences (such as theme, typography, and Bible text version) and to cache
                chat messages for faster loading. Firebase Authentication may use session cookies or similar
                tokens to keep you signed in.
              </p>
              <p>
                Vercel Analytics collects anonymized page-view data. We do not use advertising cookies or
                third-party marketing trackers.
              </p>
            </DocSection>

            <DocSection id="notifications" title="Push notifications" icon={Bell} index={5}>
              <p>
                Push alerts are <strong className="text-foreground">opt-in</strong>. If you enable them,
                we store a device token (FCM) linked to your account to deliver messages such as chat
                activity, roster duty reminders, event day-of alerts, and feedback updates.
              </p>
              <p>
                On some platforms (notably iOS), notifications require installing the app to your home
                screen as a PWA. You can disable notifications in your profile or through your device
                settings at any time.
              </p>
            </DocSection>

            <DocSection id="visibility" title="What others can see" icon={Eye} index={6}>
              <DocList
                items={[
                  <>
                    <strong className="text-foreground">Profiles:</strong> name, avatar, equipped halo, and{" "}
                    <em>unlocked</em> achievements. Locked milestones and hidden requirements stay private
                    to you.
                  </>,
                  <>
                    <strong className="text-foreground">Community Progress:</strong> aggregate reading
                    momentum only if you opt in via profile settings.
                  </>,
                  <>
                    <strong className="text-foreground">Chat:</strong> messages and reactions are visible
                    to current members of each circle. Leaving a circle removes access to new messages
                    there.
                  </>,
                  <>
                    <strong className="text-foreground">Rosters & events:</strong> assignments and schedules
                    visible to members with access to those pages.
                  </>,
                  <>
                    <strong className="text-foreground">Feedback:</strong> suggestions are visible to the
                    community; admin notes appear when an administrator responds.
                  </>,
                ]}
              />
              <p>
                Secret achievement unlocks are not broadcast to other members. We do not send unlock
                notifications to the wider community.
              </p>
            </DocSection>

            <DocSection id="retention" title="Data retention" icon={Trash2} index={7}>
              <p>
                We retain account and community data for as long as your membership is active and as needed
                to operate the service. Chat history, roster records, and feedback may be kept for
                community continuity unless an administrator removes them.
              </p>
              <p>
                When an account is deleted at your request, we remove or anonymize personal data within a
                reasonable period, except where retention is required for legal, security, or backup
                purposes.
              </p>
            </DocSection>

            <DocSection id="rights" title="Your choices & rights" icon={Lock} index={8}>
              <DocList
                items={[
                  <>
                    <strong className="text-foreground">Leaderboard visibility:</strong> hide yourself from
                    Community Progress in profile settings.
                  </>,
                  <>
                    <strong className="text-foreground">Notifications:</strong> enable or disable push
                    alerts in profile settings.
                  </>,
                  <>
                    <strong className="text-foreground">Profile & halo:</strong> customize your avatar and
                    equip any halo you have unlocked.
                  </>,
                  <>
                    <strong className="text-foreground">Access & correction:</strong> view most of your data
                    directly in the app; contact an administrator to correct inaccurate account details.
                  </>,
                  <>
                    <strong className="text-foreground">Deletion:</strong> request account removal by
                    contacting a community administrator.
                  </>,
                ]}
              />
              <p>
                Depending on your location, you may have additional privacy rights (such as access, portability,
                or objection). Contact us below and we will respond within a reasonable timeframe.
              </p>
            </DocSection>

            <DocSection id="security" title="Security" icon={ShieldCheck} index={9}>
              <p>
                Sign-in is handled by <strong className="text-foreground">Firebase Authentication</strong>.
                Data access is enforced with <strong className="text-foreground">Firestore Security Rules</strong>{" "}
                so members can read and write only what their role and circle membership allow.
              </p>
              <p>
                Data is stored on <strong className="text-foreground">Google Cloud (Firebase)</strong> and
                delivered through <strong className="text-foreground">Vercel</strong>. Both providers
                maintain industry-standard security practices. No method of transmission or storage is 100%
                secure, but we work to protect your information with access controls and least-privilege
                design.
              </p>
            </DocSection>

            <DocSection id="children" title="Children" icon={FileText} index={10}>
              <p>
                The em. portal is intended for members of our community cell group. It is not directed at
                children under 13, and we do not knowingly collect personal information from children under
                13 without appropriate parental consent. If you believe a child has provided us personal
                information, contact an administrator so we can take appropriate action.
              </p>
            </DocSection>

            <DocSection id="transfers" title="International transfers" icon={Globe} index={11}>
              <p>
                Our service providers may process data in the United States and other countries where they
                operate. When information is transferred internationally, we rely on the safeguards provided
                by our providers&apos; standard contractual protections and security programs.
              </p>
            </DocSection>

            <DocSection id="changes" title="Policy updates" icon={FileText} index={12}>
              <p>
                We may update this policy from time to time. When we make material changes, we will update
                the effective date above and, where appropriate, notify members through the app. Continued
                use after an update means you accept the revised policy.
              </p>
            </DocSection>

            <DocSection id="contact" title="Contact" icon={Mail} index={13}>
              <p>
                For privacy questions, data access requests, or account removal, contact a community
                administrator through your usual church channels or the Feedback page in the app.
              </p>
            </DocSection>
          </FeedCard>
        </div>
      </div>
    </div>
  );
}
