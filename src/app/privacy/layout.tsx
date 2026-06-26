import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the em. portal handles information for our cell group.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
