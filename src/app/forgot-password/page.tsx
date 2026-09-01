"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { ButtonSpinner, PageLoading } from '@/components/ui/loading-spinner';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, CheckCircle, KeyRound } from 'lucide-react';import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { sendPasswordReset, currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loadingAuth && currentUser) {
      router.push('/');
    }
  }, [currentUser, loadingAuth, router, isMounted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setIsSubmitted(false);

    try {
      await sendPasswordReset(email);
      setIsSubmitted(true);
    } catch (err: any) {
      let message = "An unexpected error occurred. Please try again.";
      if (err.code === 'auth/user-not-found') {
        message = "No user found with this email address.";
      } else if (err.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      } else if (err.code === 'auth/too-many-requests') {
        message = "Too many requests have been sent from this device. Please wait a while before trying again.";
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted || loadingAuth || (isMounted && !loadingAuth && currentUser)) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
          <div className="text-center">
            <div className="inline-block p-3 mb-4 bg-primary/10 rounded-full">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-foreground">Forgot Password?</h1>
          </div>

        {isSubmitted ? (
            <div className="text-center p-4 bg-muted rounded-lg border border-border/50">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-primary">Reset Link Sent</p>
              <p className="text-sm text-muted-foreground mt-1">Please check your inbox (and spam folder).</p>
            </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="text-base h-12"
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-base py-6" disabled={isLoading}>
              {isLoading ? (
                <><ButtonSpinner className="mr-2" /> Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to Sign In
          </Link>
        </p>

      </motion.div>
    </div>
  );
}
