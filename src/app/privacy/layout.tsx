import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How NDC Community Apps handle information for New Dream Church.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
