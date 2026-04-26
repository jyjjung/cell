
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


interface NotificationAdminFormProps {
  onSuccess?: (data: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

export default function NotificationAdminForm({ onSuccess, onCancel, submitButtonText = "Dispatch Announcement" }: NotificationAdminFormProps) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Announcement Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Important Community Update" {...field} className="h-12 rounded-xl bg-white/5 border-white/5" />
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
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Message Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter the announcement message... Paragraphs are supported." 
                  {...field} 
                  className="min-h-[160px] rounded-2xl bg-white/5 border-white/5 resize-y p-4 text-base"
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Scheduled Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-10 rounded-xl bg-white/5 border-white/5" />
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
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Scheduled Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} className="h-10 rounded-xl bg-white/5 border-white/5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="pt-4 flex items-center justify-end gap-4">
            {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} className="h-12 px-6 rounded-xl">Cancel</Button>
            )}
            <Button type="submit" className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold text-xs uppercase tracking-widest transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
  );
}
