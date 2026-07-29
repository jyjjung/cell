"use client";

import Link from "next/link";
import { DocPage } from "@/components/legal/doc-page";
import {
  DocArticle,
  DocSection,
  DocList,
  DocDataTable,
  type DocNavItem,
} from "@/components/legal/doc-section";

const NAV: DocNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "collection", label: "What we collect" },
  { id: "use", label: "How we use it" },
  { id: "sharing", label: "Who we share with" },
  { id: "storage", label: "Cookies and storage" },
  { id: "notifications", label: "Push notifications" },
  { id: "visibility", label: "What others can see" },
  { id: "retention", label: "How long we keep data" },
  { id: "rights", label: "Your choices" },
  { id: "security", label: "Security" },
  { id: "contact", label: "Contact" },
];

const COLLECTION_ROWS = [
  {
    category: "Account",
    examples: "Email, name, approval status, roles",
    purpose: "Sign-in and access for cell group members",
  },
  {
    category: "Profile",
    examples: "Avatar, halo, language, appearance settings",
    purpose: "How your account looks in the app",
  },
  {
    category: "Reading progress",
    examples: "Passage completions, memorization lists, Bible version preference",
    purpose: "Checklists and progress pages",
  },
  {
    category: "Activity",
    examples: "Chat messages, roster assignments, feedback posts",
    purpose: "Schedules and communication in the cell",
  },
  {
    category: "Device",
    examples: "Push token, local cache for chat and settings",
    purpose: "Notifications and faster loading",
  },
  {
    category: "Usage",
    examples: "Anonymous page views through Vercel Analytics",
    purpose: "Rough sense of how the app is used",
  },
];

const PROCESSORS = [
  { name: "Google Firebase", detail: "Sign-in, database, storage, push messages" },
  { name: "Vercel", detail: "Hosting" },
  { name: "Vercel Analytics", detail: "Anonymous usage stats" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <DocPage
      title="Privacy Policy"
      description="How we handle information in the em. portal."
      meta="Last updated: June 26, 2026"
      nav={NAV}
    >
      <DocArticle>
        <DocSection id="overview" title="Overview">
          <p>
            The em. portal is an app for our church cell group. It covers Bible reading, rosters, events,
            and chat. This page explains what information the app stores and what you can control.
          </p>
          <p>
            By using the app you agree to this policy and the{" "}
            <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            . For a feature overview, see{" "}
            <Link href="/features" className="font-medium text-foreground underline-offset-4 hover:underline">
              How it works
            </Link>
            .
          </p>
          <p>We do not sell your information or use it for advertising.</p>
        </DocSection>

        <DocSection id="collection" title="What we collect">
          <p>We only store what the app needs to run for our cell group.</p>
          <DocDataTable rows={COLLECTION_ROWS} />
          <p>We do not collect your location, phone contacts, or payment details through this app.</p>
        </DocSection>

        <DocSection id="use" title="How we use it">
          <DocList
            items={[
              <>Run sign-in, profiles, reading plans, chat, rosters, and events.</>,
              <>Approve new members and limit access by role.</>,
              <>Show the avatars, halos, and settings you pick.</>,
              <>Display your reading and memorization progress to you.</>,
              <>Send push notifications if you turn them on.</>,
            ]}
          />
        </DocSection>

        <DocSection id="sharing" title="Who we share with">
          <p>
            Other members may see some of your information as described in{" "}
            <a href="#visibility" className="font-medium text-foreground underline-offset-4 hover:underline">
              What others can see
            </a>
            . Beyond that, we use a few services to run the app:
          </p>
          <ul className="space-y-1.5">
            {PROCESSORS.map(({ name, detail }) => (
              <li key={name}>
                <span className="font-medium text-foreground">{name}</span>
                <span> — {detail}</span>
              </li>
            ))}
          </ul>
          <p>We may also share information if the law requires it.</p>
        </DocSection>

        <DocSection id="storage" title="Cookies and storage">
          <p>
            The app saves some preferences in your browser (theme, font size, Bible version) and may cache
            chat messages locally so pages load faster. Firebase keeps you signed in with a session token.
          </p>
          <p>Vercel Analytics records anonymous page views. We do not use ad trackers.</p>
        </DocSection>

        <DocSection id="notifications" title="Push notifications">
          <p>
            Notifications are off until you enable them. If you do, we store a device token so we can send
            chat alerts, duty reminders, event reminders, and feedback updates.
          </p>
          <p>You can turn them off again in your profile or in your phone settings.</p>
        </DocSection>

        <DocSection id="visibility" title="What others can see">
          <DocList
            items={[
              <>Your name, avatar, and equipped halo on your profile.</>,
              <>Your reading on Community Progress only if you opt in.</>,
              <>Chat messages and reactions in circles you belong to.</>,
              <>Roster assignments and events on pages you can access.</>,
              <>Feedback posts you submit, plus any admin reply.</>,
            ]}
          />
          <p>Your reading checklist is private unless you join the leaderboard.</p>
        </DocSection>

        <DocSection id="retention" title="How long we keep data">
          <p>
            We keep account and cell data while you are a member and while it is needed to run the app.
            Chat history and roster records may stay for the group unless an admin removes them.
          </p>
          <p>
            If you ask us to delete your account, we will remove or anonymize your personal data within a
            reasonable time, except where we need to keep something for legal or backup reasons.
          </p>
        </DocSection>

        <DocSection id="rights" title="Your choices">
          <DocList
            items={[
              <>Hide yourself from Community Progress in profile settings.</>,
              <>Turn push notifications on or off in profile settings.</>,
              <>Change your avatar and equipped halo anytime.</>,
              <>View most of your data directly in the app.</>,
              <>Ask an admin to fix account details or delete your account.</>,
            ]}
          />
          <p>
            If you live somewhere with additional privacy laws, contact an admin and we will respond as
            soon as we reasonably can.
          </p>
        </DocSection>

        <DocSection id="security" title="Security">
          <p>
            Sign-in runs through Firebase. Access to data is controlled by server-side rules so members only
            read and write what their role and chat membership allow. Data is hosted on Google Cloud and
            served through Vercel.
          </p>
          <p>No system is perfectly secure, but we limit access to what each person needs.</p>
        </DocSection>

        <DocSection id="contact" title="Contact">
          <p>
            For privacy questions or to request access, correction, or deletion, talk to a cell admin
            through your usual church channels, or use the{" "}
            <Link href="/feedback" className="font-medium text-foreground underline-offset-4 hover:underline">
              Feedback
            </Link>{" "}
            page after signing in.
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
