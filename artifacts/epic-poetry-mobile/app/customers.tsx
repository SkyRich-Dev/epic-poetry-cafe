import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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

import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Customer {
  id: number;
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  totalSpend?: number | string | null;
  lifetimeValue?: number | string | null;
  visits?: number | null;
  visitCount?: number | null;
  lastVisit?: string | null;
}

export default function CustomersScreen() {
  const c = useColors();
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const list = await api.get<Customer[]>("/customers");
      return list ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((cu) => {
      if (!s) return true;
      const blob = `${cu.name ?? cu.fullName ?? ""} ${cu.phone ?? ""}`.toLowerCase();
      return blob.includes(s);
    });
  }, [q.data, search]);

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
      <SearchBar value={search} onChange={setSearch} placeholder="Search customers" />

      <Card>
        <Text style={{ fontSize: 12, color: c.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
          TOTAL CUSTOMERS
        </Text>
        <Text
          style={{
            fontSize: 28,
            color: c.foreground,
            fontFamily: "PlayfairDisplay_700Bold",
            marginTop: 4,
          }}
        >
          {(q.data ?? []).length.toLocaleString()}
        </Text>
      </Card>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="users"
            title={search ? "No matches" : "No customers"}
            message={search ? `Nothing matched "${search}".` : "Add customers from the web app."}
          />
        </Card>
      ) : (
        <Card padded={false}>
          {filtered.map((cu, i) => {
            const name = cu.name || cu.fullName || cu.phone || `Customer #${cu.id}`;
            const visits = Number(cu.visits ?? cu.visitCount ?? 0);
            const spend = Number(cu.totalSpend ?? cu.lifetimeValue ?? 0);
            return (
              <View key={cu.id}>
                <ListRow
                  title={name}
                  subtitle={[cu.phone, visits ? `${visits} visits` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  leftIcon="user"
                  right={spend > 0 ? formatCurrency(spend) : ""}
                  rightSub={spend > 0 ? "lifetime" : ""}
                  rightTone="primary"
                />
                {i < filtered.length - 1 ? (
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

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const c = useColors();
  return (
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
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
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
      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={8}>
          <Feather name="x" size={16} color={c.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}
