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
      description="Simple rules for using the em. portal as part of our cell group."
      meta="Last updated: July 29, 2026"
      nav={NAV}
    >
      <DocArticle>
        <DocSection id="overview" title="Overview">
          <p>
            The em. portal is a private app for our church cell group. These terms explain the basic
            expectations for anyone who creates an account or uses the app.
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
            Access is for cell group members and people invited by an admin. New accounts usually need
            approval before full access is granted.
          </p>
        </DocSection>

        <DocSection id="accounts" title="Accounts">
          <DocList
            items={[
              <>Keep your login details private and use your own account.</>,
              <>Provide a real name the cell can recognize when you sign up.</>,
              <>Tell an admin if you think your account was used without permission.</>,
              <>Admins may approve, restrict, or remove accounts to keep the group safe.</>,
            ]}
          />
        </DocSection>

        <DocSection id="acceptable-use" title="Acceptable use">
          <p>Use the app in a way that fits a trusted church community. Do not:</p>
          <DocList
            items={[
              <>Harass, threaten, or demean other members.</>,
              <>Share illegal content or anything that would harm minors.</>,
              <>Try to break into other accounts, probe private data, or disrupt the service.</>,
              <>Spam, scrape, or overload the app with automated traffic.</>,
              <>Upload malware or content you do not have the right to share.</>,
            ]}
          />
        </DocSection>

        <DocSection id="content" title="Your content">
          <p>
            You keep ownership of what you post (messages, documents, prayer requests, and similar).
            By posting, you allow the cell group to use that content inside the app for normal group
            activity (for example showing it in chat or on shared pages).
          </p>
          <p>
            Do not post material you are not allowed to share. Admins may remove content that breaks
            these terms or cell guidelines.
          </p>
        </DocSection>

        <DocSection id="availability" title="Availability">
          <p>
            We try to keep the app working, but it is provided as-is for our group. Features may change,
            and the service may be unavailable for maintenance or outages.
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
            We may update these terms when the app or group needs change. The &quot;Last updated&quot; date
            at the top of this page will change when we do. Continued use after an update means you accept
            the revised terms.
          </p>
        </DocSection>

        <DocSection id="contact" title="Contact">
          <p>
            Questions about these terms? Talk to a cell admin, or send feedback through the in-app
            feedback page if you already have access.
          </p>
        </DocSection>
      </DocArticle>
    </DocPage>
  );
}
