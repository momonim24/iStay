import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { secureStorage } from "../lib/storage";
import { supabase, requireSupabase } from "../lib/supabase";
import { exchangeAuthLink } from "../services/auth.service";
import type { AuthContextValue } from "./auth-context";
import { authErrorMessage } from "./auth-errors";
import { parseAuthLink } from "./auth-links";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
const RECOVERY_KEY = "istay.recovery-user";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [handlingLink, setHandlingLink] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef(new Map<string, Promise<void>>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pendingLinks = useRef(0);
  const authRevision = useRef(0);

  const handleAuthUrl = useCallback((url: string): Promise<void> => {
    const origin =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : undefined;
    const link = parseAuthLink(url, origin);
    // Ordinary navigation to verify/reset is not a callback.
    if (!link || (!link.code && !link.errorCode)) return Promise.resolve();
    const existing = callbacks.current.get(url);
    if (existing) return existing;
    pendingLinks.current += 1;
    setHandlingLink(true);
    const work = queue.current.then(async () => {
      setLinkError(null);
      try {
        const result = await exchangeAuthLink(link);
        // Persist recovery before releasing the navigation gate.
        if (result.recovering)
          await secureStorage.setItem(RECOVERY_KEY, result.session.user.id);
        else await secureStorage.removeItem(RECOVERY_KEY);
        setRecovering(result.recovering);
        setSession(result.session);
      } catch (error) {
        setLinkError(authErrorMessage(error));
        throw error;
      } finally {
        // Remove single-use codes from browser history after consumption.
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.history.replaceState(
            window.history.state,
            "",
            window.location.pathname,
          );
        }
        pendingLinks.current -= 1;
        if (pendingLinks.current === 0) setHandlingLink(false);
      }
    });
    queue.current = work.catch(() => undefined);
    callbacks.current.set(url, work);
    if (callbacks.current.size > 5) {
      const first = callbacks.current.keys().next().value;
      if (first) callbacks.current.delete(first);
    }
    return work;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let active = true;
    setLoading(true);
    setInitializationError(null);

    // Keep this callback synchronous: awaiting another Auth call can deadlock.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event !== "INITIAL_SESSION") authRevision.current += 1;
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
    });

    const restore = async () => {
      try {
        const revision = authRevision.current;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        let restored = data.session;
        if (restored) {
          // Validate the saved identity with Auth before opening tenant routes.
          const { data: verified, error: userError } =
            await client.auth.getUser();
          if (userError) {
            if (
              userError.status === 401 ||
              userError.status === 403 ||
              userError.code === "session_not_found"
            ) {
              await client.auth.signOut({ scope: "local" });
              restored = null;
            } else {
              throw userError;
            }
          } else {
            restored = { ...restored, user: verified.user };
          }
        }
        const recoveryUser = await secureStorage.getItem(RECOVERY_KEY);
        if (!active) return;
        if (authRevision.current === revision) setSession(restored);
        setRecovering(Boolean(restored && recoveryUser === restored.user.id));
        const initialUrl =
          Platform.OS === "web" && typeof window !== "undefined"
            ? window.location.href
            : await Linking.getInitialURL();
        if (initialUrl && active)
          await handleAuthUrl(initialUrl).catch(() => undefined);
      } catch (error) {
        if (active) setInitializationError(authErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    };
    const restoration = restore();

    const links = Linking.addEventListener("url", ({ url }) => {
      // A warm callback arriving during startup must not race session restore.
      void restoration.then(() => handleAuthUrl(url)).catch(() => undefined);
    });
    const refresh = (state: string) => {
      if (Platform.OS === "web") return;
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener("change", refresh);
    return () => {
      active = false;
      subscription.unsubscribe();
      links.remove();
      appState.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, [attempt, handleAuthUrl]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    handlingLink,
    recovering,
    initializationError,
    linkError,
    clearLinkError: () => setLinkError(null),
    retryInitialization: () => setAttempt((value) => value + 1),
    handleAuthUrl,
    completeRecovery: async () => {
      await secureStorage.removeItem(RECOVERY_KEY);
      setRecovering(false);
      setLinkError(null);
    },
    signOut: async () => {
      const { error } = await requireSupabase().auth.signOut({
        scope: "local",
      });
      if (error) throw error;
      setSession(null);
      setRecovering(false);
      setLinkError(null);
      await secureStorage.removeItem(RECOVERY_KEY);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
