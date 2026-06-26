"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavLabel, useChatNavLabel } from '@/hooks/use-nav-label';
import { getNavLabelForPath } from '@/lib/nav-labels';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

const CHAT_SUBPAGES = new Set(['photos', 'links']);

export function Breadcrumbs() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const currentLabel = useNavLabel();
  const { currentUser } = useAuth();
  const lang = (currentUser?.preferredLanguage || 'en') as 'en' | 'ko';
  const t = translations[lang];
  const pathsegments = pathname.split('/').filter(Boolean);
  const chatId = pathname.startsWith('/chat/') ? pathsegments[1] : null;
  const chatLabel = useChatNavLabel(chatId);

  const crumbs = React.useMemo(() => {
    const items: { href: string; label: string; icon?: typeof Home }[] = [
      { href: '/', label: t.home, icon: Home },
    ];
    let currentPath = '';

    pathsegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isChatIdCrumb =
        currentPath.startsWith('/chat/') &&
        !CHAT_SUBPAGES.has(segment) &&
        index === pathsegments.length - 1;

      items.push({
        href: currentPath,
        label: isChatIdCrumb ? chatLabel : getNavLabelForPath(currentPath, lang),
      });
    });

    return items;
  }, [pathsegments, lang, t.home, chatLabel]);

  if (pathname === '/') return null;

  if (isMobile) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-bold text-foreground truncate"
        >
          {currentLabel}
        </motion.span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <motion.li
              key={crumb.href}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
              )}

              <Link
                href={crumb.href}
                className={cn(
                  "text-xs font-medium transition-colors hover:text-primary active:scale-95 px-1 py-0.5 rounded-md max-w-[12rem] truncate",
                  isLast
                    ? "text-foreground"
                    : "text-muted-foreground/60 hover:bg-background/35"
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {index === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.label}
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}
