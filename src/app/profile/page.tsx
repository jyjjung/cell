
"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Added useState
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, LogOut } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function ProfilePage() {
  const { currentUser, loadingAuth, signOutUser } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading(); 
  const [isMounted, setIsMounted] = useState(false); // Added isMounted

  useEffect(() => {
    setIsMounted(true); // Set mounted
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && !currentUser) { // Check isMounted
      setIsPageLoading(true);
      router.push('/login'); 
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

  const handleSignOut = async () => {
    setIsPageLoading(true); // Set loading before calling signOutUser
    await signOutUser();
    // router.push('/') is handled by signOutUser in AuthContext
  };

  if (!isMounted || loadingAuth) { // Check isMounted
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && isMounted) { // Check isMounted
    return null; 
  }

  // Ensure currentUser is available before rendering profile info
  if (!currentUser) return null;


  return (
    <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <UserCircle className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-2xl">Your Profile</CardTitle>
          <CardDescription>Manage your account details and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Email</h3>
            <p className="text-muted-foreground">{currentUser.email}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">User ID</h3>
            <p className="text-muted-foreground text-sm break-all">{currentUser.uid}</p>
          </div>
          <div className="pt-4 border-t">
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
