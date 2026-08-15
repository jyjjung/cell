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
  { id: "apps", label: "The apps" },
  { id: "dashboard", label: "em. home" },
  { id: "bible", label: "Bible reading plan" },
  { id: "chat", label: "Chat" },
  { id: "docs", label: "Docs" },
  { id: "rosters", label: "Rosters and events" },
  { id: "preschool", label: "Preschool" },
  { id: "notifications", label: "Notifications" },
  { id: "halos", label: "Halos" },
  { id: "avatars", label: "Avatars" },
  { id: "feedback", label: "Updates" },
  { id: "privacy", label: "Privacy" },
];

const GETTING_STARTED = [
  {
    title: "Sign up",
    description:
      "Use your email to create an account. An admin will approve you and may grant access to em., Preschool, or both.",
  },
  {
    title: "Open Account",
    description:
      "New members land in Account first — set your profile, look, birthday, and notification preferences.",
  },
  {
    title: "Switch apps",
    description:
      "Use the header switcher to move between Account, em., Preschool, Users (if you have access), and Updates.",
  },
  {
    title: "Use what you need day to day",
    description:
      "Mark passages as you read, check rosters, stay in chat, or open preschool tools — depending on your access.",
  },
];

export default function FeaturesPage() {
  return (
    <DocPage
      title="How it works"
      description="A short guide to NDC Community Apps for New Dream Church."
      nav={NAV}
    >
      <DocArticle>
        <DocIntro>
          NDC Community Apps is New Dream Church&apos;s shared hub: one sign-in for em. (cell group), NDC
          Preschool, Account, Users, and Updates. If you are new here, start with getting started below.
        </DocIntro>

        <DocSection id="getting-started" title="Getting started">
          <DocStepList steps={GETTING_STARTED} />
        </DocSection>

        <DocSection id="apps" title="The apps">
          <DocList
            items={[
              <>Account — profile, appearance, birthday, and notifications.</>,
              <>em. — cell group home, Bible reading, schedules, chat, and member tools.</>,
              <>NDC Preschool — announcements, rosters, worship tools, photos, prayer, and chat.</>,
              <>Users — approvals and access (admins).</>,
              <>Updates — changelog and feedback for everyone who is signed in.</>,
            ]}
          />
        </DocSection>

        <DocSection id="dashboard" title="em. home">
          <p>
            In em., the home screen shows what matters today: Bible reading, upcoming duties (cleaning,
            QT, worship), events, and shortcuts to chat and other pages.
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
            Follow the shared reading plan on the checklist and full-plan pages in em. Mark passages as you
            read. Your progress saves to your profile. You can open passages in the built-in reader.
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
            reply in threads, react to messages, and share photos or links. em. and Preschool each have
            their own chat areas.
          </p>
          <DocList
            items={[
              <>Share events, setlists, rosters, and QT posts from the attachment menu in em.</>,
              <>Photos and links also have gallery pages per circle.</>,
              <>Deleted messages show as deleted instead of disappearing.</>,
            ]}
          />
        </DocSection>

        <DocSection id="docs" title="Docs">
          <p>
            Keep personal notes or share documents with specific members — or with everyone in a
            chat. Shared docs support rich text editing, comments, autosave, and a manual Save
            button. Long chat messages can be turned into a document automatically.
          </p>
          <DocList
            items={[
              <>Create or attach a document from the chat + button.</>,
              <>Docs you create or that are shared with you appear on the Docs page.</>,
              <>Titles are optional; each document shows authors and dates.</>,
            ]}
          />
        </DocSection>

        <DocSection id="rosters" title="Rosters and events">
          <p>
            In em., cleaning, QT, worship, and custom rosters live on their own pages and show up on home.
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

        <DocSection id="preschool" title="Preschool">
          <p>
            NDC Preschool is for preschool volunteers and managers. Open it from the app switcher when you
            have access.
          </p>
          <DocList
            items={[
              <>Announcements, prayer topics, and photo sharing.</>,
              <>Worship hub with rosters, setlists, resources, and service order.</>,
              <>Team and role chats for the people who serve there.</>,
            ]}
          />
        </DocSection>

        <DocSection id="notifications" title="Notifications">
          <p>
            Push notifications are optional. Turn them on from Account if you want them. On some phones
            you may need to add the site to your home screen first.
          </p>
          <DocList
            items={[
              <>New chat messages in your circles.</>,
              <>Reminders before cleaning, QT, worship, or preschool roster duty.</>,
              <>Day-of alerts for events on your schedule.</>,
              <>Updates when an admin replies to your feedback.</>,
            ]}
          />
        </DocSection>

        <DocSection id="halos" title="Halos">
          <p>
            In em., halos unlock as you make progress on the shared Bible reading plan. Your profile shows
            which ones you have unlocked and lets you equip one on your avatar.
          </p>
        </DocSection>

        <DocSection id="avatars" title="Avatars">
          <p>
            In em. you build a pixel avatar in Account. Preschool can use a separate photo. Each app shows
            the look that belongs there — in chat, rosters, and member lists.
          </p>
        </DocSection>

        <DocSection id="feedback" title="Updates">
          <p>
            The Updates app has the changelog and a place to report bugs or suggest improvements. Admins
            can change the status and leave a reply. Everyone who is signed in can open Updates.
          </p>
        </DocSection>

        <DocSection id="privacy" title="Privacy">
          <p>
            The apps are for New Dream Church members. What you can see depends on your approval, app
            access, role, and which chat circles you are in. You can hide yourself from the em. leaderboard
            in Account settings.
          </p>
          <p>
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Read the privacy policy
            </Link>
            {" · "}
            <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
              Read the terms of service
            </Link>
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
