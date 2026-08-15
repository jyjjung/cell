import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "A short guide to NDC Community Apps for New Dream Church.",
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
