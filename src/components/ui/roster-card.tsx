import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { User, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AvatarData } from '@/types';
import { formatUserDisplayName } from '@/lib/formatting';

interface RosterUser {
  uid: string;
  firstName: string;
  lastName: string;
  avatar?: AvatarData;
}

interface RosterCardProps {
  date: Date;
  title: string;
  subtitle?: string | React.ReactNode;
  users?: RosterUser[];
  accentColor?: string;
  accentBg?: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  isCompleted?: boolean;
  completedBy?: { firstName: string; lastName?: string | null; avatar?: AvatarData };
  index?: number;
  showLine?: boolean;
  animate?: boolean;
  hideAvatars?: boolean;
}

export function RosterCard({
  date,
  title,
  subtitle,
  users = [],
  accentColor = "text-primary",
  accentBg = "bg-primary/20",
  rightElement,
  onClick,
  isCompleted,
  completedBy,
  index = 0,
  showLine = true,
  animate = true,
  hideAvatars = false
}: RosterCardProps) {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3.5 rounded-2xl bg-card border transition-colors overflow-hidden",
        onClick && "cursor-pointer hover:bg-muted/40",
        isCompleted ? "border-success" : "border-border",
      )}
    >
      {/* Visual Connection Line (Desktop) */}
      {showLine && <div className="hidden sm:block absolute left-[2.5rem] top-0 bottom-0 w-px bg-border/50" />}

      {/* Date Side */}
      <div className="flex sm:flex-col items-center justify-start sm:justify-center w-full sm:w-12 shrink-0 sm:border-r border-border sm:pr-3 gap-2 sm:gap-0.5">
        <p className={cn("text-[11px] font-medium uppercase tracking-wide", accentColor)}>{format(date, 'EEE')}</p>
        <p className="text-xl font-semibold text-foreground leading-none">{format(date, 'd')}</p>
      </div>

      {/* Avatars & Content Block */}
      <div className="flex items-start gap-4 flex-grow min-w-0 w-full">
        {!hideAvatars && (
          <div className="flex -space-x-3 shrink-0">
            {users.length > 0 ? (
              users.slice(0, 3).map((user, idx) => (
                <div
                  key={user.uid}
                  className="h-10 w-10 rounded-full bg-muted border-2 border-card relative"
                  style={{ zIndex: 10 - idx }}
                >
                  <PixelAvatar avatar={user.avatar} />
                </div>
              ))
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-card shrink-0 flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
            {users.length > 3 && (
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-semibold text-muted-foreground">
                +{users.length - 3}
              </div>
            )}
          </div>
        )}

        <div className="flex-grow min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground truncate">{title}</h3>
            <div className="sm:hidden">
              {rightElement}
            </div>
          </div>
          <div className="mt-1 min-h-[1.25rem]">
            {typeof subtitle === 'string' ? (
              <p className="text-xs font-normal text-muted-foreground leading-relaxed truncate">
                {subtitle}
              </p>
            ) : (
              subtitle
            )}
          </div>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0 ml-auto">
        {rightElement}

        {isCompleted && (
          <div className="flex items-center gap-2">
            {completedBy ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center text-success-foreground">
                      {completedBy.avatar ? <PixelAvatar avatar={completedBy.avatar} /> : <Check className="h-4 w-4" strokeWidth={3} />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Completed by {formatUserDisplayName(completedBy)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
            )}
          </div>
        )}
      </div>

      {isCompleted && !rightElement && (
        <div className="sm:hidden absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
      )}

      <div className={cn("absolute -bottom-8 -right-8 w-20 h-20 blur-3xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity", accentBg)} />
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {content}
    </motion.div>
  );
}
