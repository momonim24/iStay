import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchLandlordApplication,
  fetchLandlordApplications,
  fetchTenantApplication,
  fetchTenantApplications,
} from "../services/application.service";
import type { ApplicationDetails } from "../types/application";

// With an id, loads that single application (as a list of zero or one).
export function useApplications(mode: "tenant" | "landlord", id?: string) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setApplications([]);
      setError("");
      setLoading(true);
      if (!user) {
        setError("Please sign in again to view applications.");
        setLoading(false);
        return () => {
          active = false;
        };
      }
      const single =
        mode === "tenant" ? fetchTenantApplication : fetchLandlordApplication;
      void (
        id !== undefined
          ? single(id).then((row) => (row ? [row] : []))
          : mode === "tenant"
            ? fetchTenantApplications()
            : fetchLandlordApplications()
      )
        .then((rows) => {
          if (active) setApplications(rows);
        })
        .catch((error: unknown) => {
          if (active)
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load applications. Please try again.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [mode, id, user?.id, revision]),
  );
  return {
    applications,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
