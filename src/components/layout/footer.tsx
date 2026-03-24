
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Explicitly hide footer on individual chat routes to prevent covering UI elements
  // This allows the ChatWindow to have full-height presence.
  if (pathname.startsWith('/chat/') && pathname !== '/chat') {
    return null;
  }

  return (
    <footer className="py-6 border-t border-border/50 bg-background/5 backdrop-blur-2xl mt-auto shrink-0 w-full relative z-10">
      <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
          em. @2026
        </p>
        
        <div className="flex items-center gap-8">
          <Link 
            href="/features" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            Platform Intelligence
          </Link>

          <Link 
            href="/privacy" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
