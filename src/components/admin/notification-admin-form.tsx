
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

const notificationFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000, "Message is too long"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export default function NotificationAdminForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { createNotification } = useNotifications();

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
          const dateStr = `${data.scheduledDate}T${data.scheduledTime}`;
          scheduledFor = Timestamp.fromDate(new Date(dateStr));
      }

      const notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'> = {
        title: data.title,
        message: data.message,
        type: 'announcement',
        isGlobal: true, 
        scheduledFor,
      };
      
      await createNotification(notificationData);

      form.reset();
    } catch (error: any) {
      console.error("Error Sending Announcement", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Announcement Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Important Community Update" {...field} className="h-12 rounded-xl bg-muted/30" />
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
              <FormLabel>Message Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter the announcement message... Paragraphs are supported." 
                  {...field} 
                  className="min-h-[200px] rounded-2xl bg-muted/30 resize-y p-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-12 rounded-xl bg-muted/30" />
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
                <FormLabel>Scheduled Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} className="h-12 rounded-xl bg-muted/30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="pt-4">
            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/10 transition-all active:scale-95" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Dispatch Announcement
            </Button>
        </div>
      </form>
    </Form>
  );
}
