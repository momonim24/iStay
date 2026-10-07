import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplications } from "../hooks/use-applications";
import {
  approveApplication,
  cancelApplication,
  rejectApplication,
} from "../services/application.service";
import { rentLabel } from "../services/tenant-discovery.service";
import { Badge, Chip, statusStyles } from "./ui";
import type {
  ApplicationDetails,
  ApplicationStatus,
} from "../types/application";
import { useAuth } from "../auth/useAuth";

export const applicationStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  heading: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  body: { fontSize: 14, lineHeight: 21, color: "#64748B" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  image: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  button: {
    backgroundColor: "#1D4ED8",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  link: { color: "#1D4ED8", fontWeight: "700", fontSize: 15 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 21 },
  success: { color: "#15803D", fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
});
const statuses = statusStyles;
const filters = [
  "all",
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;
type Decision = "approved" | "rejected" | "cancelled";
const prompts: Record<Decision, string> = {
  approved:
    "Approve this application? This changes its status; it does not reserve a room slot.",
  rejected: "Reject this application? The tenant will see it as rejected.",
  cancelled:
    "Cancel this application? This cannot be undone; you would need to apply again.",
};
export function ApplicationCard({
  application,
  landlord,
  detailed = false,
  children,
}: {
  application: ApplicationDetails;
  landlord: boolean;
  detailed?: boolean;
  children?: React.ReactNode;
}) {
  const status = statuses[application.status] ?? {
    ...statuses.cancelled,
    label: String(application.status),
  };
  const { property, room } = application;
  return (
    <View style={applicationStyles.card}>
      {property?.image && (
        <Image
          source={{ uri: property.image }}
          style={applicationStyles.image}
        />
      )}
      <Text style={applicationStyles.heading}>
        {property?.name || "Property information unavailable"}
      </Text>
      {property && (
        <Text style={applicationStyles.body}>
          {[
            property.address,
            property.barangay,
            property.city,
            property.province,
          ]
            .filter(Boolean)
            .join(", ")}
        </Text>
      )}
      <Text style={applicationStyles.body}>
        {room
          ? `Room: ${room.name}`
          : application.room_id
            ? "Room information unavailable"
            : "No specific room (or room removed)"}
      </Text>
      {(room || property) && (
        <Text style={applicationStyles.link}>
          {rentLabel((room ?? property!).monthly_rent)}
        </Text>
      )}
      {detailed && room && (
        <Text style={applicationStyles.body}>
          Capacity: {room.capacity} · Available slots: {room.available_slots}
        </Text>
      )}
      {detailed && property?.security_deposit != null && (
        <Text style={applicationStyles.body}>
          Security deposit: ₱{property.security_deposit.toLocaleString("en-PH")}
        </Text>
      )}
      {landlord && (
        <Text style={applicationStyles.body}>
          {application.tenantName || `Applicant ${application.tenant_id}`}
        </Text>
      )}
      <Badge {...status} />
      <Text style={applicationStyles.body}>
        Submitted {new Date(application.created_at).toLocaleString("en-PH")}
      </Text>
      {detailed && application.updated_at !== application.created_at && (
        <Text style={applicationStyles.body}>
          Last updated{" "}
          {new Date(application.updated_at).toLocaleString("en-PH")}
        </Text>
      )}
      {!!application.message && (
        <Text style={applicationStyles.body}>
          {landlord ? "Tenant message" : "Your message"}: {application.message}
        </Text>
      )}
      {children}
    </View>
  );
}
export function ApplicationList({
  mode,
  submitted = false,
  applicationId,
}: {
  mode: "tenant" | "landlord";
  submitted?: boolean;
  // When set, the screen shows only this application with full details.
  applicationId?: string;
}) {
  const landlord = mode === "landlord";
  const detailed = applicationId !== undefined;
  const list = useApplications(mode, applicationId);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const { user } = useAuth();
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const active = useRef(false),
    lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    id: string;
    status: Decision;
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const [feedback, setFeedback] = useState("");
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setConfirmation(null);
      setActionError("");
      setFeedback("");
      setBusy(lock.current);
      return () => {
        active.current = false;
      };
    }, [user?.id]),
  );
  async function confirm() {
    if (!confirmation || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    const userId = user?.id;
    try {
      await {
        approved: approveApplication,
        rejected: rejectApplication,
        cancelled: cancelApplication,
      }[confirmation.status](confirmation.id);
      if (active.current && identity.current === userId) {
        setFeedback(`Application ${confirmation.status}.`);
        setConfirmation(null);
        list.refresh();
      }
    } catch (error) {
      if (active.current && identity.current === userId) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Unable to update this application. Please try again.",
        );
        setConfirmation(null);
        list.refresh();
      }
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  const styles = applicationStyles;
  const visible = list.applications.filter(
    (application) => filter === "all" || application.status === filter,
  );
  const ask = (id: string, status: Decision) => {
    setActionError("");
    setFeedback("");
    setConfirmation({ id, status });
  };
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {detailed ? (
          <Pressable
            disabled={busy}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace(
                    landlord
                      ? "/(owner)/(tabs)/applications"
                      : "/(tenant)/(tabs)/applications",
                  )
            }
          >
            <Text style={styles.link}>Back to applications</Text>
          </Pressable>
        ) : (
          landlord && (
            <Pressable
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace("/(owner)/(tabs)/properties")
              }
            >
              <Text style={styles.link}>Back to listings</Text>
            </Pressable>
          )
        )}
        <Text style={styles.title}>
          {detailed
            ? "Application Details"
            : landlord
              ? "Rental Applications"
              : "My Applications"}
        </Text>
        {submitted && (
          <Text style={styles.success}>
            Application submitted successfully. Your landlord will review it.
          </Text>
        )}
        {!!feedback && <Text style={styles.success}>{feedback}</Text>}
        {!!actionError && (
          <Text style={styles.error} accessibilityRole="alert">
            {actionError}
          </Text>
        )}
        {list.loading ? (
          <View style={{ gap: 12 }}>
            <ActivityIndicator color="#1D4ED8" />
            <Text style={styles.body}>Loading applications…</Text>
          </View>
        ) : list.error ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.error}>{list.error}</Text>
            <Pressable onPress={list.refresh}>
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable disabled={busy} onPress={list.refresh}>
              <Text style={styles.link}>Refresh</Text>
            </Pressable>
            {!detailed && (
              <View style={styles.actions}>
                {filters.map((value) => (
                  <Chip
                    key={value}
                    label={value === "all" ? "All" : statuses[value].label}
                    selected={filter === value}
                    onPress={() => setFilter(value)}
                  />
                ))}
              </View>
            )}
            {!visible.length && (
              <Text style={styles.body}>
                {detailed
                  ? "This application could not be found, or you do not have access to it."
                  : filter !== "all"
                    ? `No ${statuses[filter].label.toLowerCase()} applications.`
                    : landlord
                      ? "No applications for your properties yet."
                      : "Your accommodation applications will appear here."}
              </Text>
            )}
            {visible.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                landlord={landlord}
                detailed={detailed}
              >
                {!detailed && (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      router.push({
                        pathname: landlord
                          ? "/(owner)/application/[id]"
                          : "/(tenant)/application/[id]",
                        params: { id: application.id },
                      })
                    }
                  >
                    <Text style={styles.link}>View details</Text>
                  </Pressable>
                )}
                {application.status === "pending" &&
                  (confirmation?.id === application.id ? (
                    <View style={{ gap: 12 }}>
                      <Text style={styles.body}>
                        {prompts[confirmation.status]}
                      </Text>
                      <View style={styles.actions}>
                        <Pressable
                          style={[styles.button, busy && { opacity: 0.5 }]}
                          disabled={busy}
                          onPress={() => void confirm()}
                        >
                          <Text style={styles.buttonText}>
                            {busy ? "Updating…" : "Confirm"}
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => setConfirmation(null)}
                        >
                          <Text style={styles.link}>Not now</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : landlord ? (
                    <View style={styles.actions}>
                      <Pressable
                        disabled={busy}
                        onPress={() => ask(application.id, "approved")}
                      >
                        <Text style={styles.link}>Approve</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => ask(application.id, "rejected")}
                      >
                        <Text style={styles.error}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      disabled={busy}
                      onPress={() => ask(application.id, "cancelled")}
                    >
                      <Text style={styles.error}>Cancel application</Text>
                    </Pressable>
                  ))}
              </ApplicationCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
