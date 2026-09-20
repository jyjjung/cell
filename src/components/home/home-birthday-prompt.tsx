'use client';

import { Cake, ChevronRight, Eye, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useChats } from '@/hooks/useChats';
import { hasCapability } from '@/lib/role-capabilities';
import { formatUserDisplayName } from '@/lib/formatting';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { HomeGroupedSection, HomeGroupList } from './home-grouped-section';

function todayBirthdayMonthDay() {
  const today = new Date();
  return `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function todayBirthdayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${todayBirthdayMonthDay()}`;
}

export function HomeBirthdayPrompt() {
  const { currentUser } = useAuth();
  const { allUsers, loading } = useAllUsers();
  const { createBirthdayChat } = useChats();
  const router = useRouter();
  const { toast } = useToast();
  const [openingUid, setOpeningUid] = useState<string | null>(null);
  const [showBirthdayPreview, setShowBirthdayPreview] = useState(false);

  const birthdayUsers = useMemo(() => {
    if (!currentUser || loading) return [];
    const monthDay = todayBirthdayMonthDay();
    const canUse =
      currentUser.isAdmin || hasCapability(currentUser.capabilityKeys, 'birthday.chat');
    if (!canUse) return [];

    return allUsers
      .filter((user) => user.birthday?.slice(5, 10) === monthDay)
      .sort((a, b) => formatUserDisplayName(a).localeCompare(formatUserDisplayName(b)));
  }, [allUsers, currentUser, loading]);

  const birthdayMembers = useMemo(
    () =>
      allUsers.filter(
        (user) =>
          user.isApproved &&
          (hasCapability(user.capabilityKeys, 'birthday.chat') || user.uid === currentUser?.uid),
      ),
    [allUsers, currentUser?.uid],
  );

  const openBirthdayChat = async (birthdayUser: (typeof birthdayUsers)[number]) => {
    if (!currentUser) return;
    setOpeningUid(birthdayUser.uid);
    try {
      const chatId = await createBirthdayChat(
        birthdayUser,
        todayBirthdayDate(),
        birthdayMembers,
      );
      router.push(`/cell/chat/${chatId}`);
    } catch (error) {
      toast({
        title: 'Could not open birthday chat',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOpeningUid(null);
    }
  };

  if (birthdayUsers.length === 0) return null;

  const previewBirthday = birthdayUsers[0];

  return (
    <HomeGroupedSection
      id="home-birthday-heading"
      title="Birthdays today"
      action={
        process.env.NODE_ENV !== 'production' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => setShowBirthdayPreview((value) => !value)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {showBirthdayPreview ? 'Exit preview' : 'Preview birthday view'}
          </Button>
        ) : undefined
      }
    >
      {showBirthdayPreview && previewBirthday ? (
        <div className="border-b border-border/60 bg-primary/5 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Text as="p" variant="strong" className="text-sm">
                Birthday person preview
              </Text>
              <Text as="p" className="mt-1 text-xs text-muted-foreground">
                Local visual preview only. No chat, membership, or permission changes are made.
              </Text>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Close birthday person preview"
              onClick={() => setShowBirthdayPreview(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="rounded-xl border border-primary/25 bg-background p-3">
            <div className="flex items-center gap-3">
              <Cake className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <Text as="p" variant="strong" className="text-sm">
                  Your birthday chat is ready
                </Text>
                <Text as="p" className="mt-0.5 text-xs text-muted-foreground">
                  Your community has a temporary chat waiting for you.
                </Text>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          </div>
        </div>
      ) : null}
      <HomeGroupList>
        {birthdayUsers.map((user) => (
          <Button
            key={user.uid}
            type="button"
            variant="ghost"
            className="group h-auto w-full items-center gap-3 rounded-none border-b border-border/60 bg-primary/5 px-4 py-4 text-left transition-colors hover:bg-primary/10 last:border-b-0"
            disabled={openingUid !== null}
            onClick={() => void openBirthdayChat(user)}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Cake className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <Text as="span" variant="strong" className="block text-sm">
                {openingUid === user.uid
                  ? 'Opening birthday chat…'
                  : `Send ${formatUserDisplayName(user)} a birthday message`}
              </Text>
              <Text as="span" className="mt-0.5 block text-xs text-muted-foreground">
                Share a message or photo before midnight
              </Text>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/80 text-primary shadow-sm transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </Button>
        ))}
      </HomeGroupList>
    </HomeGroupedSection>
  );
}
