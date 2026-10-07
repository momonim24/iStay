import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/auth/useAuth";
import { applicationStyles as styles } from "../../../src/components/application-list";
import {
  findRelevantApplication,
  submitApplication,
} from "../../../src/services/application.service";
import {
  fetchTenantProperty,
  rentLabel,
  TenantProperty,
  validPropertyId,
} from "../../../src/services/tenant-discovery.service";

export default function ApplyScreen() {
  const params = useLocalSearchParams<{
    propertyId?: string | string[];
    roomId?: string | string[];
  }>();
  const id = typeof params.propertyId === "string" ? params.propertyId : "";
  const initialRoom = typeof params.roomId === "string" ? params.roomId : null;
  const { user } = useAuth();
  const [property, setProperty] = useState<TenantProperty | null>(null);
  const [roomId, setRoomId] = useState<string | null>(initialRoom);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [duplicate, setDuplicate] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef(false),
    locked = useRef(false),
    completed = useRef(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const target = useRef(id);
  target.current = id;
  useEffect(() => {
    setRoomId(initialRoom);
    setMessage("");
    completed.current = false;
  }, [id, initialRoom, user?.id]);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      active.current = true;
      setProperty(null);
      setLoading(true);
      setLoadError("");
      setSubmitError("");
      setBusy(locked.current);
      if (!user || !validPropertyId(id)) {
        setLoadError(
          !user
            ? "Please sign in again to apply."
            : "This property link is invalid.",
        );
        setLoading(false);
      } else {
        void fetchTenantProperty(id)
          .then((row) => {
            if (current) {
              setProperty(row);
              if (!row)
                setLoadError(
                  "This property is no longer available for applications.",
                );
            }
          })
          .catch(() => {
            if (current)
              setLoadError("Unable to load this property. Please try again.");
          })
          .finally(() => {
            if (current) setLoading(false);
          });
      }
      return () => {
        current = false;
        active.current = false;
      };
    }, [id, user?.id, revision]),
  );
  const roomValid =
    roomId === null || !!property?.rooms.some((room) => room.id === roomId);
  useEffect(() => {
    let current = true;
    setDuplicate("");
    setChecking(true);
    if (!property || !roomValid) {
      setChecking(false);
      return;
    }
    void findRelevantApplication(id, roomId)
      .then((row) => {
        if (current && row)
          setDuplicate(
            `You already have a ${row.status} application for this property and room. Check My Applications.`,
          );
      })
      .catch(() => {
        if (current)
          setDuplicate(
            "Unable to check existing applications. Please retry before submitting.",
          );
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [property, id, roomId, roomValid, user?.id]);
  async function submit() {
    if (
      locked.current ||
      completed.current ||
      !property ||
      !roomValid ||
      checking ||
      duplicate
    )
      return;
    locked.current = true;
    setBusy(true);
    setSubmitError("");
    const userId = user?.id;
    try {
      await submitApplication({ propertyId: id, roomId, message });
      if (identity.current === userId && target.current === id)
        completed.current = true;
      if (
        active.current &&
        identity.current === userId &&
        target.current === id
      )
        router.replace({
          pathname: "/(tenant)/(tabs)/applications",
          params: { submitted: "1" },
        });
    } catch (error) {
      if (
        active.current &&
        identity.current === userId &&
        target.current === id
      )
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to submit your application. Please try again.",
        );
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          disabled={busy}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tenant)/(tabs)")
          }
        >
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Apply for Accommodation</Text>
        {loading && (
          <>
            <ActivityIndicator color="#1D4ED8" />
            <Text style={styles.body}>Loading property…</Text>
          </>
        )}
        {!!loadError && (
          <>
            <Text style={styles.error}>{loadError}</Text>
            <Pressable onPress={() => setRevision((value) => value + 1)}>
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          </>
        )}
        {property && !loading && (
          <>
            {property.image && (
              <Image source={{ uri: property.image }} style={styles.image} />
            )}
            <Text style={styles.heading}>{property.name}</Text>
            <Text style={styles.body}>{property.property_type}</Text>
            <Text style={styles.body}>
              {[
                property.address,
                property.barangay,
                property.city,
                property.province,
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
            <Text style={styles.link}>
              {rentLabel(property.monthly_rent)} (property rent)
            </Text>
            <Text style={styles.heading}>
              Choose a room or property inquiry
            </Text>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: roomId === null, disabled: busy }}
              disabled={busy}
              style={[
                styles.card,
                roomId === null && { borderColor: "#1D4ED8" },
              ]}
              onPress={() => {
                setRoomId(null);
                setSubmitError("");
              }}
            >
              <Text style={styles.heading}>
                {roomId === null ? "✓ " : ""}No specific room / Property inquiry
              </Text>
              <Text style={styles.body}>
                Apply about the property without requesting a particular room.
              </Text>
            </Pressable>
            {!property.rooms.length && (
              <Text style={styles.body}>
                No rooms currently have available slots. You can send a property
                inquiry.
              </Text>
            )}
            {property.rooms.map((room) => (
              <Pressable
                key={room.id}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: roomId === room.id,
                  disabled: busy,
                }}
                disabled={busy}
                style={[
                  styles.card,
                  roomId === room.id && { borderColor: "#1D4ED8" },
                ]}
                onPress={() => {
                  setRoomId(room.id);
                  setSubmitError("");
                }}
              >
                <Text style={styles.heading}>
                  {roomId === room.id ? "✓ " : ""}
                  {room.name}
                </Text>
                <Text style={styles.link}>{rentLabel(room.monthly_rent)}</Text>
                <Text style={styles.body}>
                  Capacity: {room.capacity} · Available slots:{" "}
                  {room.available_slots}
                </Text>
                {!!room.description && (
                  <Text style={styles.body}>{room.description}</Text>
                )}
              </Pressable>
            ))}
            {!roomValid && (
              <Text style={styles.error}>
                Your selected room is no longer available for this property.
                Choose another room or a property inquiry.
              </Text>
            )}
            <Text style={styles.heading}>Message (optional)</Text>
            <TextInput
              accessibilityLabel="Application message"
              placeholder="Introduce yourself or ask a question"
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              editable={!busy}
              multiline
              maxLength={2000}
              style={[
                styles.card,
                { minHeight: 110, textAlignVertical: "top", color: "#0F172A" },
              ]}
            />
            {checking && (
              <Text style={styles.body}>Checking existing applications…</Text>
            )}
            {!!duplicate && (
              <>
                <Text style={styles.body}>{duplicate}</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => setRevision((value) => value + 1)}
                >
                  <Text style={styles.link}>Retry check</Text>
                </Pressable>
              </>
            )}
            {!!submitError && (
              <Text style={styles.error} accessibilityRole="alert">
                {submitError}
              </Text>
            )}
            <Pressable
              disabled={busy || checking || !!duplicate || !roomValid}
              style={[
                styles.button,
                (busy || checking || !!duplicate || !roomValid) && {
                  opacity: 0.5,
                },
              ]}
              onPress={() => void submit()}
            >
              <Text style={styles.buttonText}>
                {busy ? "Submitting…" : "Submit Application"}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => router.push("/(tenant)/(tabs)/applications")}
            >
              <Text style={styles.link}>View My Applications</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
