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
    <div
      className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      style={{
        paddingTop: 'max(4rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(4rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
        <p className="text-eyebrow">New Dream Church</p>
        <h1 className="text-hero">Community Apps</h1>
        <p className="text-body-hero max-w-md">
          Sign in for cell group, preschool volunteers, and church member tools.
        </p>
        <div className="flex w-full max-w-sm flex-col gap-3 pt-2 sm:max-w-none sm:w-auto sm:flex-row">
          <Button size="hero" className="w-full sm:w-auto" onClick={onSignIn}>
            <LogIn className="h-4 w-4" aria-hidden />
            Sign In
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={onSignUp}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}
