import { Feather } from "@expo/vector-icons";
import { useQueries } from "@tanstack/react-query";
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

type Endpoint = { label: string; path: string };
type TabDef = {
  key: string;
  label: string;
  icon: FeatherName;
  admin: boolean;
  endpoints: Endpoint[];
};

const TABS: TabDef[] = [
  {
    key: "alerts",
    label: "Alerts",
    icon: "alert-circle",
    admin: false,
    endpoints: [{ label: "Active alerts", path: "/decision/alerts" }],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: "box",
    admin: false,
    endpoints: [
      { label: "Consumption variance", path: "/decision/inventory/consumption-variance" },
      { label: "Dead stock", path: "/decision/inventory/dead-stock" },
      { label: "Cost impact", path: "/decision/inventory/cost-impact" },
      { label: "Expiry risk", path: "/decision/inventory/expiry-risk" },
    ],
  },
  {
    key: "operational",
    label: "Operations",
    icon: "activity",
    admin: false,
    endpoints: [
      { label: "Staff efficiency", path: "/decision/operational/staff-efficiency" },
      { label: "Kitchen load", path: "/decision/operational/kitchen-load" },
    ],
  },
  {
    key: "customer",
    label: "Customer",
    icon: "users",
    admin: false,
    endpoints: [
      { label: "Customer lifetime value", path: "/decision/customer/clv" },
      { label: "Churn risk", path: "/decision/customer/churn" },
    ],
  },
  {
    key: "predictive",
    label: "Forecast",
    icon: "trending-up",
    admin: false,
    endpoints: [
      { label: "Sales forecast", path: "/decision/predictive/sales" },
      { label: "Demand forecast", path: "/decision/predictive/demand" },
    ],
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: "dollar-sign",
    admin: true,
    endpoints: [
      { label: "Revenue leakage", path: "/decision/revenue/leakage" },
      { label: "Profit comparison", path: "/decision/revenue/profit-comparison" },
      { label: "Item matrix", path: "/decision/revenue/item-matrix" },
    ],
  },
  {
    key: "financial",
    label: "Margin",
    icon: "pie-chart",
    admin: true,
    endpoints: [
      { label: "Payment trend", path: "/decision/financial/payment-trend" },
      { label: "Settlement mismatch", path: "/decision/financial/settlement-mismatch" },
      { label: "Vendor risk", path: "/decision/financial/vendor-risk" },
      { label: "Expense efficiency", path: "/decision/financial/expense-efficiency" },
    ],
  },
];

