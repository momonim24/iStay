import { Tabs } from "expo-router";

export default function TenantTabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
        }}
      />

      <Tabs.Screen
        name="applications"
        options={{
          title: "Applications",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}