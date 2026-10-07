import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function OwnerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1D4ED8",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          height: 65,
          paddingTop: 6,
          paddingBottom: 7,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="properties"
        options={{
          title: "Properties",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="business-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="applications"
        options={{
          title: "Applications",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="document-text-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="maintenance"
        options={{
          title: "Maintenance",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="construct-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}