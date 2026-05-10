
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || !currentUser) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-full flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </TooltipProvider>
  );
}
