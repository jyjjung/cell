
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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
  return <>{children}</>;
}
