"use client";

import { ExternalLink, Link2 } from 'lucide-react';
import { RemoteImage } from '@/components/ui/remote-image';
import { chatLinkFaviconUrl, chatLinkHostname } from '@/lib/chat-url-utils';

export default function ChatLinkCard({
  url,
  displayUrl,
  senderLabel,
  chatName,
}: {
  url: string;
  displayUrl?: string;
  senderLabel?: string;
  chatName?: string;
}) {
  const favicon = chatLinkFaviconUrl(url);
  const host = chatLinkHostname(url);
  const label = displayUrl ?? url;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-2xl border border-border/40 bg-card/60 p-4 transition-colors hover:bg-card/80"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {favicon ? (
          <RemoteImage
            src={favicon}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
            sizes="24px"
            onError={() => {}}
          />
        ) : (
          <Link2 className="h-4 w-4 text-primary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
          {label}
        </p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{host}</p>
        {(senderLabel || chatName) && (
          <p className="mt-1.5 truncate text-[10px] font-medium text-muted-foreground/80">
            {chatName && <span>{chatName}</span>}
            {chatName && senderLabel && <span> · </span>}
            {senderLabel && <span>{senderLabel}</span>}
          </p>
        )}
      </div>

      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}
