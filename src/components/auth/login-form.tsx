
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, RotateCw } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { signInUser, signOutUser } = useAuth();
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleRetry() {
    setIsPageLoading(true);
    await signOutUser();
    // The signOutUser function in the auth context will handle the redirection or page reload.
  }

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setFormError(null);
    setIsRateLimited(false);

    try {
      await signInUser(data.email, data.password);
      router.push('/'); 
    } catch (error: any) {
      let message = "Invalid email or password. Please try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
        setIsRateLimited(true);
      } else if (error.message) {
        message = error.message;
      }
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        {isRateLimited ? (
          <Button type="button" variant="destructive" className="w-full" onClick={handleRetry}>
            <RotateCw className="mr-2 h-4 w-4" />
            Clear Session and Retry
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Logging In...' : 'Log In'}
          </Button>
        )}
      </form>
    </Form>
  );
}
