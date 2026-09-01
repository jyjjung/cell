"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGate } from "@/components/layout/layout-gate";
import { AdminBackButton } from "@/components/admin/admin-back-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !isAdmin && pathname !== '/admin') {
      router.push("/admin");
    }
  }, [isAdmin, loadingAuth, router, isMounted, pathname]);

  const loading = !isMounted || loadingAuth;
  const ready = isAdmin || pathname === '/admin';
  const showBack = pathname !== '/admin';

  return (
    <LayoutGate loading={loading} ready={ready} label="Loading admin">
      {showBack ? (
        <div className="mx-auto w-full max-w-5xl px-[var(--page-padding-x,1rem)] pt-4">
          <AdminBackButton />
        </div>
      ) : null}
      {children}
    </LayoutGate>
  );
}
