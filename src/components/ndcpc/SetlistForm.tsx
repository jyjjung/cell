'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Resource, Setlist } from '@/types/ndcpc-ported';
import { collection, query, orderBy, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getDefaultSunday, getSundays, scheduleDateToSundayIso, toCalendarDate } from '@/lib/ndcpc/dates';
import { normalizeSetlist } from '@/lib/ndcpc/setlist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/context/LocaleProvider';
import { formatAppDate } from '@/lib/ndcpc/format-date';

interface SetlistFormProps {
  setlist?: Setlist | null;
  onSuccess: () => void;
  /** Allow saving with no songs/chants (detail editor after create). */
  allowEmpty?: boolean;
}

function ResourceTitle({
  title,
  className,
  lines = 2,
}: {
  title: string;
  className?: string;
  lines?: 1 | 2;
}) {
  return (
    <span
      title={title}
      className={cn(
        'min-w-0 break-words [overflow-wrap:anywhere]',
        lines === 1 ? 'line-clamp-1' : 'line-clamp-2',
        className
      )}
    >
      {title}
    </span>
  );
}

function OrderedResourceList({
  ids,
  resourceMap,
  onMove,
  onRemove,
  t,
}: {
  ids: string[];
  resourceMap: Map<string, Resource>;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  t: (key: string) => string;
}) {
  if (ids.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('setlist.pickVideos')}</p>;
  }

  return (
    <ol className="divide-y divide-border/40 rounded-md border border-border/40">
      {ids.map((id, index) => {
        const resource = resourceMap.get(id);
        const title = resource?.title ?? t('setlist.missingVideo');
        return (
          <li
            key={id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 px-2 py-2 text-sm"
          >
            <span className="pt-0.5 text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <ResourceTitle title={title} lines={2} className="pt-0.5" />
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={index === 0}
                onClick={() => onMove(index, 'up')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="sr-only">{t('setlist.moveUp')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={index === ids.length - 1}
                onClick={() => onMove(index, 'down')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="sr-only">{t('setlist.moveDown')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(id)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">{t('common.remove')}</span>
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function SetlistForm({ setlist, onSuccess, allowEmpty = false }: SetlistFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const baseSundays = useMemo(() => getSundays(), []);
  const defaultSunday = useMemo(() => getDefaultSunday(), []);
  const isEditing = !!setlist;

  const editDateIso = useMemo(
    () => (setlist ? scheduleDateToSundayIso(setlist.date, baseSundays, defaultSunday) : null),
    [setlist, baseSundays, defaultSunday],
  );

  const sundays = useMemo(() => {
    if (!editDateIso) return baseSundays;
    if (baseSundays.some((sunday) => sunday.toISOString() === editDateIso)) return baseSundays;
    const extra = toCalendarDate(setlist?.date);
    if (!extra) return baseSundays;
    return [...baseSundays, extra].sort((a, b) => a.getTime() - b.getTime());
  }, [baseSundays, editDateIso, setlist?.date]);

  const formSchema = z.object({
    date: z.string().min(1, t('setlist.pickDate')),
  });

  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, NDCPc_COLLECTIONS.resources), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: resources } = useCollection<Resource>(resourcesQuery);

  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources?.forEach((r) => map.set(r.id, r));
    return map;
  }, [resources]);

  const initialLists = useMemo(() => {
    if (!setlist) return { songIds: [] as string[], chantIds: [] as string[] };
    return normalizeSetlist(setlist, resourceMap);
  }, [setlist, resourceMap]);

  const [songIds, setSongIds] = useState<string[]>(initialLists.songIds);
  const [chantIds, setChantIds] = useState<string[]>(initialLists.chantIds);

  const songs = resources?.filter((r) => r.category === 'songs') ?? [];
  const chants = resources?.filter((r) => r.category === 'chants') ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: editDateIso || defaultSunday.toISOString(),
    },
  });

  const moveIds = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    setter((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: t('common.offline') });
      return;
    }

    if (!allowEmpty && songIds.length === 0 && chantIds.length === 0) {
      toast({ variant: 'destructive', title: t('setlist.addOneVideo') });
      return;
    }

    try {
      const data = {
        date: Timestamp.fromDate(new Date(values.date)),
        songIds,
        chantIds,
      };

      if (isEditing && setlist) {
        await setDoc(doc(firestore, NDCPc_COLLECTIONS.setlists, setlist.id), data);
        toast({ title: t('common.saved') });
      } else {
        await addDoc(collection(firestore, NDCPc_COLLECTIONS.setlists), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast({ title: t('common.saved') });
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.couldntSave') });
    }
  };

  const ResourcePicker = ({
    label,
    items,
    selectedIds,
    onAdd,
  }: {
    label: string;
    items: Resource[];
    selectedIds: string[];
    onAdd: (id: string) => void;
  }) => (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('setlist.noResources')}</p>
      ) : (
        <div className="divide-y divide-border/40">
          {items.map((resource) => {
            const added = selectedIds.includes(resource.id);
            return (
              <div
                key={resource.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2.5 text-sm"
              >
                <ResourceTitle title={resource.title} lines={2} />
                <Button
                  type="button"
                  variant={added ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-8 shrink-0 px-2.5"
                  disabled={added}
                  onClick={() => onAdd(resource.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="sr-only">
                    {added ? t('common.added') : t('common.add')} {resource.title}
                  </span>
                  <span aria-hidden>{added ? t('common.added') : t('common.add')}</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
          <div className="space-y-6 pr-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.date')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('setlist.pickSunday')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sundays.map((sunday) => (
                        <SelectItem key={sunday.toISOString()} value={sunday.toISOString()}>
                          {formatAppDate(sunday, 'PPP', locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>{t('resources.songs')}</FormLabel>
              <OrderedResourceList
                ids={songIds}
                resourceMap={resourceMap}
                onMove={(index, direction) => moveIds(setSongIds, index, direction)}
                onRemove={(id) => setSongIds((prev) => prev.filter((item) => item !== id))}
                t={t}
              />
            </div>

            <div className="space-y-3">
              <FormLabel>{t('resources.chants')}</FormLabel>
              <OrderedResourceList
                ids={chantIds}
                resourceMap={resourceMap}
                onMove={(index, direction) => moveIds(setChantIds, index, direction)}
                onRemove={(id) => setChantIds((prev) => prev.filter((item) => item !== id))}
                t={t}
              />
            </div>

            <ResourcePicker
              label={t('setlist.addSong')}
              items={songs}
              selectedIds={songIds}
              onAdd={(id) => setSongIds((prev) => [...prev, id])}
            />
            <ResourcePicker
              label={t('setlist.addChant')}
              items={chants}
              selectedIds={chantIds}
              onAdd={(id) => setChantIds((prev) => [...prev, id])}
            />
          </div>
        </div>

        <Button type="submit" className="mt-4 w-full shrink-0" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? t('common.saving')
            : isEditing
              ? t('common.save')
              : t('common.create')}
        </Button>
      </form>
    </Form>
  );
}
