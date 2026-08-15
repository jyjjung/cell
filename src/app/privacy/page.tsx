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
    examples: "Email, name, approval status, app access, roles",
    purpose: "Sign-in and access for New Dream Church members",
  },
  {
    category: "Profile",
    examples: "Avatar, photo, language, appearance settings",
    purpose: "How your account looks across the community apps",
  },
  {
    category: "Reading progress",
    examples: "Passage completions, memorization lists, Bible version preference",
    purpose: "Checklists and progress pages in em.",
  },
  {
    category: "Activity",
    examples: "Chat messages, roster assignments, preschool schedules, feedback posts",
    purpose: "Schedules and communication in the apps you can use",
  },
  {
    category: "Device",
    examples: "Push token, local cache for chat and settings",
    purpose: "Notifications and faster loading",
  },
  {
    category: "Usage",
    examples: "Anonymous page views through Vercel Analytics",
    purpose: "Rough sense of how the apps are used",
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
      description="How NDC Community Apps handle information for New Dream Church."
      meta="Last updated: August 15, 2026"
      nav={NAV}
    >
      <DocArticle>
        <DocSection id="overview" title="Overview">
          <p>
            NDC Community Apps is a private hub for New Dream Church members. It includes em. (cell
            group), NDC Preschool, Account, Users, and Updates. This page explains what information
            the apps store and what you can control.
          </p>
          <p>
            By using the apps you agree to this policy and the{" "}
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
          <p>We only store what the apps need to run for our church community.</p>
          <DocDataTable rows={COLLECTION_ROWS} />
          <p>We do not collect your location, phone contacts, or payment details through these apps.</p>
        </DocSection>

        <DocSection id="use" title="How we use it">
          <DocList
            items={[
              <>Run sign-in, profiles, reading plans, chat, rosters, preschool tools, and events.</>,
              <>Approve new members and limit access by app and role.</>,
              <>Show the avatars, photos, and settings you pick.</>,
              <>Display your reading and memorization progress to you in em.</>,
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
            . Beyond that, we use a few services to run the apps:
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
            The apps save some preferences in your browser (theme, font size, Bible version, last opened
            app) and may cache chat messages locally so pages load faster. Firebase keeps you signed in
            with a session token.
          </p>
          <p>Vercel Analytics records anonymous page views. We do not use ad trackers.</p>
        </DocSection>

        <DocSection id="notifications" title="Push notifications">
          <p>
            Notifications are off until you enable them. If you do, we store a device token so we can send
            chat alerts, duty reminders, event reminders, and feedback updates.
          </p>
          <p>You can turn them off again in Account settings or in your phone settings.</p>
        </DocSection>

        <DocSection id="visibility" title="What others can see">
          <DocList
            items={[
              <>Your name, avatar or photo, and equipped halo where those appear in each app.</>,
              <>Your reading on the em. leaderboard only if you opt in.</>,
              <>Chat messages and reactions in circles you belong to.</>,
              <>Roster assignments, preschool schedules, and events on pages you can access.</>,
              <>Feedback posts you submit, plus any admin reply.</>,
            ]}
          />
          <p>Your reading checklist is private unless you join the leaderboard.</p>
        </DocSection>

        <DocSection id="retention" title="How long we keep data">
          <p>
            We keep account and community data while you are a member and while it is needed to run the
            apps. Chat history and roster records may stay for the group unless an admin removes them.
          </p>
          <p>
            If you ask us to delete your account, we will remove or anonymize your personal data within a
            reasonable time, except where we need to keep something for legal or backup reasons.
          </p>
        </DocSection>

        <DocSection id="rights" title="Your choices">
          <DocList
            items={[
              <>Hide yourself from the em. leaderboard in Account settings.</>,
              <>Turn push notifications on or off in Account settings.</>,
              <>Change your avatar, photo, and equipped halo anytime.</>,
              <>View most of your data directly in the apps.</>,
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
            read and write what their app access, role, and chat membership allow. Data is hosted on Google
            Cloud and served through Vercel.
          </p>
          <p>No system is perfectly secure, but we limit access to what each person needs.</p>
        </DocSection>

        <DocSection id="contact" title="Contact">
          <p>
            For privacy questions or to request access, correction, or deletion, talk to a church admin
            through your usual channels, or use the{" "}
            <Link href="/feedback" className="font-medium text-foreground underline-offset-4 hover:underline">
              Updates
            </Link>{" "}
            app after signing in.
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
