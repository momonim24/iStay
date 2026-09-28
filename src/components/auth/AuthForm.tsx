import { Link, type Href } from "expo-router";
import { useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authConfigured } from "../../lib/supabase";

export function AuthScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            <Image
              accessibilityLabel="iStay"
              source={require("../../../assets/images/iStay_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {!authConfigured ? (
              <AuthNotice error="Sign-in is not configured yet. Please contact the iStay team." />
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthInput({
  label,
  password = false,
  ...props
}: TextInputProps & { label: string; password?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#6b7280"
          autoCapitalize={password ? "none" : undefined}
          autoCorrect={false}
          {...props}
          secureTextEntry={password && !visible}
          style={[styles.input, props.style]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            onPress={() => setVisible(!visible)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AuthButton({
  title,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? "#111827" : "#ffffff"} />
      ) : null}
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function AuthLink({
  href,
  children,
}: PropsWithChildren<{ href: Href }>) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

export function AuthNotice({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (!error && !message) return null;
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.notice, error ? styles.error : styles.success]}
    >
      {error || message}
    </Text>
  );
}
export function AuthDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.or}>OR</Text>
      <View style={styles.rule} />
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  content: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingVertical: 16,
  },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: { color: "#111827", fontWeight: "600", fontSize: 14, marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    padding: 14,
    color: "#111827",
    fontSize: 16,
  },
  toggle: {
    minWidth: 58,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { color: "#374151", fontWeight: "600" },
  button: {
    minHeight: 52,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  secondaryText: { color: "#111827" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  link: {
    color: "#374151",
    textAlign: "center",
    paddingVertical: 14,
    fontSize: 15,
    textDecorationLine: "underline",
  },
  notice: {
    fontSize: 14,
    lineHeight: 21,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  error: { color: "#991b1b", backgroundColor: "#fef2f2" },
  success: { color: "#166534", backgroundColor: "#f0fdf4" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  rule: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  or: { color: "#6b7280", fontSize: 12 },
});
