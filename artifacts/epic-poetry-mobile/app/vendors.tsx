import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

interface Vendor {
  id: number;
  name: string;
  phone?: string | null;
  contact?: string | null;
  category?: { name?: string } | string | null;
  active?: boolean;
}

export default function VendorsScreen() {
  const c = useColors();
  const q = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => (await api.get<Vendor[]>("/vendors?active=true")) ?? [],
  });

  const list = q.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={q.isFetching}
          onRefresh={() => q.refetch()}
          tintColor={c.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState
          message={(q.error as Error)?.message ?? "Failed to load"}
          onRetry={() => q.refetch()}
        />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="truck" title="No vendors" message="Add vendors from the web app." />
        </Card>
      ) : (
        <Card padded={false}>
          {list.map((v, i) => {
            const cat = typeof v.category === "string" ? v.category : v.category?.name;
            return (
              <View key={v.id}>
                <ListRow
                  title={v.name}
                  subtitle={[cat, v.phone || v.contact].filter(Boolean).join(" · ")}
                  leftIcon="truck"
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
