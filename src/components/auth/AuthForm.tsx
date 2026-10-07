import { Ionicons } from "@expo/vector-icons";
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
import { colors, radius } from "../../constants/ui";
import { authConfigured } from "../../lib/supabase";

export function AuthScreen({
  title,
  subtitle,
  reason,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  // Why sign-in was requested, e.g. "Log in to apply for this room."
  reason?: string;
  // Lets a guest return to browsing instead of signing in.
  onClose?: () => void;
}>) {
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
            {onClose ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close and continue browsing"
                hitSlop={8}
                onPress={onClose}
                style={styles.close}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            ) : null}
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
            {reason ? (
              <View style={styles.reason}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.brand}
                />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ) : null}
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
        <ActivityIndicator color={secondary ? colors.brand : "#ffffff"} />
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

// Same look as AuthLink, for steps that are not a route change.
export function AuthTextLink({
  onPress,
  children,
}: PropsWithChildren<{ onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
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
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  content: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingVertical: 16,
  },
  close: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutralSoft,
  },
  logo: { width: 88, height: 88, alignSelf: "center", marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    marginBottom: 20,
  },
  reasonText: { flex: 1, color: colors.brandDark, fontWeight: "600" },
  field: { marginBottom: 14 },
  label: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 16,
  },
  toggle: {
    minWidth: 58,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { color: colors.brand, fontWeight: "600" },
  button: {
    minHeight: 50,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  link: {
    color: colors.brand,
    textAlign: "center",
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  notice: {
    fontSize: 14,
    lineHeight: 21,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  error: { color: "#991b1b", backgroundColor: colors.dangerSoft },
  success: { color: "#166534", backgroundColor: colors.successSoft },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.textSubtle, fontSize: 12 },
});
