
"use client";

import Link from 'next/link';
import SignupForm from '@/components/auth/signup-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Added useState
import { usePageLoading } from '@/contexts/page-loading-context';

export default function SignupPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false); // Added isMounted

  useEffect(() => {
    setIsMounted(true); // Set mounted
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && currentUser) { // Check isMounted
      setIsPageLoading(true);
      router.push('/'); 
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

  if (!isMounted || loadingAuth || (!loadingAuth && currentUser && isMounted)) { // Check isMounted
    return null; 
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Sign up to track your Bible reading progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
