"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HeartHandshake, Loader2, Send, Shield, Lock } from 'lucide-react';
import { PageHeader, FeedCard, EmptyState } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { usePrayerRequests } from '@/hooks/use-prayer-requests';
import { useToast } from '@/hooks/use-toast';
import { formatAppDateTime, getAppLocale } from '@/lib/formatting';
import { toDateSafe } from '@/lib/firestore-timestamp';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function PrayerRequestsPage() {
  const router = useRouter();
  const { currentUser, loadingAuth } = useAuth();
  const { requests, loading, isShepherd, submitRequest } = usePrayerRequests();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locale = getAppLocale(currentUser?.preferredLanguage);

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push('/login');
    }
  }, [loadingAuth, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitRequest(text, isAnonymous);
      setText('');
      setIsAnonymous(true);
      toast({
        title: 'Prayer request sent',
        description: 'Shepherd Claire will receive your request privately.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not submit request';
      toast({ variant: 'destructive', title: 'Submission failed', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth || !currentUser) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl space-y-6 pb-32">
      <PageHeader title="Prayer Requests" />

      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <div className="glass-card rounded-2xl border-primary/25 bg-primary/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-bold">Private to Shepherd Claire</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Only <strong className="text-foreground font-semibold">Shepherd Claire</strong> can read
                submitted prayer requests. Other members cannot see them. You can also view your own
                submissions here.
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Anonymous is on by default — your name stays hidden even from Claire.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <FeedCard className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Share a prayer need</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="What would you like us to pray for?"
              className="min-h-[140px] resize-none rounded-xl"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
            />

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="anonymous-prayer" className="text-sm font-semibold">
                  Submit anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isAnonymous ? 'Shepherd Claire will not see your name' : 'Your name will be shown to Claire'}
                </p>
              </div>
              <Switch
                id="anonymous-prayer"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!text.trim() || isSubmitting} className="rounded-xl">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit prayer request
              </Button>
            </div>
          </form>
        </FeedCard>
      </motion.div>

      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">
          {isShepherd ? 'All prayer requests' : 'Your prayer requests'}
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={isShepherd ? 'No requests yet' : 'No requests submitted yet'}
            description={
              isShepherd
                ? 'When members submit prayer requests, they will appear here.'
                : 'Your submitted requests will appear here for your reference.'
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map((item, index) => {
              const createdAt = toDateSafe(item.createdAt);
              const authorLabel = isShepherd
                ? (item.isAnonymous ? 'Anonymous' : (item.submitterDisplayName || 'Member'))
                : (item.isAnonymous ? 'Submitted anonymously' : 'Submitted with your name');

              return (
                <FeedCard key={item.id} index={index} className="p-4 space-y-2">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{authorLabel}</span>
                    <span>{formatAppDateTime(createdAt, locale)}</span>
                  </div>
                </FeedCard>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
