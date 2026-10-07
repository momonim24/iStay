import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  unread: boolean;
};

// Temporary data.
// Later, this will come from Supabase.
const notifications: Notification[] = [
  {
    id: "1",
    title: "Application Update",
    message: "Your rental application has been received.",
    time: "10 min ago",
    icon: "document-text-outline",
    unread: true,
  },
  {
    id: "2",
    title: "New Property Match",
    message: "A new property matching your preferences is available.",
    time: "1 hr ago",
    icon: "sparkles-outline",
    unread: true,
  },
  {
    id: "3",
    title: "Welcome to iStay!",
    message:
      "Start exploring rental properties and find a place that fits your needs.",
    time: "Yesterday",
    icon: "home-outline",
    unread: false,
  },
];

export default function NotificationsScreen() {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#172554" />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Your Notifications</Text>

            <Text style={styles.subtitle}>
              Stay updated with your iStay activity.
            </Text>
          </View>

          <Pressable>
            <Text style={styles.markRead}>Mark all read</Text>
          </Pressable>
        </View>

        {/* NOTIFICATION LIST */}
        {notifications.length > 0 ? (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                style={[
                  styles.notificationCard,
                  notification.unread && styles.unreadCard,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={notification.icon}
                    size={23}
                    color="#2563EB"
                  />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>

                    {notification.unread && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.message}>{notification.message}</Text>

                  <Text style={styles.time}>{notification.time}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-outline"
                size={42}
                color="#2563EB"
              />
            </View>

            <Text style={styles.emptyTitle}>No notifications yet</Text>

            <Text style={styles.emptyText}>
              Updates about your applications, properties and account will
              appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  placeholder: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 5,
  },

  markRead: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  list: {
    gap: 12,
  },

  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 15,
    flexDirection: "row",
  },

  unreadCard: {
    backgroundColor: "#F8FAFF",
    borderColor: "#BFDBFE",
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  notificationContent: {
    flex: 1,
  },

  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },

  message: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  time: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 8,
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
});