export default function DecisionScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";
  const [tab, setTab] = useState("alerts");

  const visibleTabs = TABS.filter((t) => !t.admin || user?.role === "admin");
  const activeTab = visibleTabs.find((t) => t.key === tab) ?? visibleTabs[0];

  const queries = useQueries({
    queries: (activeTab?.endpoints ?? []).map((ep) => ({
      queryKey: ["decision", ep.path],
      queryFn: () => api.get<unknown>(ep.path),
      retry: false,
    })),
  });

  const isLoading = queries.length > 0 && queries.every((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const allErrored = queries.length > 0 && queries.every((q) => q.isError);
  const firstError = queries.find((q) => q.isError)?.error as Error | undefined;
  const firstAdminBlock =
    firstError instanceof ApiError && firstError.status === 403 ? firstError : null;

  const refetchAll = () => {
    queries.forEach((q) => void q.refetch());
  };

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
          refreshing={isFetching}
          onRefresh={refetchAll}
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

      {isLoading ? (
        <LoadingState label="Crunching numbers" />
      ) : firstAdminBlock && allErrored ? (
        <Card>
          <EmptyState
            icon="lock"
            title="Admin only"
            message="This decision area is locked to financial owners. Sign in as admin to view it."
          />
        </Card>
      ) : allErrored && firstError ? (
        <ErrorState
          message={firstError.message ?? "Could not load this decision tab"}
          onRetry={refetchAll}
        />
      ) : (
        <View style={{ gap: 18 }}>
          {(activeTab?.endpoints ?? []).map((ep, i) => (
            <EndpointSection
              key={ep.path}
              label={ep.label}
              query={queries[i]}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function EndpointSection({
  label,
  query,
}: {
  label: string;
  query: { data: unknown; isLoading: boolean; isError: boolean; error: unknown };
}) {
  const c = useColors();

  if (query.isLoading) {
    return (
      <View>
        <SectionHeader title={label} />
        <LoadingState label="Loading" />
      </View>
    );
  }

  if (query.isError) {
    const err = query.error as Error | undefined;
    const isAdmin = err instanceof ApiError && err.status === 403;
    return (
      <View>
        <SectionHeader title={label} />
        <Card>
          <EmptyState
            icon={isAdmin ? "lock" : "alert-circle"}
            title={isAdmin ? "Admin only" : "Couldn't load"}
            message={
              isAdmin
                ? "Sign in as admin to see this section."
                : err?.message ?? "Try refreshing."
            }
          />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title={label} />
      <DecisionPayload data={query.data} />
    </View>
  );
}

function DecisionPayload({ data }: { data: unknown }) {
  const c = useColors();

  if (data == null) {
    return (
      <Card>
        <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
          No data returned.
        </Text>
      </Card>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <Card>
          <EmptyState icon="check-circle" title="All clear" message="Nothing here right now." />
        </Card>
      );
    }
    return (
      <View style={{ gap: 10 }}>
        {data.slice(0, 12).map((item, i) => (
          <RecCard key={i} item={item} />
        ))}
      </View>
    );
  }

  if (typeof data !== "object") {
    return (
      <Card>
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Inter_700Bold",
            color: c.foreground,
          }}
        >
          {String(data)}
        </Text>
      </Card>
    );
  }

  const obj = data as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState icon="check-circle" title="Nothing to act on" message="No recommendations right now." />
      </Card>
    );
  }

  const arrayEntries = entries.filter(([, v]) => Array.isArray(v));
  const scalarEntries = entries.filter(
    ([, v]) => v !== null && v !== undefined && (typeof v !== "object" || false) && !Array.isArray(v),
  );
  const objectEntries = entries.filter(
    ([, v]) => v !== null && typeof v === "object" && !Array.isArray(v),
  );

  return (
    <View style={{ gap: 12 }}>
      {scalarEntries.length > 0 ? (
        <Card>
          <KeyValueGrid obj={Object.fromEntries(scalarEntries)} />
        </Card>
      ) : null}
      {objectEntries.map(([k, v]) => (
        <View key={k} style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_600SemiBold",
              color: c.mutedForeground,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {prettyKey(k)}
          </Text>
          <Card>
            <KeyValueGrid obj={v as Record<string, unknown>} />
          </Card>
        </View>
      ))}
      {arrayEntries.map(([k, v]) => {
        const arr = v as unknown[];
        return (
          <View key={k} style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: c.mutedForeground,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {prettyKey(k)}
            </Text>
            {arr.length === 0 ? (
              <Card>
                <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                  Nothing here right now.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {arr.slice(0, 8).map((item, i) => (
                  <RecCard key={i} item={item} />
                ))}
              </View>
            )}
          </View>
        );
      })}
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
  const title = pickString(obj, [
    "name",
    "title",
    "ingredient",
    "ingredientName",
    "menuItem",
    "menuItemName",
    "customerName",
    "vendor",
    "vendorName",
    "label",
    "category",
    "employeeName",
    "paymentMode",
    "date",
  ]);
  const subtitle = pickString(obj, [
    "recommendation",
    "action",
    "reason",
    "message",
    "note",
    "description",
    "status",
    "insight",
  ]);
  const sevStr = pickString(obj, ["severity", "priority", "level", "risk"]);
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
      !["id", "ingredientId", "menuItemId", "customerId", "employeeId", "vendorId"].includes(k),
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
    ([, v]) =>
      v !== null &&
      v !== undefined &&
      (typeof v !== "object" || Array.isArray(v) === false) &&
      typeof v !== "object",
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
