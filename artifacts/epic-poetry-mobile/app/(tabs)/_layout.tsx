import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const TABS: {
  name: string;
  title: string;
  icon: FeatherName;
}[] = [
  { name: "index", title: "Home", icon: "home" },
  { name: "sales", title: "Sales", icon: "shopping-bag" },
  { name: "inventory", title: "Stock", icon: "box" },
  { name: "decision", title: "Decide", icon: "compass" },
  { name: "more", title: "More", icon: "menu" },
];

export default function TabLayout() {
  const c = useColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.2,
        },
        headerStyle: { backgroundColor: c.background },
        headerTitleStyle: {
          fontFamily: "PlayfairDisplay_700Bold",
          fontSize: 18,
          color: c.foreground,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : c.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          elevation: 0,
          height: isWeb ? 84 : 64 + insets.bottom * 0,
          ...(isWeb ? {} : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: c.card },
              ]}
            />
          ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => (
              <Feather
                name={t.icon}
                size={focused ? 23 : 21}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
