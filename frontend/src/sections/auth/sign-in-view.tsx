'use client';

import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { cn } from '@/lib/utils';
import { authClient } from '@/contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export function SignInView() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema as any) });

  const onSubmit = async (data: FormValues) => {
    const result = await authClient.signIn.email({ email: data.email, password: data.password });
    if (result.error) {
      toast.error(result.error.message ?? 'Login failed. Check your credentials.');
      return;
    }
    await authClient.getSession();
    toast.success('Welcome back!');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm">Enter your credentials to continue</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={cn(errors.email && 'border-destructive')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn('pr-10', errors.password && 'border-destructive')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                  <Link href="/forgot-password">Forgot password?</Link>
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Button variant="link" size="sm" asChild className="h-auto p-0 font-medium">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
