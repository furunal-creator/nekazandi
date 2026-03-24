import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string | null;
  isPremium: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ user: User | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: () => apiGet("/api/auth/me"),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiPost<User>("/api/auth/login", creds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string; name?: string; kvkkConsent: boolean }) =>
      apiPost<User>("/api/auth/register", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiPost("/api/auth/logout", {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
  });

  const upgradeMutation = useMutation({
    mutationFn: () => apiPost("/api/premium/upgrade", {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }); },
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    isPremium: !!data?.user?.isPremium,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    upgradeToPremium: upgradeMutation.mutateAsync,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
}
