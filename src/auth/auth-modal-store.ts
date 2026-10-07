import { useSyncExternalStore } from "react";

// State for the Log in / Sign up pop-up shown over the marketplace. It only
// controls presentation; signing in still goes through the existing auth code.
export type AuthModalState = {
  open: boolean;
  mode: "login" | "register";
  reason: string;
};
let state: AuthModalState = { open: false, mode: "login", reason: "" };
const listeners = new Set<() => void>();
function set(next: AuthModalState) {
  state = next;
  for (const listener of listeners) listener();
}
export function openAuthModal(
  reason = "",
  mode: AuthModalState["mode"] = "login",
) {
  set({ open: true, mode, reason: reason.slice(0, 120) });
}
export function setAuthModalMode(mode: AuthModalState["mode"]) {
  if (state.open) set({ ...state, mode });
}
export function closeAuthModal() {
  if (state.open) set({ ...state, open: false });
}
export const getAuthModalState = () => state;
export function subscribeAuthModal(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useAuthModal() {
  return useSyncExternalStore(
    subscribeAuthModal,
    getAuthModalState,
    getAuthModalState,
  );
}
