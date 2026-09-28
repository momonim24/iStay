import type { Session, User } from "@supabase/supabase-js";
export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  handlingLink: boolean;
  recovering: boolean;
  initializationError: string | null;
  linkError: string | null;
  clearLinkError: () => void;
  retryInitialization: () => void;
  handleAuthUrl: (url: string) => Promise<void>;
  completeRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
};
