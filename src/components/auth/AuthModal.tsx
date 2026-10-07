import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearIntent } from "../../auth/auth-intent";
import {
  closeAuthModal,
  setAuthModalMode,
  useAuthModal,
} from "../../auth/auth-modal-store";
import { useRequireAuth } from "../../auth/use-require-auth";
import { colors, radius, spacing } from "../../constants/ui";
import { authConfigured } from "../../lib/supabase";
import { AuthNotice } from "./AuthForm";
import { LoginForm, RegisterForm } from "./AuthForms";

// Log in / Sign up shown over the current marketplace screen. The screen
// underneath stays mounted, so closing returns the guest exactly where they
// were. Mounted once in the root layout.
export function AuthModal() {
  const { open, mode, reason } = useAuthModal();
  const { signedIn } = useRequireAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  // Signing in (by any method) dismisses the pop-up; the remembered action is
  // then continued by the root layout / favorites hook.
  useEffect(() => {
    if (signedIn) closeAuthModal();
  }, [signedIn]);
  // X, backdrop, Android back and Escape: cancel and forget the pending action.
  const cancel = () => {
    clearIntent();
    closeAuthModal();
  };
  // Steps that need their own screen keep the pending action for afterwards.
  const leaveTo = (
    href:
      | "/(auth)/forgot-password"
      | { pathname: "/(auth)/verify-email"; params: Record<string, string> },
  ) => {
    closeAuthModal();
    router.push(href);
  };
  const verify = (sent: boolean) => (email: string) =>
    leaveTo({
      pathname: "/(auth)/verify-email",
      params: sent ? { email, sent: "1" } : { email },
    });
  const wide = width >= 640;
  const login = mode === "login";
  return (
    <Modal
      visible={open && !signedIn}
      transparent
      statusBarTranslucent
      animationType={wide ? "fade" : "slide"}
      onRequestClose={cancel}
    >
      <KeyboardAvoidingView
        style={[styles.backdrop, wide ? styles.center : styles.bottom]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={cancel}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            wide
              ? styles.dialog
              : { paddingBottom: Math.max(bottom, spacing.lg) },
          ]}
        >
          {!wide && <View style={styles.handle} />}
          <View style={styles.header}>
            <Image
              accessibilityLabel="iStay"
              source={require("../../../assets/images/iStay_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text accessibilityRole="header" style={styles.title}>
              {login ? "Log in to iSTAY" : "Create your iSTAY account"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={cancel}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {!!reason && (
              <View style={styles.reason}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.brand}
                />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            )}
            {!authConfigured && (
              <AuthNotice error="Sign-in is not configured yet. Please contact the iStay team." />
            )}
            {login ? (
              <LoginForm
                onRegister={() => setAuthModalMode("register")}
                onForgotPassword={() => leaveTo("/(auth)/forgot-password")}
                onVerifyEmail={verify(false)}
              />
            ) : (
              <RegisterForm
                onLogin={() => setAuthModalMode("login")}
                onVerifyEmail={verify(true)}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)" },
  bottom: { justifyContent: "flex-end" },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
  },
  dialog: {
    maxWidth: 440,
    borderRadius: 24,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  logo: { width: 40, height: 40 },
  title: { flex: 1, fontSize: 19, fontWeight: "800", color: colors.text },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutralSoft,
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    marginBottom: spacing.lg,
  },
  reasonText: { flex: 1, color: colors.brandDark, fontWeight: "600" },
});
