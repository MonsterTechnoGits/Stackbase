'use client';

import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { cn } from '@/lib/utils';
import { authClient } from '@/contexts/AuthContext';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid'>(token ? 'valid' : 'invalid');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema as any) });

  const onSubmit = async (data: FormValues) => {
    setIsPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: data.password, token });
      if (result.error) {
        setTokenStatus('invalid');
        return;
      }
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed. Try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Invalid token */}
        {tokenStatus === 'invalid' && (
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Link invalid or expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This password reset link is no longer valid. It may have already been used or
                expired after 1 hour.
              </p>
            </div>
            <Button asChild>
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        )}

        {/* Success */}
        {tokenStatus === 'valid' && success && (
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been reset successfully. You can now sign in.
              </p>
            </div>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Sign in now
            </Button>
          </div>
        )}

        {/* Form */}
        {tokenStatus === 'valid' && !success && (
          <>
            <div className="space-y-1.5">
              <Link
                href="/sign-in"
                className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to sign in
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        {...register('password')}
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={cn('pr-10', errors.password && 'border-destructive')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPwd ? 'Hide' : 'Show'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <div className="relative">
                      <Input
                        {...register('confirm')}
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className={cn('pr-10', errors.confirm && 'border-destructive')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide' : 'Show'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirm && (
                      <p className="text-xs text-destructive">{errors.confirm.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
                    {isSubmitting || isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Reset password'
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
