import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Rules for using NDC Community Apps at New Dream Church.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
