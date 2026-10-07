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
  rejectApplication,
} from "../services/application.service";
import type {
  ApplicationDetails,
  ApplicationStatus,
} from "../types/application";
import { useAuth } from "../auth/useAuth";

export const applicationStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, paddingBottom: 40, gap: 14 },
  title: { fontSize: 28, fontWeight: "700", color: "#0F172A", marginTop: 20 },
  heading: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  body: { fontSize: 14, lineHeight: 21, color: "#64748B" },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
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
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  link: { color: "#1D4ED8", fontWeight: "700", fontSize: 15 },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 21 },
  success: { color: "#15803D", fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
});
const colors: Record<ApplicationStatus, string> = {
  pending: "#B45309",
  approved: "#15803D",
  rejected: "#B91C1C",
};
export function ApplicationCard({
  application,
  landlord,
  children,
}: {
  application: ApplicationDetails;
  landlord: boolean;
  children?: React.ReactNode;
}) {
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
            : "No specific room / Property inquiry (or room removed)"}
      </Text>
      {landlord && (
        <Text style={applicationStyles.body}>
          {application.tenantName || `Applicant ${application.tenant_id}`}
        </Text>
      )}
      <Text
        style={{
          color: colors[application.status] ?? "#64748B",
          fontWeight: "700",
        }}
      >
        {application.status.toUpperCase()}
      </Text>
      <Text style={applicationStyles.body}>
        Submitted {new Date(application.created_at).toLocaleString("en-PH")}
      </Text>
      {!!application.message && (
        <Text style={applicationStyles.body}>{application.message}</Text>
      )}
      {children}
    </View>
  );
}
export function ApplicationList({
  mode,
  submitted = false,
}: {
  mode: "tenant" | "landlord";
  submitted?: boolean;
}) {
  const landlord = mode === "landlord";
  const list = useApplications(mode);
  const { user } = useAuth();
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const active = useRef(false),
    lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    id: string;
    status: "approved" | "rejected";
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
      await (confirmation.status === "approved"
        ? approveApplication(confirmation.id)
        : rejectApplication(confirmation.id));
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
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {landlord && (
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(owner)/properties")
            }
          >
            <Text style={styles.link}>Back to listings</Text>
          </Pressable>
        )}
        <Text style={styles.title}>
          {landlord ? "Rental Applications" : "My Applications"}
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
            {!list.applications.length && (
              <Text style={styles.body}>
                {landlord
                  ? "No applications for your properties yet."
                  : "Your accommodation applications will appear here."}
              </Text>
            )}
            {list.applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                landlord={landlord}
              >
                {landlord &&
                  application.status === "pending" &&
                  (confirmation?.id === application.id ? (
                    <View style={{ gap: 12 }}>
                      <Text style={styles.body}>
                        {confirmation.status === "approved"
                          ? "Approve"
                          : "Reject"}{" "}
                        this application?{" "}
                        {confirmation.status === "approved"
                          ? "This changes its status; it does not reserve a room slot."
                          : "The tenant will see it as rejected."}
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
                          <Text style={styles.link}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <Pressable
                        disabled={busy}
                        onPress={() => {
                          setActionError("");
                          setConfirmation({
                            id: application.id,
                            status: "approved",
                          });
                        }}
                      >
                        <Text style={styles.link}>Approve</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => {
                          setActionError("");
                          setConfirmation({
                            id: application.id,
                            status: "rejected",
                          });
                        }}
                      >
                        <Text style={styles.error}>Reject</Text>
                      </Pressable>
                    </View>
                  ))}
              </ApplicationCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
