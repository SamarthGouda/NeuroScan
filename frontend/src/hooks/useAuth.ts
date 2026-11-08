import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/user", { credentials: "include" });
        if (res.status === 401 || res.status === 403) {
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        return await res.json();
      } catch (err) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Login failed" }));
        const err: any = new Error(errorData.detail || errorData.message || "Invalid credentials");
        err.isUnverified = res.headers.get("x-email-unverified") === "true" || (errorData.detail && errorData.detail.includes("not been verified"));
        throw err;
      }
      return await res.json();
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData(["/api/auth/user"], newUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; full_name: string; password: string; role?: string; title?: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(errorData.detail || errorData.message || "Registration failed");
      }
      return await res.json();
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Verification failed" }));
        throw new Error(errorData.detail || errorData.message || "Invalid or expired verification code");
      }
      return await res.json();
    },
    onSuccess: (verifiedUser) => {
      queryClient.setQueryData(["/api/auth/user"], verifiedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to switch role" }));
        throw new Error(errorData.detail || errorData.message || "Role switch failed");
      }
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const googleVerifyMutation = useMutation({
    mutationFn: async (payload: { credential?: string; code?: string; state?: string }) => {
      const res = await fetch("/api/auth/google/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Google sign-in failed" }));
        throw new Error(errorData.detail || errorData.message || "Google sign-in failed");
      }
      return await res.json();
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData(["/api/auth/user"], newUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/login";
    },
  });

  const authorizedRoles = user?.roles || (user?.role ? [user.role] : []);
  const hasMultipleRoles = authorizedRoles.length > 1;

  return {
    user: user ?? null,
    isLoading,
    isError,
    isTransientError: false,
    error,
    isAuthenticated: !!user,
    roles: authorizedRoles,
    hasMultipleRoles,
    isDoctor: user?.role === "doctor",
    isTechnician: user?.role === "technician",
    isAdmin: user?.role === "admin",
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    verifyEmail: verifyEmailMutation.mutateAsync,
    isVerifyingEmail: verifyEmailMutation.isPending,
    switchRole: switchRoleMutation.mutateAsync,
    isSwitchingRole: switchRoleMutation.isPending,
    googleVerify: googleVerifyMutation.mutateAsync,
    isGoogleVerifying: googleVerifyMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
