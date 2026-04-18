import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Pill,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

interface Employee {
  id: number;
  name?: string | null;
  fullName?: string | null;
  role?: string | null;
  designation?: string | null;
  status?: string | null;
  active?: boolean;
  joinedOn?: string | null;
  joiningDate?: string | null;
  monthlySalary?: number | string | null;
  baseSalary?: number | string | null;
  phone?: string | null;
}

export default function EmployeesScreen() {
  const c = useColors();
  const q = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/employees")) ?? [],
  });

  const list = q.data ?? [];
  const active = list.filter(
    (e) =>
      e.active !== false &&
      (e.status ?? "").toLowerCase() !== "left" &&
      (e.status ?? "").toLowerCase() !== "on_leave",
  );
  const onLeave = list.filter(
    (e) => (e.status ?? "").toLowerCase() === "on_leave",
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
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
            ON DUTY
          </Text>
          <Text style={{ fontSize: 26, color: c.foreground, fontFamily: "Inter_700Bold", marginTop: 4 }}>
            {active.length}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
            ON LEAVE
          </Text>
          <Text style={{ fontSize: 26, color: c.warning, fontFamily: "Inter_700Bold", marginTop: 4 }}>
            {onLeave.length}
          </Text>
        </Card>
      </View>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="users" title="No team members" message="Add team members from the web app." />
        </Card>
      ) : (
        <Card padded={false}>
          {list.map((e, i) => {
            const name = e.fullName || e.name || `Employee #${e.id}`;
            const role = e.role || e.designation;
            const salary = Number(e.monthlySalary ?? e.baseSalary ?? 0);
            const status = (e.status ?? "").toLowerCase();
            return (
              <View key={e.id}>
                <ListRow
                  title={name}
                  subtitle={[role, e.phone, e.joiningDate || e.joinedOn ? `Joined ${formatDate(e.joiningDate || e.joinedOn)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  leftIcon="user"
                  leftIconBg={status === "on_leave" ? c.warningSoft : c.primarySoft}
                  leftIconFg={status === "on_leave" ? c.warning : c.primary}
                  right={salary > 0 ? formatCurrency(salary) : ""}
                  rightSub={salary > 0 ? "/ month" : ""}
                />
                {i < list.length - 1 ? (
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
