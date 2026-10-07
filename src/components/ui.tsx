import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { card, colors, radius, spacing, type } from "../constants/ui";
import type { ApplicationStatus } from "../types/application";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  busy = false,
  disabled = false,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const tint =
    variant === "primary"
      ? colors.surface
      : variant === "danger"
        ? colors.danger
        : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tint} />
      ) : (
        icon && <Ionicons name={icon} size={18} color={tint} />
      )}
      <Text style={[styles.buttonText, { color: tint }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={selected ? colors.surface : colors.textMuted}
        />
      )}
      <Text style={[styles.chipText, selected && { color: colors.surface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.brandDark,
  disabled = false,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.iconButton, style]}
    >
      <Ionicons name={icon} size={21} color={color} />
    </Pressable>
  );
}

export const statusStyles: Record<
  ApplicationStatus,
  { label: string; icon: IconName; color: string; background: string }
> = {
  pending: {
    label: "Pending",
    icon: "time-outline",
    color: colors.warning,
    background: colors.warningSoft,
  },
  approved: {
    label: "Approved",
    icon: "checkmark-circle-outline",
    color: colors.success,
    background: colors.successSoft,
  },
  rejected: {
    label: "Rejected",
    icon: "close-circle-outline",
    color: colors.danger,
    background: colors.dangerSoft,
  },
  cancelled: {
    label: "Cancelled",
    icon: "ban-outline",
    color: colors.neutral,
    background: colors.neutralSoft,
  },
};

// Status is always icon + text + colour, never colour alone.
export function Badge({
  label,
  icon,
  color,
  background,
}: {
  label: string;
  icon: IconName;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={type.heading}>{title}</Text>
      {action && onAction && (
        <Pressable hitSlop={8} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Intentional-looking empty, informational and business-rule states.
export function Notice({
  icon,
  title,
  message,
  tone = "neutral",
  children,
}: {
  icon: IconName;
  title: string;
  message?: string;
  tone?: "neutral" | "brand" | "danger";
  children?: ReactNode;
}) {
  const tint =
    tone === "danger"
      ? colors.danger
      : tone === "brand"
        ? colors.brand
        : colors.textMuted;
  return (
    <View style={styles.notice}>
      <View
        style={[
          styles.noticeIcon,
          tone === "danger" && { backgroundColor: colors.dangerSoft },
          tone === "neutral" && { backgroundColor: colors.neutralSoft },
        ]}
      >
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={[type.subheading, { textAlign: "center" }]}>{title}</Text>
      {!!message && (
        <Text style={[type.body, { textAlign: "center" }]}>{message}</Text>
      )}
      {children}
    </View>
  );
}

// One compact tab bar for both modes, padded for the device's bottom inset.
export function useTabBarOptions() {
  const { bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.textSubtle,
    tabBarStyle: {
      height: 56 + bottom,
      paddingTop: 6,
      paddingBottom: Math.max(bottom, 6),
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
    tabBarItemStyle: { minHeight: 44 },
  };
}
export function tabIcon(name: IconName) {
  const TabIcon = ({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) => (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={22}
      color={color}
    />
  );
  return TabIcon;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  buttonDanger: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
  chip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionAction: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  notice: {
    ...card,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  noticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
    marginBottom: spacing.xs,
  },
});
