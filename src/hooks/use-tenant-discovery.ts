import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  DiscoveryFilters,
  fetchTenantProperties,
  isCancellationError,
  TenantProperty,
} from "../services/tenant-discovery.service";
import { useAuth } from "../auth/useAuth";

export function useTenantDiscovery(filters: DiscoveryFilters = {}) {
  const { user } = useAuth();
  const key = JSON.stringify(filters);
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let active = true;
      setLoading(true);
      setError("");
      setProperties([]);
      const timer = setTimeout(() => {
        void fetchTenantProperties(
          JSON.parse(key) as DiscoveryFilters,
          controller.signal,
        )
          .then((rows) => {
            if (active && !controller.signal.aborted) setProperties(rows);
          })
          .catch((e: unknown) => {
            if (active && !isCancellationError(e, controller.signal))
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to load properties. Please try again.",
              );
          })
          .finally(() => {
            if (active && !controller.signal.aborted) setLoading(false);
          });
      }, 300);
      return () => {
        active = false;
        clearTimeout(timer);
        controller.abort();
      };
    }, [key, revision, user?.id]),
  );
  return { properties, loading, error, retry: () => setRevision((r) => r + 1) };
}
