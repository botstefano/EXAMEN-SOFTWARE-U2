import { useQuery } from "@tanstack/react-query";
import { A } from "../api/client";
import { useAuthStore } from "../stores/authStore";

export function usePermissions() {
  const token = useAuthStore((s) => s.accessToken);
  const { data: me, isLoading } = useQuery({
    queryKey: ["me", token],
    queryFn: A.me,
    enabled: !!token,
    staleTime: 300000,
  });
  const roles = me?.roles ?? [];
  const perms = new Set(me?.permissions ?? []);
  const isAdmin = roles.includes("admin");
  return {
    me,
    isLoading,
    roles,
    isAdmin,
    has: (c) => !c || isAdmin || perms.has(c),
  };
}
