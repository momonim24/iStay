import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/auth/useAuth";
import { applicationStyles as styles } from "../../../src/components/application-list";
import {
  findRelevantApplication,
  ownPropertyMessage,
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
  // "duplicate" is a completed check that found an application (a business
  // rule); "checkError" is a check that could not complete (retryable).
  const [duplicate, setDuplicate] = useState("");
  const [checkError, setCheckError] = useState("");
  const [checkRevision, setCheckRevision] = useState(0);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
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
    setReviewing(false);
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
  // The schema supports room_id, so an available room is always required.
  const selected = property?.rooms.find((room) => room.id === roomId) ?? null;
  const roomValid = selected !== null;
  const own = !!property && !!user && property.owner_id === user.id;
  const location = property
    ? [property.address, property.barangay, property.city, property.province]
        .filter(Boolean)
        .join(", ")
    : "";
  useEffect(() => {
    let current = true;
    setDuplicate("");
    setCheckError("");
    setChecking(true);
    if (!property || !roomValid || own) {
      setChecking(false);
      return;
    }
    void findRelevantApplication(id, selected.id)
      .then((row) => {
        if (current && row)
          setDuplicate(
            `You already have ${row.status === "approved" ? "an approved" : "a pending"} application for this room.`,
          );
      })
      .catch(() => {
        if (current)
          setCheckError(
            "Unable to check your existing applications. Please retry before submitting.",
          );
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [property, id, roomId, roomValid, user?.id, checkRevision]);
  async function submit() {
    if (
      locked.current ||
      completed.current ||
      !property ||
      !selected ||
      own ||
      checking ||
      duplicate ||
      checkError
    )
      return;
    locked.current = true;
    setBusy(true);
    setSubmitError("");
    const userId = user?.id;
    try {
      await submitApplication({
        propertyId: id,
        roomId: selected.id,
        message,
      });
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
        {property && !loading && own && (
          <>
            <Text style={styles.heading}>{property.name}</Text>
            <Text style={styles.error} accessibilityRole="alert">
              {ownPropertyMessage}
            </Text>
          </>
        )}
        {property && !loading && !own && (
          <>
            {property.image && (
              <Image source={{ uri: property.image }} style={styles.image} />
            )}
            <Text style={styles.heading}>{property.name}</Text>
            <Text style={styles.body}>{property.property_type}</Text>
            <Text style={styles.body}>{location}</Text>
            {!reviewing && (
              <>
                <Text style={styles.heading}>Choose an available room</Text>
                {!property.rooms.length && (
                  <Text style={styles.body}>
                    No rooms currently have available slots, so this property is
                    not accepting applications right now.
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
                    <Text style={styles.link}>
                      {rentLabel(room.monthly_rent)}
                    </Text>
                    <Text style={styles.body}>
                      Capacity: {room.capacity} · Available slots:{" "}
                      {room.available_slots}
                    </Text>
                    {!!room.description && (
                      <Text style={styles.body}>{room.description}</Text>
                    )}
                  </Pressable>
                ))}
                {!!property.rooms.length &&
                  !roomValid &&
                  (roomId === null ? (
                    <Text style={styles.body}>Select a room to continue.</Text>
                  ) : (
                    <Text style={styles.error}>
                      Your selected room is no longer available for this
                      property. Choose another room.
                    </Text>
                  ))}
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
                    {
                      minHeight: 110,
                      textAlignVertical: "top",
                      color: "#0F172A",
                    },
                  ]}
                />
              </>
            )}
            {reviewing && selected && (
              <View style={styles.card}>
                <Text style={styles.heading}>Review your application</Text>
                <Text style={styles.body}>Property: {property.name}</Text>
                <Text style={styles.body}>Location: {location}</Text>
                <Text style={styles.body}>Room: {selected.name}</Text>
                <Text style={styles.link}>
                  {rentLabel(selected.monthly_rent)}
                </Text>
                <Text style={styles.body}>
                  Capacity: {selected.capacity} · Available slots:{" "}
                  {selected.available_slots}
                </Text>
                {property.security_deposit != null && (
                  <Text style={styles.body}>
                    Security deposit: ₱
                    {property.security_deposit.toLocaleString("en-PH")}
                  </Text>
                )}
                <Text style={styles.body}>
                  Message: {message.trim() || "None"}
                </Text>
              </View>
            )}
            {checking && (
              <Text style={styles.body}>Checking existing applications…</Text>
            )}
            {!!duplicate && (
              <View style={styles.card}>
                <Text style={styles.heading}>{duplicate}</Text>
                <Text style={styles.body}>
                  You can follow its status in My Applications, or choose a
                  different room.
                </Text>
                <Pressable
                  disabled={busy}
                  style={styles.button}
                  onPress={() => router.push("/(tenant)/(tabs)/applications")}
                >
                  <Text style={styles.buttonText}>View My Applications</Text>
                </Pressable>
              </View>
            )}
            {!!checkError && (
              <>
                <Text style={styles.error}>{checkError}</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => setCheckRevision((value) => value + 1)}
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
            {reviewing && selected ? (
              <>
                <Pressable
                  disabled={busy || checking || !!duplicate || !!checkError || !roomValid}
                  style={[
                    styles.button,
                    (busy || checking || !!duplicate || !!checkError || !roomValid) && {
                      opacity: 0.5,
                    },
                  ]}
                  onPress={() => void submit()}
                >
                  <Text style={styles.buttonText}>
                    {busy ? "Submitting…" : "Submit Application"}
                  </Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => setReviewing(false)}>
                  <Text style={styles.link}>Edit application</Text>
                </Pressable>
              </>
            ) : duplicate ? null : (
              <Pressable
                disabled={busy || checking || !!duplicate || !!checkError || !roomValid}
                style={[
                  styles.button,
                  (busy || checking || !!duplicate || !!checkError || !roomValid) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={() => {
                  setSubmitError("");
                  setReviewing(true);
                }}
              >
                <Text style={styles.buttonText}>Review Application</Text>
              </Pressable>
            )}
            {!duplicate && (
              <Pressable
                disabled={busy}
                onPress={() => router.push("/(tenant)/(tabs)/applications")}
              >
                <Text style={styles.link}>View My Applications</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
