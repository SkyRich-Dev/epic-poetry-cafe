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
  TextInput,
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
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";

interface Ingredient {
  id: number;
  name: string;
  uom?: { code?: string; name?: string } | string | null;
  currentStock?: number | string | null;
  minStock?: number | string | null;
  category?: { name?: string } | string | null;
  active?: boolean;
}

const FILTERS = ["All", "Low", "Out"] as const;
type FilterKey = (typeof FILTERS)[number];

export default function InventoryScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [filter, setFilter] = useState<FilterKey>("All");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["ingredients-with-stock"],
    queryFn: async () => {
      const list = await api.get<Ingredient[]>("/ingredients?active=true");
      return list ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    const s = search.trim().toLowerCase();
    return list
      .filter((i) => (s ? (i.name ?? "").toLowerCase().includes(s) : true))
      .filter((i) => {
        const cur = Number(i.currentStock ?? 0);
        const min = Number(i.minStock ?? 0);
        if (filter === "Low") return min > 0 && cur > 0 && cur <= min;
        if (filter === "Out") return cur <= 0;
        return true;
      });
  }, [q.data, search, filter]);

  const counts = useMemo(() => {
    const list = q.data ?? [];
    let low = 0;
    let out = 0;
    let healthy = 0;
    for (const i of list) {
      const cur = Number(i.currentStock ?? 0);
      const min = Number(i.minStock ?? 0);
      if (cur <= 0) out++;
      else if (min > 0 && cur <= min) low++;
      else healthy++;
    }
    return { low, out, healthy, total: list.length };
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
          Stock
        </Text>
        <Text style={{ fontSize: 13, color: c.mutedForeground, marginTop: 2 }}>
          {counts.total} ingredients tracked
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StockTile label="Healthy" value={counts.healthy} icon="check-circle" tone="success" />
        <StockTile label="Low" value={counts.low} icon="alert-triangle" tone="warning" />
        <StockTile label="Out" value={counts.out} icon="x-circle" tone="danger" />
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 12 : 6,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.card,
        }}
      >
        <Feather name="search" size={16} color={c.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search ingredients"
          placeholderTextColor={c.mutedForeground}
          style={{
            flex: 1,
            fontSize: 15,
            color: c.foreground,
            fontFamily: "Inter_500Medium",
            paddingVertical: 0,
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={c.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? c.primary : c.muted,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: active ? c.primaryForeground : c.mutedForeground,
                }}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState label="Loading ingredients" />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="box"
            title={search ? "No matches" : "No ingredients"}
            message={
              search
                ? `Nothing matched "${search}".`
                : "Add ingredients in the web app to start tracking stock."
            }
          />
        </Card>
      ) : (
        <Card padded={false}>
          {filtered.map((i, idx) => {
            const cur = Number(i.currentStock ?? 0);
            const min = Number(i.minStock ?? 0);
            const uomCode =
              typeof i.uom === "string"
                ? i.uom
                : (i.uom?.code ?? i.uom?.name ?? "");
            const cat =
              typeof i.category === "string"
                ? i.category
                : (i.category?.name ?? "");
            const status =
              cur <= 0 ? "out" : min > 0 && cur <= min ? "low" : "ok";
            return (
              <View key={i.id}>
                <ListRow
                  title={i.name}
                  subtitle={[cat, min > 0 ? `min ${formatNumber(min)} ${uomCode}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  leftIcon={
                    status === "out"
                      ? "x-circle"
                      : status === "low"
                        ? "alert-triangle"
                        : "package"
                  }
                  leftIconBg={
                    status === "out"
                      ? "#FEE2E2"
                      : status === "low"
                        ? c.warningSoft
                        : c.successSoft
                  }
                  leftIconFg={
                    status === "out"
                      ? c.destructive
                      : status === "low"
                        ? c.warning
                        : c.success
                  }
                  right={`${formatNumber(cur)} ${uomCode}`.trim()}
                  rightSub={
                    status === "out"
                      ? "Out"
                      : status === "low"
                        ? "Low"
                        : "Healthy"
                  }
                  rightTone={
                    status === "out"
                      ? "danger"
                      : status === "low"
                        ? "neutral"
                        : "success"
                  }
                  onPress={() => router.push(`/stock-adjust/${i.id}`)}
                />
                {idx < filtered.length - 1 ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: c.border,
                      marginLeft: 64,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

function StockTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Feather>["name"];
  tone: "success" | "warning" | "danger";
}) {
  const c = useColors();
  const map = {
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    danger: { bg: "#FEE2E2", fg: c.destructive },
  } as const;
  const m = map[tone];
  return (
    <Card style={{ flex: 1, alignItems: "flex-start" }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: m.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={16} color={m.fg} />
      </View>
      <Text
        style={{
          marginTop: 10,
          fontSize: 22,
          color: c.foreground,
          fontFamily: "Inter_700Bold",
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: c.mutedForeground, marginTop: 2, fontFamily: "Inter_500Medium" }}>
        {label}
      </Text>
    </Card>
  );
}
