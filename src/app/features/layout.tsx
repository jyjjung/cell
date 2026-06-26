import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "A short guide to the em. portal for our cell group.",
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
