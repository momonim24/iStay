import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/useAuth";
import {
  getManagedProperty,
  isPropertyId,
  type ManagedProperty,
} from "../../services/property.service";
import {
  getAmenitiesForProperty,
  ManagementError,
} from "../../services/property-management.service";

export async function confirmChange(
  title: string,
  message: string,
): Promise<boolean> {
  if (Platform.OS === "web") return window.confirm(`${title}\n\n${message}`);
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Confirm", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export function feedback(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function usePropertyManagement(withAmenities = false) {
  const { id: param } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof param === "string" ? param : "";
  const { user, loading: authLoading } = useAuth();
  const ownerId = user?.id ?? "";
  const identity = `${id}:${ownerId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const epoch = useRef(0);
  const mounted = useRef(false);
  const [result, setResult] = useState<{
    identity: string;
    property: ManagedProperty;
    catalogue: { id: number; name: string; icon: string | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const reload = useCallback(async () => {
    const revision = ++epoch.current;
    setLoading(true);
    setError(null);
    try {
      if (!isPropertyId(id))
        throw new ManagementError("This property link is invalid.");
      if (!ownerId)
        throw new ManagementError(
          "Please sign in as the landlord to manage this property.",
        );
      const property = await getManagedProperty(id, ownerId);
      if (!property)
        throw new ManagementError(
          "This property is unavailable or belongs to another account.",
        );
      const catalogue = withAmenities
        ? await getAmenitiesForProperty(id, ownerId)
        : [];
      if (
        mounted.current &&
        revision === epoch.current &&
        identityRef.current === identity
      )
        setResult({ identity, property, catalogue });
    } catch (cause) {
      console.error("Failed to load property management:", cause);
      if (
        mounted.current &&
        revision === epoch.current &&
        identityRef.current === identity
      ) {
        setResult(null);
        setError(
          cause instanceof ManagementError
            ? cause.message
            : "We couldn't load this property. Please retry.",
        );
      }
    } finally {
      if (mounted.current && revision === epoch.current) setLoading(false);
    }
  }, [id, ownerId, identity, withAmenities]);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      setBusy(lock.current);
      setResult(null);
      if (!authLoading) void reload();
      return () => {
        mounted.current = false;
        epoch.current++;
      };
    }, [reload, authLoading]),
  );

  const run = async (
    action: () => Promise<unknown>,
    options: {
      confirmation?: [string, string];
      refresh?: boolean;
      success?: string;
    } = {},
  ) => {
    if (lock.current || identityRef.current !== identity || !ownerId)
      return false;
    lock.current = true;
    setBusy(true);
    try {
      if (
        options.confirmation &&
        !(await confirmChange(...options.confirmation))
      )
        return false;
      if (identityRef.current !== identity || !mounted.current) return false;
      await action();
      if (identityRef.current !== identity || !mounted.current) return false;
      if (options.refresh !== false) await reload();
      if (options.success) feedback("Saved", options.success);
      return true;
    } catch (cause) {
      console.error("Property management change failed:", cause);
      if (identityRef.current === identity && mounted.current) {
        feedback(
          "Change failed",
          cause instanceof ManagementError
            ? cause.message
            : "We couldn't finish this change. Please retry. If it continues, check the property's owner permissions.",
        );
        if (options.refresh !== false) await reload();
      }
      return false;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const property = result?.identity === identity ? result.property : null;
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: "/(owner)/property/[id]", params: { id } });
  return {
    id,
    ownerId,
    property,
    catalogue: result?.identity === identity ? result.catalogue : [],
    loading: loading || authLoading,
    error,
    busy,
    reload,
    run,
    back,
  };
}

export function ManagementFrame({
  title,
  state,
  children,
}: {
  title: string;
  state: ReturnType<typeof usePropertyManagement>;
  children: ReactNode;
}) {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            accessibilityLabel="Back"
            disabled={state.busy}
            onPress={state.back}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {state.loading ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : state.error ? (
            <View style={styles.card}>
              <Text style={styles.body}>{state.error}</Text>
              <Action label="Retry" onPress={() => void state.reload()} />
            </View>
          ) : state.property ? (
            children
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: "#1D4ED8" },
          danger && { color: "#DC2626" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  numeric = false,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        keyboardType={numeric ? "numeric" : "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.body}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
        thumbColor={value ? "#2563EB" : "#F8FAFC"}
      />
    </View>
  );
}
export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 60,
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  body: { fontSize: 14, lineHeight: 21, color: "#64748B" },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  textArea: { minHeight: 110, paddingTop: 14 },
  button: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  secondaryButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  dangerButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  selected: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
});
