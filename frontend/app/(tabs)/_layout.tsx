import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useAuth } from "@/src/auth";
import { Icon, type IconName } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { BORDER, fonts, useTheme } from "@/src/theme";

const TABS: { name: string; title: string; icon: IconName; sf: string }[] = [
  { name: "index", title: "Yeni", icon: "sparkles", sf: "sparkles" },
  { name: "exams", title: "Yazılılarım", icon: "file-text", sf: "doc.text.fill" },
  { name: "profile", title: "Profil", icon: "user", sf: "person.fill" },
];

export default function TabsLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();
  if (user === false) return <Redirect href="/login" />;

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandSecondary}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as never} />
            <NativeTabs.Trigger.Label>{t.title}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: BORDER,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, focused }) => <Icon name={t.icon} size={focused ? 24 : 22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
