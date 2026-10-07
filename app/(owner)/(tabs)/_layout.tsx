import { Tabs } from "expo-router";
import { tabIcon, useTabBarOptions } from "../../../src/components/ui";

export default function OwnerTabsLayout() {
  return (
    <Tabs screenOptions={useTabBarOptions()}>
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: tabIcon("grid") }}
      />
      <Tabs.Screen
        name="properties"
        options={{ title: "Properties", tabBarIcon: tabIcon("business") }}
      />
      <Tabs.Screen
        name="applications"
        options={{ title: "Applications", tabBarIcon: tabIcon("document-text") }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{ title: "Maintenance", tabBarIcon: tabIcon("construct") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person") }}
      />
    </Tabs>
  );
}
