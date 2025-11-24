
"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Send, CheckCircle } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { sendPasswordReset, currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();
  const { setIsPageLoading } = usePageLoading();
  const router = useRouter();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setIsSubmitted(false);

    try {
      await sendPasswordReset(email);
      setIsSubmitted(true);
      toast({
        title: "Check Your Email",
        description: `A password reset link has been sent to ${email}.`,
      });
    } catch (err: any) {
      let message = "An unexpected error occurred. Please try again.";
      if (err.code === 'auth/user-not-found') {
        message = "No user found with this email address.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      }
      setError(message);
      toast({
        title: "Request Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted || loadingAuth || (isMounted && !loadingAuth && currentUser)) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            {isSubmitted
              ? "Follow the instructions sent to your email to reset your password."
              : "Enter your email address and we'll send you a link to get back into your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="font-semibold text-green-700 dark:text-green-300">Reset Link Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your inbox (and spam folder).</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="text-base"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>
                )}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link href="/login" onClick={() => setIsPageLoading(true)} className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
