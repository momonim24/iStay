// iSTAY design tokens shared by Tenant and Landlord modes.
export const colors = {
  brand: "#1D4ED8",
  brandDark: "#172554",
  brandSoft: "#EFF6FF",
  brandBorder: "#DBEAFE",
  text: "#0F172A",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  background: "#F8FAFC",
  placeholder: "#E2E8F0",
  success: "#15803D",
  successSoft: "#DCFCE7",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  neutral: "#475569",
  neutralSoft: "#F1F5F9",
  heart: "#DC2626",
} as const;

export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const type = {
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  heading: { fontSize: 18, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 15, fontWeight: "700", color: colors.text },
  body: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  caption: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  price: { fontSize: 17, fontWeight: "800", color: colors.brand },
} as const;

export const shadow = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

export const card = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.lg,
} as const;
