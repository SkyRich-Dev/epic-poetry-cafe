import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";

interface InsightItem {
  name?: string;
  label?: string;
  category?: string;
  revenue?: number;
  units?: number;
  count?: number;
  value?: number;
}

export default function InsightsScreen() {
  const c = useColors();

  const top = useQuery({
    queryKey: ["insights-top"],
    queryFn: async () => {
      try {
        return (await api.get<InsightItem[]>("/insights/top-items")) ?? [];
      } catch {
        return [];
      }
    },
  });
  const cats = useQuery({
    queryKey: ["insights-cats"],
    queryFn: async () => {
      try {
        return (await api.get<InsightItem[]>("/insights/category-mix")) ?? [];
      } catch {
        return [];
      }
    },
  });
  const dows = useQuery({
    queryKey: ["insights-dows"],
    queryFn: async () => {
      try {
        return (await api.get<InsightItem[]>("/insights/day-of-week")) ?? [];
      } catch {
        return [];
      }
    },
  });

  const refreshing = top.isFetching || cats.isFetching || dows.isFetching;
  const onRefresh = () => {
    top.refetch();
    cats.refetch();
    dows.refetch();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Section title="Top items">
        {top.isLoading ? (
          <LoadingState />
        ) : top.isError ? (
          <ErrorState
            message={(top.error as Error)?.message ?? "Failed"}
            onRetry={() => top.refetch()}
          />
        ) : top.data && top.data.length > 0 ? (
          <Card padded={false}>
            {top.data.slice(0, 8).map((it, i) => (
              <View key={i}>
                <ListRow
                  title={it.name ?? it.label ?? `Item ${i + 1}`}
                  subtitle={it.category}
                  right={it.revenue != null ? formatCurrency(it.revenue) : ""}
                  rightSub={it.units != null ? `${formatNumber(it.units)} sold` : ""}
                  rightTone="primary"
                  leftIcon="award"
                />
                {i < Math.min(top.data!.length, 8) - 1 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginLeft: 64 }} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState icon="bar-chart-2" title="No data yet" />
          </Card>
        )}
      </Section>

      <Section title="Category mix">
        {cats.isLoading ? (
          <LoadingState />
        ) : cats.data && cats.data.length > 0 ? (
          <Card padded={false}>
            {cats.data.slice(0, 8).map((it, i) => (
              <View key={i}>
                <ListRow
                  title={it.name ?? it.category ?? it.label ?? `Cat ${i + 1}`}
                  right={it.revenue != null ? formatCurrency(it.revenue) : it.value != null ? formatCurrency(it.value) : ""}
                  rightSub={it.count != null ? `${formatNumber(it.count)} sold` : ""}
                  rightTone="primary"
                  leftIcon="grid"
                  leftIconBg={c.infoSoft}
                  leftIconFg={c.info}
                />
                {i < Math.min(cats.data!.length, 8) - 1 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginLeft: 64 }} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState icon="grid" title="No category data" />
          </Card>
        )}
      </Section>

      <Section title="Day of week">
        {dows.isLoading ? (
          <LoadingState />
        ) : dows.data && dows.data.length > 0 ? (
          <Card padded={false}>
            {dows.data.map((it, i) => (
              <View key={i}>
                <ListRow
                  title={it.name ?? it.label ?? `Day ${i + 1}`}
                  right={it.revenue != null ? formatCurrency(it.revenue) : ""}
                  rightSub={it.count != null ? `${formatNumber(it.count)} invoices` : ""}
                  rightTone="primary"
                  leftIcon="calendar"
                  leftIconBg={c.successSoft}
                  leftIconFg={c.success}
                />
                {i < dows.data!.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginLeft: 64 }} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState icon="calendar" title="No weekly data" />
          </Card>
        )}
      </Section>

      <Text style={{ fontSize: 11, color: c.mutedForeground, textAlign: "center", marginTop: 8 }}>
        Tap any item in the web app for the full breakdown.
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}
