import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
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

import { Card, PrimaryButton, SectionHeader } from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { ApiError, api } from "@/lib/api";
import { todayISO } from "@/lib/format";

interface Category {
  id: number;
  name: string;
  type?: string | null;
}

interface ExpenseCostType {
  id: number;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

const PAYMENT_MODES = ["cash", "card", "upi", "petty cash", "bank"] as const;

export default function NewExpenseScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState<(typeof PAYMENT_MODES)[number]>(
    "cash",
  );
  const [paidBy, setPaidBy] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [costTypeCode, setCostTypeCode] = useState<string | null>(null);

  const catsQ = useQuery({
    queryKey: ["categories", "expense"],
    queryFn: async () =>
      (await api.get<Category[]>("/categories?type=expense")) ?? [],
  });

  const costTypesQ = useQuery({
    queryKey: ["expense-cost-types"],
    queryFn: async () =>
      (await api.get<ExpenseCostType[]>("/expense-cost-types")) ?? [],
  });

  // Default the cost type once the list arrives. Prefer VARIABLE if
  // present (matches the previous hardcoded default), otherwise the
  // first active row.
  React.useEffect(() => {
    if (costTypeCode || !costTypesQ.data?.length) return;
    const variable = costTypesQ.data.find((t) => t.code === "VARIABLE");
    setCostTypeCode((variable ?? costTypesQ.data[0]).code);
  }, [costTypesQ.data, costTypeCode]);

  const submit = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error("Enter a valid amount.");
      }
      if (!costTypeCode) {
        throw new Error("Pick a cost type.");
      }
      return api.post("/expenses", {
        expenseDate: todayISO(),
        amount: amt,
        taxAmount: 0,
        description: description.trim() || undefined,
        paymentMode,
        paidBy: paidBy.trim() || undefined,
        categoryId: categoryId ?? undefined,
        // Send the canonical master code as-is (uppercase). The server
        // accepts free-form strings; case-insensitive lookups handle
        // legacy lowercase rows already in the table.
        costType: costTypeCode,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      router.back();
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      Alert.alert("Could not save expense", msg);
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: "New expense" }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <FieldLabel>Amount (₹)</FieldLabel>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={{ height: 14 }} />
            <FieldLabel>Description</FieldLabel>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="What was it for?"
              multiline
            />
            <View style={{ height: 14 }} />
            <FieldLabel>Paid by</FieldLabel>
            <Input
              value={paidBy}
              onChangeText={setPaidBy}
              placeholder="Staff name (optional)"
            />
          </Card>

          <View>
            <SectionHeader title="Payment mode" />
            <Card>
              <ChipRow
                values={PAYMENT_MODES}
                value={paymentMode}
                onChange={setPaymentMode}
              />
            </Card>
          </View>

          <View>
            <SectionHeader title="Cost type" />
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {(costTypesQ.data ?? [])
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <Chip
                      key={t.code}
                      label={t.label}
                      active={costTypeCode === t.code}
                      onPress={() => setCostTypeCode(t.code)}
                    />
                  ))}
              </View>
            </Card>
          </View>

          <View>
            <SectionHeader title="Category" />
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Chip
                  label="None"
                  active={categoryId === null}
                  onPress={() => setCategoryId(null)}
                />
                {(catsQ.data ?? []).map((cat) => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    active={categoryId === cat.id}
                    onPress={() => setCategoryId(cat.id)}
                  />
                ))}
              </View>
            </Card>
          </View>

          <PrimaryButton
            label={submit.isPending ? "Saving…" : "Save expense"}
            icon="check"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
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
          minHeight: 44,
        },
        props.style as object,
      ]}
    />
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
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
        {label}
      </Text>
    </Pressable>
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
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {values.map((v) => (
        <Chip
          key={v}
          label={v}
          active={v === value}
          onPress={() => onChange(v)}
        />
      ))}
    </View>
  );
}
