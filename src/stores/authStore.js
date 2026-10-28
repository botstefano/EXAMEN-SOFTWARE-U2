import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: "demo-token-admin",
      refreshToken: "demo-refresh-token",
      user: {
        id: "u-admin-1",
        email: "admin@phishguard.bank",
        full_name: "Elena Navarro (Admin)",
        roles: ["admin"],
        mfa_enabled: false,
      },
      setTokens: (accessToken, refreshToken, user = null) =>
        set((state) => ({ accessToken, refreshToken, user: user || state.user })),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "pg-auth" }
  )
);
