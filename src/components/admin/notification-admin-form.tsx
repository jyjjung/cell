
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/hooks/use-notifications';
import { Loader2, Send } from 'lucide-react';
import type { AppNotification } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { communityWallTimeToUtcDate, COMMUNITY_TIMEZONE_DEFAULT } from '@/lib/notification-visibility';

const COMMUNITY_TIMEZONE =
  process.env.NEXT_PUBLIC_DUTY_REMINDER_TIMEZONE || COMMUNITY_TIMEZONE_DEFAULT;

const notificationFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000, "Message is too long"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;


interface NotificationAdminFormProps {
  onSuccess?: (data: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

export default function NotificationAdminForm({ onSuccess, onCancel, submitButtonText }: NotificationAdminFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createNotification } = useNotifications();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const buttonText = submitButtonText ?? t.adminSendAnnouncement;

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: '',
      message: '',
      scheduledDate: '',
      scheduledTime: '',
    },
  });

  async function onSubmit(data: NotificationFormValues) {
    setIsLoading(true);
    try {
      let scheduledFor: Timestamp | null = null;
      if (data.scheduledDate && data.scheduledTime) {
          // Interpret admin-entered wall time in the community timezone (not the browser's).
          scheduledFor = Timestamp.fromDate(
            communityWallTimeToUtcDate(data.scheduledDate, data.scheduledTime, COMMUNITY_TIMEZONE),
          );
      }

      const notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'> = {
        title: data.title,
        message: data.message,
        type: 'announcement',
        isGlobal: true, 
        scheduledFor,
      };
      
      await createNotification(notificationData);

      if (onSuccess) {
        onSuccess(notificationData);
      }
      form.reset();
    } catch (error: any) {
      console.error("Error Sending Announcement", error);
    } finally {
      setIsLoading(false);
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
              <FormLabel className="text-micro-label">{t.adminAnnouncementTitle}</FormLabel>
              <FormControl>
                <Input placeholder="Community update" {...field} className="h-10 rounded-lg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-micro-label">{t.adminMessage}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write your message…" 
                  {...field} 
                  className="min-h-[120px] rounded-lg resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-micro-label">{t.adminScheduledDate}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-9 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-micro-label">{t.adminScheduledTime}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} className="h-9 rounded-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
            {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel}>{t.adminCancel}</Button>
            )}
            <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {buttonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
