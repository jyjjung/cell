'use client';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import type { PrayerTopic } from '@/types/ndcpc-ported';
import { useTranslation } from '@/context/LocaleProvider';

interface PrayerTopicFormProps {
  prayerTopic?: PrayerTopic | null;
  onSuccess?: () => void;
}

export function PrayerTopicForm({ prayerTopic, onSuccess }: PrayerTopicFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const isEditing = !!prayerTopic;

  const formSchema = z.object({
    topic: z.string().min(1, t('validation.writeTopic')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: prayerTopic?.topic ?? '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({ variant: 'destructive', title: t('common.offline') });
      return;
    }
    setIsSubmitting(true);

    try {
      if (isEditing && prayerTopic) {
        await updateDoc(doc(firestore, NDCPc_COLLECTIONS.prayerTopics, prayerTopic.id), {
          topic: values.topic,
        });
        toast({ title: t('common.saved') });
      } else {
        await addDoc(collection(firestore, NDCPc_COLLECTIONS.prayerTopics), {
          topic: values.topic,
          date: serverTimestamp(),
        });
        toast({ title: t('common.posted') });
        form.reset();
      }

      onSuccess?.();
    } catch (error) {
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
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('prayer.topic')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('prayer.topicPlaceholder')}
                  {...field}
                  rows={3}
                />
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
