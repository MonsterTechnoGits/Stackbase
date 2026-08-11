'use client';

import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { IconBox } from '@/components/common/icon-box';

import {
  MotionFade,
  MotionStagger,
  MotionStaggerItem,
  motion,
  tapSpring,
} from '@/components/motion';

import { useGetProfile, useUpdateProfile, useChangePassword } from '@/services/AuthService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── View ─────────────────────────────────────────────────────────────────────

export function ProfileView() {
  const { data: profileResponse, isLoading } = useGetProfile();
  const profile = profileResponse?.data;
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema as any),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (profile?.name) profileForm.reset({ name: profile.name });
  }, [profile?.name, profileForm]);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema as any),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    await updateProfile.mutateAsync({ name: values.name });
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    await changePassword.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    passwordForm.reset();
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <div className="flex items-center gap-5 rounded-xl border bg-card px-6 py-5">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-52" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </div>
        <Card>
          <CardHeader className="border-b pb-5">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b pb-5">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MotionFade>
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <MotionStagger className="flex flex-col gap-3">
          {/* ── Identity hero ──────────────────────────────────────────────── */}
          <MotionStaggerItem>
            <div className="flex items-center gap-5 rounded-xl border bg-card px-6 py-5">
              <Avatar className="h-16 w-16 shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarFallback variant="primary" className="text-lg">
                  {getInitials(profile?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight">
                  {profile?.name ?? '—'}
                </h1>
                <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
                {profile?.roleKey && (
                  <Badge variant="role" className="mt-1.5">
                    {profile.roleKey}
                  </Badge>
                )}
              </div>
            </div>
          </MotionStaggerItem>

          {/* ── Profile information ────────────────────────────────────────── */}
          <MotionStaggerItem>
            <Card>
              <CardHeader className="border-b pb-5">
                <div className="flex items-center gap-3">
                  <IconBox>
                    <User className="h-4 w-4" />
                  </IconBox>
                  <div>
                    <CardTitle className="text-base font-semibold">Profile information</CardTitle>
                    <CardDescription className="text-xs">
                      Your display name shown across the application
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-7 pb-7">
                <form onSubmit={onSaveProfile} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Display name</Label>
                    <Input
                      {...profileForm.register('name')}
                      id="name"
                      placeholder="Your full name"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-muted-foreground">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      value={profile?.email ?? ''}
                      disabled
                      className="cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground/60">
                      Email cannot be changed — contact your admin if needed
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <motion.div {...tapSpring}>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          !profileForm.formState.isDirty || profileForm.formState.isSubmitting
                        }
                      >
                        {profileForm.formState.isSubmitting && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        Save changes
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionStaggerItem>

          {/* ── Change password ────────────────────────────────────────────── */}
          <MotionStaggerItem>
            <Card>
              <CardHeader className="border-b pb-5">
                <div className="flex items-center gap-3">
                  <IconBox>
                    <Lock className="h-4 w-4" />
                  </IconBox>
                  <div>
                    <CardTitle className="text-base font-semibold">Change password</CardTitle>
                    <CardDescription className="text-xs">
                      Must be at least 8 characters. You&apos;ll stay signed in after changing.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-7 pb-7">
                <form onSubmit={onChangePassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current password</Label>
                    <div className="relative">
                      <Input
                        {...passwordForm.register('currentPassword')}
                        id="currentPassword"
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Enter your current password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowCurrent((v) => !v)}
                        tabIndex={-1}
                        aria-label={showCurrent ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        {...passwordForm.register('newPassword')}
                        id="newPassword"
                        type={showNew ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowNew((v) => !v)}
                        tabIndex={-1}
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        {...passwordForm.register('confirmPassword')}
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <motion.div {...tapSpring}>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={passwordForm.formState.isSubmitting}
                      >
                        {passwordForm.formState.isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        Update password
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionStaggerItem>
        </MotionStagger>
      </div>
    </MotionFade>
  );
}
