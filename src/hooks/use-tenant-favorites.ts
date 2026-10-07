import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { rememberFavorite, takeFavorite } from "../auth/auth-intent";
import { useAuth } from "../auth/useAuth";
import { useRequireAuth } from "../auth/use-require-auth";
import {
  addFavorite,
  fetchFavoriteIds,
  removeFavorite,
} from "../services/tenant-discovery.service";

export function useTenantFavorites(onChanged?: () => void) {
  const { user } = useAuth();
  const { signedIn, requireAuth } = useRequireAuth();
  const [ids, setIds] = useState<string[]>([]),
    [busy, setBusy] = useState<string[]>([]),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const pending = useRef(new Set<string>());
  const scope = useRef({ userId: user?.id, active: false });
  useFocusEffect(
    useCallback(() => {
      const current = { userId: user?.id, active: true };
      scope.current = current;
      setIds([]);
      setError("");
      setReady(!signedIn);
      if (signedIn)
        void fetchFavoriteIds()
          .then(async (value) => {
            // Finish a save the user started as a guest. addFavorite is
            // idempotent, and an already-saved property is left alone.
            const wanted = takeFavorite();
            if (wanted && !value.includes(wanted)) {
              await addFavorite(wanted);
              value = [...value, wanted];
              if (current.active) onChanged?.();
            }
            if (current.active) {
              setIds(value);
              setReady(true);
            }
          })
          .catch((e: unknown) => {
            if (current.active)
              setError(
                e instanceof Error ? e.message : "Unable to load favorites.",
              );
          });
      return () => {
        current.active = false;
      };
    }, [user?.id, signedIn, revision]),
  );
  const toggle = async (id: string) => {
    if (!requireAuth("Log in to save this property.")) {
      rememberFavorite(id);
      return;
    }
    if (!ready || pending.current.has(id)) return;
    const current = scope.current;
    pending.current.add(id);
    setBusy([...pending.current]);
    setError("");
    try {
      const saved = ids.includes(id);
      await (saved ? removeFavorite(id) : addFavorite(id));
      if (current.active && scope.current === current) {
        setIds((value) =>
          saved ? value.filter((v) => v !== id) : [...new Set([...value, id])],
        );
        onChanged?.();
      }
    } catch (e: unknown) {
      if (current.active && scope.current === current)
        setError(
          e instanceof Error ? e.message : "Unable to update favorites.",
        );
    } finally {
      pending.current.delete(id);
      setBusy([...pending.current]);
    }
  };
  return {
    ids,
    busy,
    error,
    ready,
    toggle,
    retry: () => setRevision((value) => value + 1),
  };
}
