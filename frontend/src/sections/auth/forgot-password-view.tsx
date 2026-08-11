'use client';

import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Mail, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconBox } from '@/components/common/icon-box';

import { cn } from '@/lib/utils';
import { authClient } from '@/contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordView() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema as any) });

  const onSubmit = async (data: FormValues) => {
    setIsPending(true);
    try {
      await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Always show success — never reveal whether email is registered
    } finally {
      setIsPending(false);
      setSentEmail(data.email);
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {sent ? (
          <div className="space-y-6">
            <IconBox className="h-12 w-12 rounded-xl ring-1 ring-primary/20">
              <CheckCircle2 className="h-6 w-6" />
            </IconBox>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm">
                If <span className="font-medium">{sentEmail}</span> is registered, you&apos;ll
                receive a reset link shortly. It expires in 1 hour.
              </p>
            </div>
            <p className="text-xs">
              Didn&apos;t receive an email? Check your spam folder, or{' '}
              <Button
                variant="link"
                type="button"
                className="h-auto p-0 text-xs"
                onClick={() => setSent(false)}
              >
                try again
              </Button>
              .
            </p>
            <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Link
                href="/sign-in"
                className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to sign in
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send a secure reset link.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register('email')}
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={cn('pl-9', errors.email && 'border-destructive')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
                    {isSubmitting || isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
