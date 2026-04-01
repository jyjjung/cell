
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    // If auth is loaded, user is not an admin, and they are on a protected sub-page,
    // redirect them to the admin login page.
    if (isMounted && !loadingAuth && !isAdmin && pathname !== '/admin') {
      router.push("/admin");
    }
  }, [isAdmin, loadingAuth, router, isMounted, pathname]);

  // Show a loader while authentication is in progress.
  if (!isMounted || loadingAuth) {
    return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // If the user is not an admin and is trying to access a protected page,
  // show a loader while the redirect (from useEffect) happens.
  // This prevents flashing the page content before redirecting.
  if (!isAdmin && pathname !== '/admin') {
      return (
          <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      );
  }

  // If the user is an admin OR they are on the admin login page, show the content.
  const isSubPage = pathname !== '/admin';

  return (
    <>
      {isSubPage && (
          <div className="fixed top-20 right-4 md:right-8 z-50">
            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 h-10 rounded-full bg-card/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all font-black uppercase tracking-widest text-[10px] text-foreground/80 shadow-2xl hover:text-foreground">
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                Return to Hub
            </Link>
          </div>
      )}
      {children}
    </>
  );
}
