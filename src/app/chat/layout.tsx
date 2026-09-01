
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutGate } from "@/components/layout/layout-gate";

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

  return (
    <LayoutGate loading={loadingAuth} ready={!!currentUser} label="Loading chat">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {children}
      </div>
    </LayoutGate>
  );
}
