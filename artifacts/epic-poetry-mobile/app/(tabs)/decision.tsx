import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Card,
  EmptyState,
  ErrorState,
  HeroBanner,
  LoadingState,
  Pill,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const TABS: { key: string; label: string; icon: FeatherName; admin: boolean }[] = [
  { key: "alerts", label: "Alerts", icon: "alert-circle", admin: false },
  { key: "inventory", label: "Inventory", icon: "box", admin: false },
  { key: "operational", label: "Operations", icon: "activity", admin: false },
  { key: "customer", label: "Customer", icon: "users", admin: false },
  { key: "predictive", label: "Forecast", icon: "trending-up", admin: false },
  { key: "revenue", label: "Revenue", icon: "dollar-sign", admin: true },
  { key: "financial", label: "Margin", icon: "pie-chart", admin: true },
];

export default function DecisionScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const [tab, setTab] = useState("alerts");

  const visibleTabs = TABS.filter((t) => !t.admin || user?.role === "admin");

  const q = useQuery({
    queryKey: ["decision", tab],
    queryFn: async () => {
      const res = await api.get<unknown>(`/decision/${tab}`);
      return res;
    },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        padding: 16,
        paddingTop: (isWeb ? 67 : insets.top) + 4,
        paddingBottom: 100 + insets.bottom,
        gap: 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={q.isFetching}
          onRefresh={() => q.refetch()}
          tintColor={c.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <HeroBanner
        greeting="Decision Engine"
        name="What to do next"
        subtitle="Recommendations distilled from sales, stock, recipes, and customers."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {visibleTabs.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: active ? c.primary : c.card,
                borderWidth: 1,
                borderColor: active ? c.primary : c.border,
              }}
            >
              <Feather
                name={t.icon}
                size={14}
                color={active ? c.primaryForeground : c.mutedForeground}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: active ? c.primaryForeground : c.foreground,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {q.isLoading ? (
        <LoadingState label="Crunching numbers" />
      ) : q.isError ? (
        <DecisionError error={q.error as Error} onRetry={() => q.refetch()} />
      ) : (
        <DecisionContent tab={tab} data={q.data} />
      )}
    </ScrollView>
  );
}

function DecisionError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 403) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Admin only"
          message="This decision area is locked to financial owners. Sign in as admin to view it."
        />
      </Card>
    );
  }
  return (
    <ErrorState
      message={error?.message ?? "Could not load this decision tab"}
      onRetry={onRetry}
    />
  );
}

function DecisionContent({ tab, data }: { tab: string; data: unknown }) {
  const c = useColors();

  if (!data || (typeof data === "object" && Object.keys(data as object).length === 0)) {
    return (
      <Card>
        <EmptyState
          icon="check-circle"
          title="Nothing to act on"
          message="The engine could not find any recommendations right now."
        />
      </Card>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <Card>
          <EmptyState icon="check-circle" title="All clear" message="No items here." />
        </Card>
      );
    }
    return (
      <View style={{ gap: 10 }}>
        {data.map((item, i) => (
          <RecCard key={i} item={item} />
        ))}
      </View>
    );
  }

  const obj = data as Record<string, unknown>;
  const sections = Object.entries(obj);

  return (
    <View style={{ gap: 16 }}>
      {sections.map(([key, value]) => (
        <View key={key}>
          <SectionHeader title={prettyKey(key)} />
          {Array.isArray(value) ? (
            value.length === 0 ? (
              <Card>
                <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                  Nothing here right now.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {value.slice(0, 8).map((item, i) => (
                  <RecCard key={i} item={item} />
                ))}
              </View>
            )
          ) : typeof value === "object" && value !== null ? (
            <Card>
              <KeyValueGrid obj={value as Record<string, unknown>} />
            </Card>
          ) : (
            <Card>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Inter_700Bold",
                  color: c.foreground,
                }}
              >
                {String(value ?? "—")}
              </Text>
            </Card>
          )}
        </View>
      ))}
    </View>
  );
}

function RecCard({ item }: { item: unknown }) {
  const c = useColors();
  if (item == null) return null;
  if (typeof item !== "object") {
    return (
      <Card>
        <Text style={{ color: c.foreground, fontSize: 14 }}>{String(item)}</Text>
      </Card>
    );
  }
  const obj = item as Record<string, unknown>;
  const title = pickString(obj, ["name", "title", "ingredient", "ingredientName", "menuItem", "menuItemName", "customerName", "vendor", "label", "category"]);
  const subtitle = pickString(obj, ["recommendation", "action", "reason", "message", "note", "description", "status"]);
  const sevStr = pickString(obj, ["severity", "priority", "level"]);
  const severity = (sevStr ?? "").toLowerCase();
  const tone: "danger" | "warning" | "info" | "neutral" =
    severity.includes("crit") || severity.includes("high")
      ? "danger"
      : severity.includes("med") || severity.includes("warn")
        ? "warning"
        : severity.includes("low") || severity.includes("info")
          ? "info"
          : "neutral";

  const numericPairs = Object.entries(obj).filter(
    ([k, v]) =>
      typeof v === "number" &&
      !["id", "ingredientId", "menuItemId", "customerId"].includes(k),
  );

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? (
            <Text
              style={{
                fontSize: 15,
                color: c.foreground,
                fontFamily: "Inter_700Bold",
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={{
                fontSize: 13,
                color: c.mutedForeground,
                marginTop: 4,
                lineHeight: 19,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {sevStr ? <Pill label={sevStr} tone={tone} /> : null}
      </View>
      {numericPairs.length > 0 ? (
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {numericPairs.slice(0, 4).map(([k, v]) => (
            <View key={k}>
              <Text
                style={{
                  fontSize: 11,
                  color: c.mutedForeground,
                  fontFamily: "Inter_600SemiBold",
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {prettyKey(k)}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: c.foreground,
                  fontFamily: "Inter_700Bold",
                  marginTop: 2,
                }}
              >
                {looksLikeMoney(k) ? formatCurrency(v as number) : formatNumber(v as number)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function KeyValueGrid({ obj }: { obj: Record<string, unknown> }) {
  const c = useColors();
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== null && v !== undefined && (typeof v !== "object" || Array.isArray(v) === false),
  );
  if (entries.length === 0) {
    return (
      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
        No data points returned.
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {entries.slice(0, 8).map(([k, v]) => (
        <View key={k} style={{ minWidth: 120 }}>
          <Text
            style={{
              fontSize: 11,
              color: c.mutedForeground,
              fontFamily: "Inter_600SemiBold",
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {prettyKey(k)}
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: c.foreground,
              fontFamily: "Inter_700Bold",
              marginTop: 4,
            }}
          >
            {typeof v === "number"
              ? looksLikeMoney(k)
                ? formatCurrency(v)
                : formatNumber(v)
              : String(v)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function looksLikeMoney(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes("revenue") ||
    k.includes("amount") ||
    k.includes("cost") ||
    k.includes("price") ||
    k.includes("margin") ||
    k.includes("profit") ||
    k.includes("spend") ||
    k.includes("value")
  );
}

function prettyKey(k: string): string {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}
