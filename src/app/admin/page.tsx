
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, UserCheck, LogIn } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { currentUser, loadingAuth, adminPasswordLogin, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading(); 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && isAdmin) {
      setIsPageLoading(true); 
      router.push('/admin/events');
    }
  }, [isAdmin, loadingAuth, router, isMounted, setIsPageLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentUser) {
      setError('You must be logged in to become an admin.');
      toast({ title: "Login Required", description: "Please log in with your user account first.", variant: "destructive" });
      return;
    }

    try {
      const success = await adminPasswordLogin(password);
      if (success) {
        toast({ title: "Admin Access Granted", description: "Your account now has admin privileges." });
        // The useEffect will handle the redirect
      } else {
        throw new Error("Incorrect password.");
      }
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred.';
      setError(message);
      toast({ title: "Login Failed", description: message, variant: "destructive" });
    }
  };

  if (!isMounted || loadingAuth) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already an admin, the useEffect will redirect. Show nothing here.
  if (isAdmin) {
    return null; 
  }
  
  if (!currentUser) {
      return (
        <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
                        <LogIn className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Login Required</CardTitle>
                    <CardDescription>You must be logged into a user account before you can gain admin access.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/login')} className="w-full text-lg py-6">
                        Go to Login Page
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Authentication</CardTitle>
          <CardDescription>Enter the password to grant admin privileges to your account ({currentUser.email}).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-lg py-6">
              Grant Admin Access
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
