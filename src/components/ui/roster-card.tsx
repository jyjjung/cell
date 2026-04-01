import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { User, Check, ShieldCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AvatarData } from '@/types';

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
  completedBy?: { firstName: string; avatar?: AvatarData };
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
        "group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-[2rem] bg-card/20 backdrop-blur-xl border border-white/5 transition-all overflow-hidden",
        onClick && "cursor-pointer hover:border-primary/20",
        isCompleted && "bg-green-500/5 border-green-500/20 hover:border-green-500/30"
      )}
    >
      {/* Visual Connection Line (Desktop) */}
      {showLine && (
        <div className="hidden sm:block absolute left-[2.75rem] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      )}

      {/* Date Side */}
      <div className="flex sm:flex-col items-center justify-start sm:justify-center w-full sm:w-14 shrink-0 sm:border-r border-white/5 sm:pr-4 gap-2 sm:gap-0">
        <p className={cn("text-micro-label !opacity-100", accentColor)}>{format(date, 'EEE')}</p>
        <p className="text-2xl font-black tracking-tighter text-foreground leading-none">{format(date, 'd')}</p>
      </div>

      {/* Avatars & Content Block */}
      <div className="flex items-start gap-4 flex-grow min-w-0 w-full">
        {/* Avatars Stack or Single */}
        {!hideAvatars && (
          <div className="flex -space-x-3 shrink-0">
            {users.length > 0 ? (
              users.slice(0, 3).map((user, idx) => (
                <div
                  key={user.uid}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-muted/20 border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-500 relative"
                  style={{ zIndex: 10 - idx }}
                >
                  <PixelAvatar avatar={user.avatar} />
                </div>
              ))
            ) : (
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-muted/20 border border-white/10 shrink-0 shadow-lg flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
            {users.length > 3 && (
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-muted border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground shadow-lg">
                +{users.length - 3}
              </div>
            )}
          </div>
        )}

        <div className="flex-grow min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base font-bold tracking-tight text-foreground truncate">{title}</h3>
            {/* Mobile Only Right Element (Compact) */}
            <div className="sm:hidden">
              {rightElement}
            </div>
          </div>
          <div className="mt-1.5 min-h-[1.25rem]">
            {typeof subtitle === 'string' ? (
              <p className="text-xs font-medium text-muted-foreground/70 leading-relaxed truncate">
                {subtitle}
              </p>
            ) : (
              subtitle
            )}
          </div>
        </div>
      </div>

      {/* Right Element (Desktop) & Completion Status */}
      <div className="hidden sm:flex items-center gap-4 shrink-0 ml-auto">
        {rightElement}

        {isCompleted && (
          <div className="flex items-center gap-2">
            {completedBy ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      {completedBy.avatar ? <PixelAvatar avatar={completedBy.avatar} /> : <Check className="h-4 w-4 text-green-500" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-bold">Completed by {completedBy.firstName}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="p-2 rounded-xl bg-green-500/20 text-green-500">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Completion Mark */}
      {isCompleted && !rightElement && (
        <div className="sm:hidden absolute top-4 right-4 p-1.5 rounded-full bg-green-500/20 text-green-500">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Background decoration */}
      <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 blur-3xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity", accentBg)} />
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
