
"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex h-14 items-center">
        <SidebarTrigger />
        {/* You can add a title or logo here if needed for mobile view */}
      </div>
    </header>
  )
}
