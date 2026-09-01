"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveChatUserName } from "@/lib/chat-utils";
import { BarChart3, Check, Lock } from "lucide-react";
import type { Chat, ChatMessage, UserProfileData } from "@/types";
import { chatCardEyebrow, chatCardIcon } from "./chat-card-styles";

type PollSummaryProps = {
  message: ChatMessage;
  chat: Chat;
  usersById: Map<string, UserProfileData>;
  isSender: boolean;
  currentUserId?: string;
  onVote: (optionIndex: number) => void;
};

export default function PollSummary({
  message,
  chat,
  usersById,
  isSender,
  currentUserId,
  onVote,
}: PollSummaryProps) {
  const poll = message.poll;
  if (!poll) return null;

  const votes = message.pollVotes ?? {};
  const allowMultiple = poll.allowMultiple ?? false;
  const votingLocked = poll.resultsLocked ?? false;
  const totalVotes = poll.options.reduce(
    (sum, _, index) => sum + (votes[String(index)]?.length ?? 0),
    0,
  );
  const uniqueVoters = new Set(Object.values(votes).flat()).size;

  let footerText: string;
  if (votingLocked) {
    footerText =
      uniqueVoters === 0
        ? "Voting locked"
        : `Voting locked · ${uniqueVoters} ${uniqueVoters === 1 ? "person" : "people"} voted`;
  } else if (uniqueVoters === 0) {
    footerText = "Tap an option to vote";
  } else {
    footerText = `${uniqueVoters} ${uniqueVoters === 1 ? "person" : "people"} voted`;
  }

  // Centered poll cards always use the card surface (isSender=false from MessageBubble).
  // Inline sender bubbles keep primary-tinted option chrome.
  const onPrimary = isSender;

  return (
    <div className="w-full min-w-[200px]">
      <div
        className={cn(
          "flex items-start gap-2 px-3.5 pb-2 pt-3.5",
          onPrimary ? "text-primary-foreground" : "text-foreground",
        )}
      >
        <div
          className={cn(
            chatCardIcon,
            "mt-0.5",
            onPrimary && "border border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground",
          )}
        >
          <BarChart3 className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              chatCardEyebrow,
              onPrimary && "text-primary-foreground/70",
            )}
          >
            Poll
          </p>
          <p className="mt-1 text-base font-semibold leading-snug">{poll.question}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {allowMultiple && (
              <p
                className={cn(
                  "text-xs",
                  onPrimary ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                Choose any that apply
              </p>
            )}
            {votingLocked && (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  onPrimary ? "text-primary-foreground/60" : "text-muted-foreground",
                )}
              >
                <Lock className="h-3 w-3" />
                Voting locked
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 px-3.5 pb-2">
        {poll.options.map((option, index) => {
          const voterIds = votes[String(index)] ?? [];
          const optionVotes = voterIds.length;
          const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = voterIds.includes(currentUserId ?? "");
          const voterNames = voterIds.map((uid) => resolveChatUserName(uid, chat, usersById));

          return (
            <Button
              key={`${message.id}-poll-${index}`}
              type="button"
              variant="ghost"
              disabled={votingLocked}
              onClick={() => {
                if (votingLocked) return;
                onVote(index);
              }}
              className={cn(
                "relative h-auto w-full overflow-hidden rounded-lg border px-2.5 py-2 text-left justify-start",
                votingLocked && "cursor-default",
                onPrimary
                  ? isSelected
                    ? "border-primary-foreground/40 bg-primary-foreground/15"
                    : "border-primary-foreground/20 bg-transparent"
                  : isSelected
                    ? "border-primary bg-transparent"
                    : "border-border bg-transparent",
                !votingLocked &&
                  (onPrimary
                    ? !isSelected && "hover:bg-primary-foreground/10"
                    : !isSelected && "hover:bg-muted/40"),
              )}
            >
              {totalVotes > 0 && !onPrimary && (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    isSelected ? "bg-primary/10" : "bg-foreground/[0.04]",
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative block">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isSelected && (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          onPrimary ? "text-primary-foreground" : "text-primary",
                        )}
                      />
                    )}
                    <span className="truncate text-sm font-medium">{option}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      onPrimary ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {totalVotes > 0 ? `${pct}%` : "0"}
                  </span>
                </span>
                {voterNames.length > 0 && (
                  <span
                    className={cn(
                      "mt-1 block text-xs leading-snug",
                      onPrimary ? "text-primary-foreground/65" : "text-muted-foreground",
                    )}
                  >
                    {voterNames.join(", ")}
                  </span>
                )}
              </span>
            </Button>
          );
        })}
      </div>

      <p
        className={cn(
          "px-3.5 pb-3.5 pt-1.5 text-xs",
          onPrimary ? "text-primary-foreground/60" : "text-muted-foreground",
        )}
      >
        {footerText}
      </p>
    </div>
  );
}
