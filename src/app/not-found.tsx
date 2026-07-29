'use client';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        That page does not exist or may have moved. Check the link, or go back to the home screen.
      </p>
      <Button type="button" onClick={() => { window.location.href = '/'; }}>
        Go home
      </Button>
    </div>
  );
}
