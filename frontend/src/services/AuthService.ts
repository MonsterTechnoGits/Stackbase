import '@/api/client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authClient } from '@/contexts/AuthContext';
import { getApiMeOptions, getApiMeQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function useGetProfile() {
  return useQuery(getApiMeOptions());
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const result = await authClient.updateUser(payload);
      if (result.error) throw new Error(result.error.message ?? 'Update failed');
      return result.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: getApiMeQueryKey() });
      toast.success('Profile updated');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to update profile');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const result = await authClient.changePassword(payload);
      if (result.error) throw new Error(result.error.message ?? 'Password change failed');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to change password');
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Sign out failed');
    },
    onSuccess: () => {
      qc.clear();
      window.location.href = '/';
    },
    onError: () => {
      toast.error('Failed to sign out');
    },
  });
}
