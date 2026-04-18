import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
  ListRow,
  LoadingState,
  Pill,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import {
  daysAgoISO,
  formatCurrency,
  formatNumber,
  formatRelative,
  todayISO,
} from "@/lib/format";

interface Inv {
  id: number;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | string | null;
  netAmount?: number | string | null;
  customerName?: string | null;
  source?: string | null;
  paymentMode?: string | null;
  createdAt?: string | null;
  status?: string | null;
}

const RANGES: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
];

export default function SalesScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [rangeIdx, setRangeIdx] = useState(1);

  const range = RANGES[rangeIdx];
  const fromDate = daysAgoISO(range.days);
  const toDate = todayISO();

  const q = useQuery({
    queryKey: ["sales-invoices", fromDate, toDate],
    queryFn: async () => {
      const res = await api.get<Inv[] | { items: Inv[] }>(
        `/sales-invoices?fromDate=${fromDate}&toDate=${toDate}`,
      );
      return Array.isArray(res) ? res : (res?.items ?? []);
    },
  });

  const totals = useMemo(() => {
    const list = q.data ?? [];
    const revenue = list.reduce(
      (s, i) => s + Number(i.netAmount ?? i.totalAmount ?? 0),
      0,
    );
    const count = list.length;
    const avg = count > 0 ? revenue / count : 0;
    return { revenue, count, avg };
  }, [q.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, Inv[]>();
    for (const inv of q.data ?? []) {
      const d = (inv.invoiceDate ?? inv.createdAt ?? "").slice(0, 10) || "—";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(inv);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [q.data]);

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
      <View>
        <Text
          style={{
            fontSize: 28,
            fontFamily: "PlayfairDisplay_700Bold",
            color: c.foreground,
            letterSpacing: -0.5,
          }}
        >
          Sales
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: c.mutedForeground,
            marginTop: 2,
          }}
        >
          Every invoice — POS-synced and manual.
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 6,
          backgroundColor: c.muted,
          padding: 4,
          borderRadius: 999,
          alignSelf: "flex-start",
        }}
      >
        {RANGES.map((r, i) => {
          const active = i === rangeIdx;
          return (
            <Pressable
              key={r.label}
              onPress={() => setRangeIdx(i)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? c.card : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: active ? c.foreground : c.mutedForeground,
                }}
              >
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SummaryStat label="Revenue" value={formatCurrency(totals.revenue)} tone="primary" />
          <SummaryStat label="Invoices" value={formatNumber(totals.count)} tone="info" />
          <SummaryStat label="Avg" value={formatCurrency(totals.avg)} tone="success" />
        </View>
      </Card>

      {q.isLoading ? (
        <LoadingState label="Loading invoices" />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : !q.data || q.data.length === 0 ? (
        <Card>
          <EmptyState
            icon="file-text"
            title="No invoices in this range"
            message="Try a wider date range or check Petpooja sync settings."
          />
        </Card>
      ) : (
        grouped.map(([date, list]) => (
          <View key={date}>
            <SectionHeader title={prettyDate(date)} />
            <Card padded={false}>
              {list.map((inv, i) => (
                <View key={inv.id}>
                  <ListRow
                    title={inv.invoiceNumber || `Invoice #${inv.id}`}
                    subtitle={`${inv.customerName ?? "Walk-in"} · ${
                      inv.paymentMode ?? "—"
                    }`}
                    right={formatCurrency(inv.netAmount ?? inv.totalAmount ?? 0)}
                    rightSub={formatRelative(inv.createdAt ?? inv.invoiceDate)}
                    rightTone="primary"
                    leftIcon={
                      (inv.source ?? "").toLowerCase().includes("petpooja")
                        ? "smartphone"
                        : "edit-3"
                    }
                    onPress={() => router.push(`/sale/${inv.id}`)}
                  />
                  {i < list.length - 1 ? (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: c.border,
                        marginLeft: 64,
                      }}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "info" | "success";
}) {
  const c = useColors();
  const colorMap = { primary: c.primary, info: c.info, success: c.success };
  return (
    <View>
      <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 18,
          marginTop: 4,
          color: colorMap[tone],
          fontFamily: "Inter_700Bold",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function prettyDate(iso: string): string {
  if (!iso || iso === "—") return "Undated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const isYest = d.toDateString() === yest.toDateString();
  if (isToday) return "Today";
  if (isYest) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
