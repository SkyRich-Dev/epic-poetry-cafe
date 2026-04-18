import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
  ErrorState,
  LoadingState,
  PrimaryButton,
  SectionHeader,
} from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";

interface Ingredient {
  id: number;
  name: string;
  currentStock: number;
  stockUom?: string | null;
  uom?: { code?: string; name?: string } | string | null;
}

type Mode = "in" | "out" | "correction";
const MODES: { key: Mode; label: string }[] = [
  { key: "in", label: "Stock in" },
  { key: "out", label: "Stock out" },
  { key: "correction", label: "Correction" },
];

const REASONS: Record<Mode, string[]> = {
  in: ["Purchase received", "Returned to stock", "Other"],
  out: ["Wastage", "Spillage", "Used (off-recipe)", "Other"],
  correction: ["Physical count", "Data entry fix", "Other"],
};

export default function StockAdjustScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ingredientId = Number(id);

  const [mode, setMode] = useState<Mode>("in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<string>(REASONS.in[0]);
  const [reasonNote, setReasonNote] = useState("");

  const q = useQuery({
    queryKey: ["ingredient", ingredientId],
    queryFn: async () => api.get<Ingredient>(`/ingredients/${ingredientId}`),
    enabled: Number.isFinite(ingredientId) && ingredientId > 0,
  });

  const ing = q.data;
  const uomCode =
    typeof ing?.uom === "string"
      ? ing.uom
      : ing?.uom?.code ?? ing?.uom?.name ?? ing?.stockUom ?? "";
  const current = Number(ing?.currentStock ?? 0);

  const preview = useMemo(() => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return null;
    if (mode === "in") return current + n;
    if (mode === "out") return current - n;
    return n;
  }, [qty, mode, current]);

  function pickMode(next: Mode) {
    setMode(next);
    setReason(REASONS[next][0]);
  }

  const submit = useMutation({
    mutationFn: async () => {
      const n = Number(qty);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error("Enter a quantity greater than zero.");
      }
      let adjustmentType: "increase" | "decrease";
      let quantity: number;
      if (mode === "in") {
        adjustmentType = "increase";
        quantity = n;
      } else if (mode === "out") {
        adjustmentType = "decrease";
        quantity = n;
      } else {
        const delta = n - current;
        if (delta === 0) throw new Error("New total matches current stock.");
        adjustmentType = delta > 0 ? "increase" : "decrease";
        quantity = Math.abs(delta);
      }
      const fullReason = [reason, reasonNote.trim()].filter(Boolean).join(" — ");
      return api.post("/inventory/adjustments", {
        ingredientId,
        adjustmentType,
        quantity,
        reason: fullReason || reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients-with-stock"] });
      qc.invalidateQueries({ queryKey: ["ingredient", ingredientId] });
      router.back();
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      Alert.alert("Could not save adjustment", msg);
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: "Adjust stock" }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {q.isLoading ? (
            <LoadingState label="Loading ingredient" />
          ) : q.isError || !ing ? (
            <ErrorState
              message={(q.error as Error)?.message ?? "Ingredient not found"}
              onRetry={() => q.refetch()}
            />
          ) : (
            <>
              <Card>
                <Text
                  style={{
                    fontSize: 11,
                    color: c.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    letterSpacing: 0.3,
                  }}
                >
                  INGREDIENT
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 20,
                    color: c.foreground,
                    fontFamily: "PlayfairDisplay_700Bold",
                  }}
                >
                  {ing.name}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: c.mutedForeground,
                  }}
                >
                  Current stock: {formatNumber(current)} {uomCode}
                </Text>
              </Card>

              <View>
                <SectionHeader title="Adjustment type" />
                <Card>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {MODES.map((m) => (
                      <Pressable
                        key={m.key}
                        onPress={() => pickMode(m.key)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor:
                            mode === m.key ? c.primary : c.muted,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color:
                              mode === m.key
                                ? c.primaryForeground
                                : c.mutedForeground,
                          }}
                        >
                          {m.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              </View>

              <Card>
                <FieldLabel>
                  {mode === "correction"
                    ? `New total ${uomCode ? `(${uomCode})` : ""}`
                    : `Quantity ${uomCode ? `(${uomCode})` : ""}`}
                </FieldLabel>
                <Input
                  value={qty}
                  onChangeText={setQty}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                {preview != null ? (
                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: preview < 0 ? c.destructive : c.mutedForeground,
                    }}
                  >
                    {preview < 0
                      ? `Would result in negative stock (${formatNumber(
                          preview,
                        )} ${uomCode}).`
                      : `New stock: ${formatNumber(preview)} ${uomCode}`}
                  </Text>
                ) : null}
              </Card>

              <View>
                <SectionHeader title="Reason" />
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    {REASONS[mode].map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setReason(r)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor:
                            reason === r ? c.primary : c.muted,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color:
                              reason === r
                                ? c.primaryForeground
                                : c.mutedForeground,
                          }}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Input
                    value={reasonNote}
                    onChangeText={setReasonNote}
                    placeholder="Add a note (optional)"
                    multiline
                  />
                </Card>
              </View>

              <PrimaryButton
                label={submit.isPending ? "Saving…" : "Save adjustment"}
                icon="check"
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                fullWidth
              />
            </>
          )}
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
