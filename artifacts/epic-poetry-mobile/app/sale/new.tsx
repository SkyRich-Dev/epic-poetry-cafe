import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { ApiError, api } from "@/lib/api";
import { formatCurrencyExact, todayISO } from "@/lib/format";

interface MenuItem {
  id: number;
  code?: string | null;
  name: string;
  categoryName?: string | null;
  sellingPrice: number;
  active?: boolean;
}

interface CartLine {
  menuItemId: number;
  name: string;
  quantity: number;
  fixedPrice: number;
}

const PAYMENT_MODES = ["cash", "card", "upi", "credit"] as const;
const ORDER_TYPES = ["dine-in", "takeaway", "delivery"] as const;

export default function NewInvoiceScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMode, setPaymentMode] = useState<(typeof PAYMENT_MODES)[number]>("cash");
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("dine-in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const itemsQ = useQuery({
    queryKey: ["menu-items-active"],
    queryFn: async () => (await api.get<MenuItem[]>("/menu-items")) ?? [],
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (itemsQ.data ?? [])
      .filter((i) => i.active !== false)
      .filter((i) =>
        s
          ? i.name.toLowerCase().includes(s) ||
            (i.code ?? "").toLowerCase().includes(s)
          : true,
      )
      .slice(0, 25);
  }, [itemsQ.data, search]);

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.fixedPrice, 0),
    [cart],
  );

  function addItem(m: MenuItem) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === m.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        { menuItemId: m.id, name: m.name, quantity: 1, fixedPrice: m.sellingPrice },
      ];
    });
    setSearch("");
  }

  function setQty(menuItemId: number, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const submit = useMutation({
    mutationFn: async () => {
      const body = {
        salesDate: todayISO(),
        sourceType: "manual",
        orderType,
        paymentMode,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        lines: cart.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          fixedPrice: l.fixedPrice,
          gstPercent: 0,
        })),
      };
      return api.post<{ id: number }>("/sales-invoices", body);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["ingredients-with-stock"] });
      router.replace(`/sale/${data.id}`);
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      Alert.alert("Could not save invoice", msg);
    },
  });

  function onSave() {
    if (cart.length === 0) {
      Alert.alert("Add at least one item", "Pick items from the search above.");
      return;
    }
    submit.mutate();
  }

  return (
    <>
      <Stack.Screen options={{ title: "New invoice" }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <SectionHeader title="Items" />
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: Platform.OS === "ios" ? 10 : 4,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.background,
                }}
              >
                <Feather name="search" size={16} color={c.mutedForeground} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search menu items"
                  placeholderTextColor={c.mutedForeground}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: c.foreground,
                    fontFamily: "Inter_500Medium",
                    paddingVertical: 0,
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {itemsQ.isLoading ? (
                <LoadingState />
              ) : itemsQ.isError ? (
                <ErrorState
                  message={(itemsQ.error as Error)?.message ?? "Failed to load"}
                  onRetry={() => itemsQ.refetch()}
                />
              ) : search ? (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {filtered.length === 0 ? (
                    <Text
                      style={{
                        color: c.mutedForeground,
                        fontSize: 13,
                        paddingVertical: 8,
                      }}
                    >
                      No items match &ldquo;{search}&rdquo;
                    </Text>
                  ) : (
                    filtered.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => addItem(m)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 10,
                          backgroundColor: pressed ? c.muted : "transparent",
                        })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: c.foreground,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            {m.name}
                          </Text>
                          {m.categoryName ? (
                            <Text
                              style={{
                                fontSize: 12,
                                color: c.mutedForeground,
                                marginTop: 2,
                              }}
                            >
                              {m.categoryName}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={{
                            fontSize: 13,
                            color: c.foreground,
                            fontFamily: "Inter_700Bold",
                          }}
                        >
                          {formatCurrencyExact(m.sellingPrice)}
                        </Text>
                        <Feather
                          name="plus-circle"
                          size={20}
                          color={c.primary}
                          style={{ marginLeft: 10 }}
                        />
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </Card>
          </View>

          <View>
            <SectionHeader title={`Cart (${cart.length})`} />
            {cart.length === 0 ? (
              <Card>
                <EmptyState
                  icon="shopping-bag"
                  title="No items yet"
                  message="Search above and tap items to add them."
                />
              </Card>
            ) : (
              <Card padded={false}>
                {cart.map((l, i) => (
                  <View
                    key={l.menuItemId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
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
                        numberOfLines={1}
                      >
                        {l.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: c.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {formatCurrencyExact(l.fixedPrice)} each
                      </Text>
                    </View>
                    <QtyStepper
                      value={l.quantity}
                      onChange={(q) => setQty(l.menuItemId, q)}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: c.foreground,
                        fontFamily: "Inter_700Bold",
                        minWidth: 70,
                        textAlign: "right",
                      }}
                    >
                      {formatCurrencyExact(l.quantity * l.fixedPrice)}
                    </Text>
                  </View>
                ))}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: c.mutedForeground,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Total
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      color: c.foreground,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    {formatCurrencyExact(total)}
                  </Text>
                </View>
              </Card>
            )}
          </View>

          <View>
            <SectionHeader title="Order details" />
            <Card>
              <FieldLabel>Order type</FieldLabel>
              <ChipRow
                values={ORDER_TYPES}
                value={orderType}
                onChange={setOrderType}
              />
              <View style={{ height: 14 }} />
              <FieldLabel>Payment mode</FieldLabel>
              <ChipRow
                values={PAYMENT_MODES}
                value={paymentMode}
                onChange={setPaymentMode}
              />
              <View style={{ height: 14 }} />
              <FieldLabel>Customer (optional)</FieldLabel>
              <Input
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Walk-in"
              />
              <View style={{ height: 8 }} />
              <Input
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </Card>
          </View>

          <PrimaryButton
            label={submit.isPending ? "Saving…" : "Save invoice"}
            icon="check"
            onPress={onSave}
            loading={submit.isPending}
            disabled={cart.length === 0}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontSize: 11,
        color: c.mutedForeground,
        fontFamily: "Inter_600SemiBold",
        letterSpacing: 0.3,
        marginBottom: 8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
          fontSize: 14,
          color: c.foreground,
          fontFamily: "Inter_500Medium",
          backgroundColor: c.background,
        },
        props.style as object,
      ]}
    />
  );
}

function ChipRow<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {values.map((v) => {
        const active = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={{
              paddingHorizontal: 12,
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
                textTransform: "capitalize",
              }}
            >
              {v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        style={{ paddingHorizontal: 10, paddingVertical: 6 }}
      >
        <Feather name="minus" size={14} color={c.foreground} />
      </Pressable>
      <Text
        style={{
          minWidth: 22,
          textAlign: "center",
          fontSize: 14,
          color: c.foreground,
          fontFamily: "Inter_700Bold",
        }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        style={{ paddingHorizontal: 10, paddingVertical: 6 }}
      >
        <Feather name="plus" size={14} color={c.foreground} />
      </Pressable>
    </View>
  );
}
