import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: c.radius + 4,
          borderWidth: 1,
          borderColor: c.border,
          padding: padded ? 16 : 0,
        },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
  icon?: FeatherName;
}) {
  const c = useColors();
  const map = {
    neutral: { bg: c.muted, fg: c.mutedForeground },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    danger: { bg: "#FEE2E2", fg: c.destructive },
    info: { bg: c.infoSoft, fg: c.info },
    primary: { bg: c.primarySoft, fg: c.primary },
  } as const;
  const m = map[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: m.bg,
        alignSelf: "flex-start",
      }}
    >
      {icon ? <Feather name={icon} size={11} color={m.fg} /> : null}
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          color: m.fg,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: FeatherName;
  tone?: "primary" | "success" | "info" | "warning";
}) {
  const c = useColors();
  const map = {
    primary: [c.primarySoft, c.primary] as const,
    success: [c.successSoft, c.success] as const,
    info: [c.infoSoft, c.info] as const,
    warning: [c.warningSoft, c.warning] as const,
  };
  const [bg, fg] = map[tone];
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon ? <Feather name={icon} size={18} color={fg} /> : null}
        </View>
        <Text
          style={{
            fontSize: 12,
            color: c.mutedForeground,
            fontFamily: "Inter_500Medium",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 12,
          fontSize: 26,
          color: c.foreground,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {hint ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            color: c.mutedForeground,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

export function HeroBanner({
  greeting,
  name,
  subtitle,
}: {
  greeting: string;
  name: string;
  subtitle: string;
}) {
  return (
    <LinearGradient
      colors={["#8A4D14", "#B4661A", "#D88842"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 22,
        padding: 20,
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          color: "#FBE9D6",
          fontSize: 13,
          fontFamily: "Inter_500Medium",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {greeting}
      </Text>
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 26,
          fontFamily: "PlayfairDisplay_700Bold",
          marginTop: 4,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: 14,
          marginTop: 6,
          fontFamily: "Inter_400Regular",
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>
    </LinearGradient>
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
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontFamily: "PlayfairDisplay_700Bold",
          color: c.foreground,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={{
              color: c.primary,
              fontSize: 13,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
}: {
  icon?: FeatherName;
  title: string;
  message?: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.muted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Feather name={icon} size={24} color={c.mutedForeground} />
      </View>
      <Text
        style={{
          fontSize: 16,
          color: c.foreground,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            fontSize: 13,
            color: c.mutedForeground,
            textAlign: "center",
            marginTop: 4,
            maxWidth: 260,
            lineHeight: 18,
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const c = useColors();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
      }}
    >
      <ActivityIndicator color={c.primary} />
      {label ? (
        <Text
          style={{
            fontSize: 13,
            color: c.mutedForeground,
            marginTop: 12,
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const c = useColors();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#FEE2E2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Feather name="alert-circle" size={24} color={c.destructive} />
      </View>
      <Text
        style={{
          fontSize: 15,
          color: c.foreground,
          fontFamily: "Inter_600SemiBold",
          textAlign: "center",
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: c.mutedForeground,
          textAlign: "center",
          marginTop: 4,
          maxWidth: 280,
          lineHeight: 18,
        }}
      >
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            marginTop: 14,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: c.primary,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: c.primaryForeground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  variant = "primary",
  fullWidth = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const isDisabled = disabled || loading;
  const variants = {
    primary: { bg: c.primary, fg: c.primaryForeground, border: c.primary },
    secondary: { bg: c.card, fg: c.foreground, border: c.border },
    ghost: { bg: "transparent", fg: c.primary, border: "transparent" },
  } as const;
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 999,
        backgroundColor: v.bg,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: v.border,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        ...(style as object),
      })}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : icon ? (
        <Feather name={icon} size={16} color={v.fg} />
      ) : null}
      <Text
        style={{
          color: v.fg,
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  rightSub,
  rightTone = "neutral",
  leftIcon,
  leftIconBg,
  leftIconFg,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  rightSub?: string;
  rightTone?: "neutral" | "primary" | "success" | "danger";
  leftIcon?: FeatherName;
  leftIconBg?: string;
  leftIconFg?: string;
  onPress?: () => void;
}) {
  const c = useColors();
  const rightColor: Record<string, string> = {
    neutral: c.foreground,
    primary: c.primary,
    success: c.success,
    danger: c.destructive,
  };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: pressed ? c.muted : c.card,
      })}
    >
      {leftIcon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: leftIconBg ?? c.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather
            name={leftIcon}
            size={17}
            color={leftIconFg ?? c.primary}
          />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 14,
            color: c.foreground,
            fontFamily: "Inter_600SemiBold",
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              color: c.mutedForeground,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 14,
              color: rightColor[rightTone],
              fontFamily: "Inter_700Bold",
            }}
          >
            {right}
          </Text>
          {rightSub ? (
            <Text
              style={{
                fontSize: 11,
                color: c.mutedForeground,
                marginTop: 2,
              }}
            >
              {rightSub}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function Divider() {
  const c = useColors();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
  );
}

export function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View style={[{ flex: 1, backgroundColor: c.background }, style]}>
      {children}
    </View>
  );
}

export const textStyles = {
  display: (color: string): TextStyle => ({
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    color,
    letterSpacing: -0.5,
  }),
  title: (color: string): TextStyle => ({
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color,
  }),
  body: (color: string): TextStyle => ({
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color,
    lineHeight: 20,
  }),
  caption: (color: string): TextStyle => ({
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color,
  }),
};
