
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, UserCircle, LogOut, Save, Pencil, Users } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import type { UserProfileData } from '@/types';
import { Switch } from '@/components/ui/switch';

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }).max(50, { message: "Display name cannot exceed 50 characters."}),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { currentUser, loadingAuth, signOutUser, updateUserProfile } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showProgress, setShowProgress] = useState(currentUser?.showInCommunityProgress ?? true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: currentUser?.displayName || '',
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) {
      setIsPageLoading(true);
      router.push('/login');
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.displayName || '',
      });
      setShowProgress(currentUser.showInCommunityProgress ?? true);
    }
  }, [currentUser, form]);

  const handleSignOut = async () => {
    await signOutUser();
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const profileUpdateData: Partial<UserProfileData> = {
        displayName: data.displayName,
      };

      await updateUserProfile(currentUser.uid, profileUpdateData);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProgressToggle = async (isChecked: boolean) => {
    if (!currentUser) return;
    setShowProgress(isChecked); // Optimistically update UI
    try {
      await updateUserProfile(currentUser.uid, { showInCommunityProgress: isChecked });
    } catch (error) {
      console.error("Failed to update progress visibility:", error);
      setShowProgress(!isChecked); // Revert on error
    }
  };

  if (!isMounted || loadingAuth) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && isMounted) {
    return null;
  }

  if (!currentUser) return null;

  return (
    <div className="container mx-auto py-8 max-w-2xl space-y-8">
      <Card>
        <CardHeader className="text-center items-center relative">
            <Button onClick={() => setIsEditing(!isEditing)} variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit Profile</span>
            </Button>
            <div className="p-4 bg-primary/10 rounded-full inline-block">
                <UserCircle className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl pt-2">{isEditing ? 'Edit Profile' : currentUser.displayName}</CardTitle>
            <CardDescription>{currentUser.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} disabled={!isEditing || isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false);
                    form.reset({
                      displayName: currentUser.displayName || '',
                    });
                  }} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6 border-t">
          <Button onClick={handleSignOut} variant="destructive" className="w-full">
             Sign Out
          </Button>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mt-2 text-center">User ID</h3>
            <p className="text-muted-foreground text-xs break-all text-center">{currentUser.uid}</p>
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Community Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
              <Label htmlFor="community-progress-switch">Community Progress</Label>
              <p className="text-sm text-muted-foreground">
                  Show your reading progress on the community leaderboard.
              </p>
              </div>
              <Switch
                  id="community-progress-switch"
                  checked={showProgress}
                  onCheckedChange={handleProgressToggle}
              />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
