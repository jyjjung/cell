'use client';

import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export function CommunityLanding({
  onSignIn,
  onSignUp,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          New Dream Church
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Community Apps
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Sign in for cell group, preschool volunteers, and church member tools.
        </p>
        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
          <Button size="lg" className="h-11 rounded-lg px-8" onClick={onSignIn}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign in
          </Button>
          <Button size="lg" variant="outline" className="h-11 rounded-lg px-8" onClick={onSignUp}>
            <UserPlus className="mr-2 h-4 w-4" />
            Sign up
          </Button>
        </div>
      </div>
    </div>
  );
}
