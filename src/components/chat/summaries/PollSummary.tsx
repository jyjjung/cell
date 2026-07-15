"use client";

import { cn } from "@/lib/utils";
import { resolveChatUserName } from "@/lib/chat-utils";
import { BarChart3, Check, Lock } from "lucide-react";
import type { Chat, ChatMessage, UserProfileData } from "@/types";

type PollSummaryProps = {
  message: ChatMessage;
  chat: Chat;
  usersById: Map<string, UserProfileData>;
  isSender: boolean;
  currentUserId?: string;
  isCreator?: boolean;
  onVote: (optionIndex: number) => void;
};

export default function PollSummary({
  message,
  chat,
  usersById,
  isSender,
  currentUserId,
  isCreator = false,
  onVote,
}: PollSummaryProps) {
  const poll = message.poll;
  if (!poll) return null;

  const votes = message.pollVotes ?? {};
  const allowMultiple = poll.allowMultiple ?? false;
  const resultsLocked = poll.resultsLocked ?? false;
  const showResults = !resultsLocked || isCreator;
  const totalVotes = poll.options.reduce(
    (sum, _, index) => sum + (votes[String(index)]?.length ?? 0),
    0,
  );
  const uniqueVoters = new Set(Object.values(votes).flat()).size;

  let footerText: string;
  if (resultsLocked && !isCreator) {
    footerText = uniqueVoters === 0 ? "Results locked · Tap an option to vote" : "Results locked";
  } else if (resultsLocked && isCreator) {
    footerText =
      uniqueVoters === 0
        ? "Results locked from others"
        : `Results locked · ${uniqueVoters} ${uniqueVoters === 1 ? "person" : "people"} voted`;
  } else if (uniqueVoters === 0) {
    footerText = "Tap an option to vote";
  } else {
    footerText = `${uniqueVoters} ${uniqueVoters === 1 ? "person" : "people"} voted`;
  }

  return (
    <div className="w-full min-w-[200px]">
      <div
        className={cn(
          "flex items-start gap-2 px-3 pt-2.5 pb-2",
          isSender ? "text-primary-foreground" : "text-foreground",
        )}
      >
        <BarChart3 className={cn("mt-0.5 h-4 w-4 shrink-0", isSender ? "text-primary-foreground/80" : "text-primary")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{poll.question}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {allowMultiple && (
              <p className={cn("text-[11px]", isSender ? "text-primary-foreground/60" : "text-muted-foreground")}>
                Choose any that apply
              </p>
            )}
            {resultsLocked && (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  isSender ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                <Lock className="h-3 w-3" />
                {isCreator ? "Only you see results" : "Results hidden"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1 px-2 pb-2">
        {poll.options.map((option, index) => {
          const voterIds = votes[String(index)] ?? [];
          const optionVotes = voterIds.length;
          const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = voterIds.includes(currentUserId ?? "");
          const voterNames = showResults
            ? voterIds.map((uid) => resolveChatUserName(uid, chat, usersById))
            : [];

          return (
            <button
              key={`${message.id}-poll-${index}`}
              type="button"
              onClick={() => onVote(index)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors",
                isSender
                  ? isSelected
                    ? "border-primary-foreground/40 bg-primary-foreground/15"
                    : "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                  : isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-muted/30 hover:bg-muted/50",
              )}
            >
              {showResults && totalVotes > 0 && (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    isSender ? "bg-primary-foreground/15" : "bg-primary/10",
                    isSelected && (isSender ? "bg-primary-foreground/25" : "bg-primary/20"),
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative block">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {isSelected && (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isSender ? "text-primary-foreground" : "text-primary",
                        )}
                      />
                    )}
                    <span className="truncate text-sm font-medium">{option}</span>
                  </span>
                  {showResults && (
                    <span
                      className={cn(
                        "shrink-0 text-xs tabular-nums",
                        isSender ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {totalVotes > 0 ? `${pct}%` : "0"}
                    </span>
                  )}
                </span>
                {voterNames.length > 0 && (
                  <span
                    className={cn(
                      "mt-1 block text-[11px] leading-snug",
                      isSender ? "text-primary-foreground/65" : "text-muted-foreground",
                    )}
                  >
                    {voterNames.join(", ")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p
        className={cn(
          "border-t px-3 py-1.5 text-[11px]",
          isSender
            ? "border-primary-foreground/15 text-primary-foreground/60"
            : "border-border/50 text-muted-foreground",
        )}
      >
        {footerText}
      </p>
    </div>
  );
}
