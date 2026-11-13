import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/auth";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user } = useAuth();
  const { colors } = useTheme();
  if (user === null)
    return (
      <View testID="auth-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.onSurface} />
      </View>
    );
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
