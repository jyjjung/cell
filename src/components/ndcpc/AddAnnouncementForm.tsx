'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, serverTimestamp, addDoc, doc, updateDoc } from 'firebase/firestore';
import type { Announcement } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';

interface AddAnnouncementFormProps {
  announcement?: Announcement | null;
  onSuccess?: () => void;
}

export function AddAnnouncementForm({ announcement, onSuccess }: AddAnnouncementFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const isEditing = !!announcement;

  const formSchema = z.object({
    title: z.string().min(1, t('validation.addTitle')),
    content: z.string().min(1, t('validation.addText')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: announcement?.title ?? '',
      content: announcement?.content ?? '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({ variant: 'destructive', title: t('common.offline') });
      return;
    }
    setIsSubmitting(true);

    try {
      if (isEditing && announcement) {
        await updateDoc(doc(firestore, NDCPc_COLLECTIONS.announcements, announcement.id), {
          title: values.title,
          content: values.content,
        });
        toast({ title: t('common.saved') });
      } else {
        await addDoc(collection(firestore, NDCPc_COLLECTIONS.announcements), {
          title: values.title,
          content: values.content,
          date: serverTimestamp(),
        });
        toast({ title: t('common.posted') });
        form.reset();
      }

      onSuccess?.();
    } catch (error: unknown) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: isEditing ? t('toast.couldntSave') : t('toast.couldntPost'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('announcements.title')}</FormLabel>
              <FormControl>
                <Input placeholder={t('announcements.titlePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('announcements.details')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('announcements.detailsPlaceholder')} {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : isEditing ? t('common.save') : t('common.post')}
        </Button>
      </form>
    </Form>
  );
}
