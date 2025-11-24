
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/hooks/use-notifications';
import { Loader2, Send } from 'lucide-react';
import type { AppNotification } from '@/types';

const notificationFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  message: z.string().min(5, "Message must be at least 5 characters").max(500, "Message is too long"),
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
    },
  });

  async function onSubmit(data: NotificationFormValues) {
    setIsLoading(true);
    try {
      const notificationData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'> = {
        title: data.title,
        message: data.message,
        type: 'admin',
        isGlobal: true, // Admin-created notifications are global
      };
      
      // This will create the in-app notification and trigger the API route to send the push notification.
      await createNotification(notificationData);

      form.reset();
    } catch (error: any) {
      console.error("Error Sending Notification", error);
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
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Important Update" {...field} />
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
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Input placeholder="Enter the notification message" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Global Notification
            </Button>
        </div>
      </form>
    </Form>
  );
}
