'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type Props = {
  formTitle?: string;
  backHref?: string;
  backLabel?: string;
};

/** Lightweight post-submit confirmation — no answers shown. */
export default function FormSubmitThanks({
  formTitle,
  backHref = '/forms',
  backLabel = 'Back to forms',
}: Props) {
  return (
    <div className="ui-card p-6 md:p-10 max-w-lg mx-auto text-center space-y-5">
      <motion.div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        aria-hidden
      >
        <Check className="h-8 w-8 stroke-[2.5]" />
      </motion.div>
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
      >
        <h1 className="text-page-title">Submitted</h1>
        <p className="text-sm text-muted-foreground">
          Thank you for submitting
          {formTitle ? (
            <>
              {' '}
              <span className="font-medium text-foreground">{formTitle}</span>.
            </>
          ) : (
            '.'
          )}
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35 }}
      >
        <Button asChild className="rounded-xl">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </motion.div>
    </div>
  );
}
