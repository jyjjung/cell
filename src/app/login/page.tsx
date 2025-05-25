
"use client";

import Link from 'next/link';
import LoginForm from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogInIcon } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Added useState
import { usePageLoading } from '@/contexts/page-loading-context';

export default function LoginPage() {
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

   if (!isMounted || loadingAuth || (isMounted && !loadingAuth && currentUser)) { // Check isMounted
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <LogInIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to access your Bible reading checklist.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
