import { create } from "zustand";

export const useToastStore = create((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
}));

export const toast = {
  success: (m) => useToastStore.getState().push("success", m),
  error: (m) => useToastStore.getState().push("error", m),
  info: (m) => useToastStore.getState().push("info", m),
};

export const errMsg = (e, d = "Error") => {
  if (typeof e === "string") return e;
  const det = e?.response?.data?.detail || e?.message;
  return typeof det === "string" ? det : d;
};
