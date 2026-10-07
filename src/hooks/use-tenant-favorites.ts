import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  addFavorite,
  fetchFavoriteIds,
  removeFavorite,
} from "../services/tenant-discovery.service";

export function useTenantFavorites(onChanged?: () => void) {
  const { user } = useAuth();
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
      setReady(false);
      if (user)
        void fetchFavoriteIds()
          .then((value) => {
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
    }, [user?.id, revision]),
  );
  const toggle = async (id: string) => {
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
