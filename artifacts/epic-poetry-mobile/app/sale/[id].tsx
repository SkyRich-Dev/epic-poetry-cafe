import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Card,
  ErrorState,
  LoadingState,
  Pill,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import {
  formatCurrencyExact,
  formatDate,
  formatNumber,
  formatTime,
} from "@/lib/format";

interface Line {
  id?: number;
  itemName?: string | null;
  menuItemName?: string | null;
  name?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  rate?: number | string | null;
  unitPrice?: number | string | null;
  amount?: number | string | null;
  total?: number | string | null;
}

interface InvoiceDetail {
  id: number;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  customerName?: string | null;
  source?: string | null;
  paymentMode?: string | null;
  status?: string | null;
  totalAmount?: number | string | null;
  netAmount?: number | string | null;
  taxAmount?: number | string | null;
  discountAmount?: number | string | null;
  notes?: string | null;
  createdAt?: string | null;
  lines?: Line[];
  items?: Line[];
}

export default function SaleDetailScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const q = useQuery({
    queryKey: ["sale", id],
    queryFn: async () => api.get<InvoiceDetail>(`/sales-invoices/${id}`),
    enabled: !!id,
  });

  if (q.isLoading) return <LoadingState label="Loading invoice" />;
  if (q.isError)
    return (
      <ErrorState
        message={(q.error as Error)?.message ?? "Failed to load"}
        onRetry={() => q.refetch()}
      />
    );
  if (!q.data) return null;
  const inv = q.data;
  const lines = inv.lines ?? inv.items ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
              {(inv.source ?? "MANUAL").toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 22,
                color: c.foreground,
                fontFamily: "PlayfairDisplay_700Bold",
                marginTop: 4,
              }}
            >
              {inv.invoiceNumber || `Invoice #${inv.id}`}
            </Text>
            <Text style={{ fontSize: 13, color: c.mutedForeground, marginTop: 4 }}>
              {formatDate(inv.invoiceDate ?? inv.createdAt)} · {formatTime(inv.createdAt ?? inv.invoiceDate)}
            </Text>
          </View>
          {inv.status ? (
            <Pill
              label={inv.status}
              tone={(inv.status ?? "").toLowerCase().includes("paid") ? "success" : "warning"}
            />
          ) : null}
        </View>

        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: c.border,
            flexDirection: "row",
            gap: 18,
          }}
        >
          <Meta label="Customer" value={inv.customerName ?? "Walk-in"} />
          <Meta label="Payment" value={inv.paymentMode ?? "—"} />
        </View>
      </Card>

      <View>
        <SectionHeader title="Items" />
        <Card padded={false}>
          {lines.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                No line items returned.
              </Text>
            </View>
          ) : (
            lines.map((l, i) => {
              const name = l.itemName ?? l.menuItemName ?? l.name ?? `Item ${i + 1}`;
              const qty = Number(l.quantity ?? l.qty ?? 0);
              const rate = Number(l.rate ?? l.unitPrice ?? 0);
              const amt = Number(l.amount ?? l.total ?? qty * rate);
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    gap: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: c.border,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: c.foreground,
                        fontFamily: "Inter_600SemiBold",
                      }}
                      numberOfLines={2}
                    >
                      {name}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.mutedForeground, marginTop: 2 }}>
                      {formatNumber(qty)} × {formatCurrencyExact(rate)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: c.foreground,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {formatCurrencyExact(amt)}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </View>

      <Card>
        <Row label="Subtotal" value={formatCurrencyExact(Number(inv.totalAmount ?? 0))} />
        {inv.discountAmount != null && Number(inv.discountAmount) > 0 ? (
          <Row label="Discount" value={`− ${formatCurrencyExact(inv.discountAmount)}`} />
        ) : null}
        {inv.taxAmount != null ? (
          <Row label="Tax" value={formatCurrencyExact(inv.taxAmount)} />
        ) : null}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
        <Row
          label="Net total"
          value={formatCurrencyExact(Number(inv.netAmount ?? inv.totalAmount ?? 0))}
          big
        />
      </Card>

      {inv.notes ? (
        <Card>
          <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
            NOTES
          </Text>
          <Text style={{ fontSize: 14, color: c.foreground, marginTop: 6, lineHeight: 20 }}>
            {inv.notes}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: c.foreground,
          fontFamily: "Inter_600SemiBold",
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontSize: big ? 14 : 13,
          color: big ? c.foreground : c.mutedForeground,
          fontFamily: big ? "Inter_600SemiBold" : "Inter_500Medium",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: big ? 20 : 14,
          color: c.foreground,
          fontFamily: "Inter_700Bold",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
