"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { URL_REGEX, normalizeChatUrl } from '@/lib/chat-url-utils';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  isSender?: boolean;
  truncate?: boolean;
}

/**
 * LinkifiedText component detects hyperlinks in text and wraps them in 
 * actionable Link (internal) or <a> (external) tags.
 */
export function LinkifiedText({ text, className, linkClassName, isSender, truncate }: LinkifiedTextProps) {
  const elements = useMemo(() => {
    if (!text) return null;

    // Split text by URL regex while keeping the matches
    // Using a capture group in the regex ensures the matches are included in the split array
    const parts = text.split(URL_REGEX);
    
    return parts.map((part, index) => {
      if (!part) return null;

      // Identify if this part matches the URL pattern
      // We check if it matches the regex entirely
      const matches = part.match(/^(https?:\/\/[^\s]+|www\.[^\s]+)$/i);
      
      if (matches) {
        const href = normalizeChatUrl(part);

        let isInternal = false;
        let internalPath = '';

        try {
          // If it's a valid URL, check its host
          const urlObj = new URL(href);
          
          // Check if it's the same origin
          if (typeof window !== 'undefined' && (urlObj.host === window.location.host || urlObj.host === 'localhost:9002')) {
            isInternal = true;
            internalPath = urlObj.pathname + urlObj.search + urlObj.hash;
          }
        } catch (e) {
          // If it's not a full URL but matches our split, it might be a malformed URL
          // or something else. We'll treat it as external if we can't parse it.
        }

        // Style based on whether it's the sender's message (typically on a blue background)
        // or a received message/announcement (typically on a neutral background)
        const currentLinkClassName = cn(
          "underline underline-offset-2 decoration-current/30 transition-all duration-200 font-medium break-all leading-normal",
          isSender 
            ? "text-white hover:text-white decoration-white/60 brightness-110" 
            : "text-primary hover:text-primary/80",
          linkClassName
        );

        if (isInternal) {
          return (
            <Link 
              key={`link-${index}`} 
              href={internalPath} 
              className={currentLinkClassName}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        } else {
          return (
            <a 
              key={`link-${index}`} 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={currentLinkClassName}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
      }

      // Return normal text part
      return part;
    });
  }, [text, isSender, linkClassName]);

  return (
    <span className={cn(
      !truncate && "whitespace-pre-wrap break-words", 
      truncate && "truncate block",
      "leading-snug", 
      className
    )}>
      {elements}
    </span>
  );
}
