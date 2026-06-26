"use client";

import Link from "next/link";
import { DocPage } from "@/components/legal/doc-page";
import {
  DocArticle,
  DocIntro,
  DocSection,
  DocList,
  DocStepList,
  type DocNavItem,
} from "@/components/legal/doc-section";

const NAV: DocNavItem[] = [
  { id: "getting-started", label: "Getting started" },
  { id: "dashboard", label: "Dashboard" },
  { id: "bible", label: "Bible reading plan" },
  { id: "chat", label: "Chat" },
  { id: "rosters", label: "Rosters and events" },
  { id: "notifications", label: "Notifications" },
  { id: "halos", label: "Halos" },
  { id: "avatars", label: "Avatars" },
  { id: "feedback", label: "Feedback" },
  { id: "privacy", label: "Privacy" },
];

const GETTING_STARTED = [
  {
    title: "Sign up",
    description: "Use your email to create an account. An admin will approve you before you can use the app.",
  },
  {
    title: "Set up your profile",
    description: "Pick your avatar, language, and notification preferences.",
  },
  {
    title: "Open the dashboard",
    description: "Your home screen shows today's reading, duties, events, and links to chat.",
  },
  {
    title: "Use the app day to day",
    description: "Mark passages as you read, check rosters, and stay in touch through your chat circles.",
  },
];

export default function FeaturesPage() {
  return (
    <DocPage title="How it works" description="A short guide for our cell group." nav={NAV}>
      <DocArticle>
        <DocIntro>
          The em. portal is our cell group&apos;s app for Bible reading, schedules, chat, and member tools.
          If you are new here, start with getting started below.
        </DocIntro>

        <DocSection id="getting-started" title="Getting started">
          <DocStepList steps={GETTING_STARTED} />
        </DocSection>

        <DocSection id="dashboard" title="Dashboard">
          <p>
            After you sign in, the home screen shows what matters today: Bible reading, upcoming duties
            (cleaning, QT, worship), events, and shortcuts to chat and other pages.
          </p>
          <DocList
            items={[
              <>Today&apos;s passages with checkboxes to mark them done.</>,
              <>A banner when you are on duty today or tomorrow.</>,
              <>Calendar and agenda views for the wider schedule.</>,
              <>Community Progress on the leaderboard, if you opt in.</>,
            ]}
          />
        </DocSection>

        <DocSection id="bible" title="Bible reading plan">
          <p>
            Follow the shared reading plan on the checklist and full-plan pages. Mark passages as you read.
            Your progress saves to your profile. You can open passages in the built-in reader.
          </p>
          <DocList
            items={[
              <>Heatmaps and pace stats on your profile.</>,
              <>A memorization page for verses you are learning.</>,
              <>Community Progress, if you choose to show up on the leaderboard.</>,
            ]}
          />
        </DocSection>

        <DocSection id="chat" title="Chat">
          <p>
            Each group has its own chat circle. Only people in that circle can read its messages. You can
            reply in threads, react to messages, and share photos or links.
          </p>
          <DocList
            items={[
              <>Share events, setlists, rosters, and QT posts from the attachment menu.</>,
              <>Photos and links also have gallery pages per circle.</>,
              <>Deleted messages show as deleted instead of disappearing.</>,
            ]}
          />
        </DocSection>

        <DocSection id="rosters" title="Rosters and events">
          <p>
            Cleaning, QT, worship, and custom rosters live on their own pages and show up on the dashboard.
            Admins update the schedules; you can see who is serving and what is coming up.
          </p>
          <DocList
            items={[
              <>Cleaning and QT rotations with assigned members.</>,
              <>Worship rosters per service, including roles like lighting.</>,
              <>Events for one-off and recurring gatherings, with optional reminders.</>,
            ]}
          />
        </DocSection>

        <DocSection id="notifications" title="Notifications">
          <p>
            Push notifications are optional. Turn them on from your profile if you want them. On some phones
            you may need to add the site to your home screen first.
          </p>
          <DocList
            items={[
              <>New chat messages in your circles.</>,
              <>Reminders one week and one day before cleaning, QT, or worship duty.</>,
              <>Day-of alerts for events on your schedule.</>,
              <>Updates when an admin replies to your feedback.</>,
            ]}
          />
        </DocSection>

        <DocSection id="halos" title="Halos">
          <p>
            Halos unlock as you make progress on the shared Bible reading plan. Your profile shows which
            ones you have unlocked and lets you equip one on your avatar.
          </p>
        </DocSection>

        <DocSection id="avatars" title="Avatars">
          <p>
            You build a pixel avatar in your profile instead of uploading a photo. The same avatar shows
            up across the app — in chat, rosters, and member lists.
          </p>
        </DocSection>

        <DocSection id="feedback" title="Feedback">
          <p>
            Use the Feedback page to report bugs or suggest improvements. Admins can change the status and
            leave a reply. The changelog on that page lists what has changed in recent updates.
          </p>
        </DocSection>

        <DocSection id="privacy" title="Privacy">
          <p>
            The app is for our cell group only. What you can see depends on your role and which chat circles
            you are in. You can hide yourself from Community Progress in profile settings.
          </p>
          <p>
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Read the privacy policy
            </Link>
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
