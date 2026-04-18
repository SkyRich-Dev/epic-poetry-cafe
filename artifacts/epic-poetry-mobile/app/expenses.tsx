import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { daysAgoISO, formatCurrency, formatDate, todayISO } from "@/lib/format";

interface Expense {
  id: number;
  description?: string | null;
  amount?: number | string | null;
  expenseDate?: string | null;
  category?: { name?: string } | string | null;
  paymentMode?: string | null;
}

export default function ExpensesScreen() {
  const c = useColors();
  const fromDate = daysAgoISO(30);
  const toDate = todayISO();

  const q = useQuery({
    queryKey: ["expenses", fromDate, toDate],
    queryFn: async () =>
      (await api.get<Expense[]>(`/expenses?fromDate=${fromDate}&toDate=${toDate}`)) ?? [],
  });

  const total = useMemo(
    () => (q.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0),
    [q.data],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={q.isFetching}
          onRefresh={() => q.refetch()}
          tintColor={c.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
          LAST 30 DAYS
        </Text>
        <Text
          style={{
            fontSize: 28,
            color: c.foreground,
            fontFamily: "Inter_700Bold",
            marginTop: 4,
          }}
        >
          {formatCurrency(total)}
        </Text>
        <Text style={{ fontSize: 12, color: c.mutedForeground, marginTop: 4 }}>
          across {(q.data ?? []).length} entries
        </Text>
      </Card>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : (q.data ?? []).length === 0 ? (
        <Card>
          <EmptyState icon="credit-card" title="No expenses" message="Nothing recorded in the last 30 days." />
        </Card>
      ) : (
        <Card padded={false}>
          {(q.data ?? []).map((e, i) => {
            const cat = typeof e.category === "string" ? e.category : e.category?.name;
            return (
              <View key={e.id}>
                <ListRow
                  title={e.description || cat || `Expense #${e.id}`}
                  subtitle={[cat, e.paymentMode, formatDate(e.expenseDate)].filter(Boolean).join(" · ")}
                  leftIcon="credit-card"
                  leftIconBg={c.infoSoft}
                  leftIconFg={c.info}
                  right={formatCurrency(e.amount ?? 0)}
                  rightTone="neutral"
                />
                {i < (q.data ?? []).length - 1 ? (
                  <View style={{ height: 1, backgroundColor: c.border, marginLeft: 64 }} />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}
