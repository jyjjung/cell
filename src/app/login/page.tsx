
"use client";

import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogInIcon } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function LoginPage() {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && currentUser) {
      setIsPageLoading(true);
      router.push('/'); 
    }
  }, [currentUser, loadingAuth, router, setIsPageLoading, isMounted]);

   if (!isMounted || loadingAuth || (isMounted && !loadingAuth && currentUser)) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <LogInIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to access your Bible reading checklist.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" onClick={() => setIsPageLoading(true)} className="font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" onClick={() => setIsPageLoading(true)} className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
