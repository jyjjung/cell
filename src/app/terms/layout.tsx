import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Rules for using the em. portal as part of our cell group.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
