import { Tabs } from "expo-router";
import { tabIcon, useTabBarOptions } from "../../../src/components/ui";

export default function TenantTabsLayout() {
  return (
    <Tabs screenOptions={useTabBarOptions()}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: tabIcon("search") }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Favorites", tabBarIcon: tabIcon("heart") }}
      />
      <Tabs.Screen
        name="applications"
        options={{ title: "Applications", tabBarIcon: tabIcon("document-text") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person") }}
      />
    </Tabs>
  );
}
