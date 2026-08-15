"use client";

import Link from "next/link";
import { DocPage } from "@/components/legal/doc-page";
import {
  DocArticle,
  DocSection,
  DocList,
  type DocNavItem,
} from "@/components/legal/doc-section";

const NAV: DocNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "eligibility", label: "Who can use it" },
  { id: "accounts", label: "Accounts" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "content", label: "Your content" },
  { id: "availability", label: "Availability" },
  { id: "privacy", label: "Privacy" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfServicePage() {
  return (
    <DocPage
      title="Terms of Service"
      description="Simple rules for using NDC Community Apps at New Dream Church."
      meta="Last updated: August 15, 2026"
      nav={NAV}
    >
      <DocArticle>
        <DocSection id="overview" title="Overview">
          <p>
            NDC Community Apps is a private hub for New Dream Church — including em., NDC Preschool,
            Account, Users, and Updates. These terms explain the basic expectations for anyone who
            creates an account or uses the apps.
          </p>
          <p>
            By signing up or signing in, you agree to these terms. For how we handle information, see the{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </DocSection>

        <DocSection id="eligibility" title="Who can use it">
          <p>
            Access is for New Dream Church members and people invited by an admin. New accounts usually
            need approval before full access is granted. Some apps (for example em. or Preschool) may be
            limited to people who have been given access to that app.
          </p>
        </DocSection>

        <DocSection id="accounts" title="Accounts">
          <DocList
            items={[
              <>Keep your login details private and use your own account.</>,
              <>Provide a real name the church can recognize when you sign up.</>,
              <>Tell an admin if you think your account was used without permission.</>,
              <>Admins may approve, restrict, or remove accounts and app access to keep the community safe.</>,
            ]}
          />
        </DocSection>

        <DocSection id="acceptable-use" title="Acceptable use">
          <p>Use the apps in a way that fits a trusted church community. Do not:</p>
          <DocList
            items={[
              <>Harass, threaten, or demean other members.</>,
              <>Share illegal content or anything that would harm minors.</>,
              <>Try to break into other accounts, probe private data, or disrupt the service.</>,
              <>Spam, scrape, or overload the apps with automated traffic.</>,
              <>Upload malware or content you do not have the right to share.</>,
            ]}
          />
        </DocSection>

        <DocSection id="content" title="Your content">
          <p>
            You keep ownership of what you post (messages, documents, prayer requests, photos, and
            similar). By posting, you allow the church community to use that content inside the apps for
            normal group activity (for example showing it in chat or on shared pages).
          </p>
          <p>
            Do not post material you are not allowed to share. Admins may remove content that breaks
            these terms or church guidelines.
          </p>
        </DocSection>

        <DocSection id="availability" title="Availability">
          <p>
            We try to keep the apps working, but they are provided as-is for our community. Features may
            change, and the service may be unavailable for maintenance or outages.
          </p>
        </DocSection>

        <DocSection id="privacy" title="Privacy">
          <p>
            How we collect and use information is described in the{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            . Anonymous usage analytics may run as described there.
          </p>
        </DocSection>

        <DocSection id="changes" title="Changes">
          <p>
            We may update these terms when the apps or community needs change. The &quot;Last updated&quot;
            date at the top of this page will change when we do. Continued use after an update means you
            accept the revised terms.
          </p>
        </DocSection>

        <DocSection id="contact" title="Contact">
          <p>
            Questions about these terms? Talk to a church admin, or send feedback through the Updates app
            if you already have access.
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
