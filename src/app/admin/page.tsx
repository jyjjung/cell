
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const { setIsPageLoading } = usePageLoading();

  useEffect(() => {
    setIsMounted(true);
    setIsPageLoading(false); // Signal that page-specific content/loaders can take over
  }, [setIsPageLoading]);

  useEffect(() => {
    if (isAdmin && isMounted) {
      setIsPageLoading(true); // Show loader for dashboard transition
      router.push('/admin/dashboard');
    }
  }, [isAdmin, router, isMounted, setIsPageLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(password)) {
      toast({ title: "Login Successful", description: "Welcome, Admin!" });
      // router.push will be handled by the useEffect above
    } else {
      setError('Incorrect password. Please try again.');
      toast({ title: "Login Failed", description: "Incorrect password.", variant: "destructive" });
    }
  };
  
  if (!isMounted) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If redirecting, show nothing or a loader to prevent flashing content
  if (isAdmin && isMounted) {
    // The global loader should be active due to setIsPageLoading(true) in useEffect
    return null; 
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>Enter the admin password to manage Cell Dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full text-base py-3">
              Unlock Admin Controls
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
