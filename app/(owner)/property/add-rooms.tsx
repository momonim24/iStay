import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type Room = {
  id: number;
  name: string;
  monthlyRent: string;
  capacity: string;
  availableSlots: string;
};

export default function AddRoomsScreen() {
  const params = useLocalSearchParams();

  const [rooms, setRooms] = useState<Room[]>([
    {
      id: 1,
      name: "",
      monthlyRent: "",
      capacity: "",
      availableSlots: "",
    },
  ]);

  const updateRoom = (
    id: number,
    field: keyof Omit<Room, "id">,
    value: string,
  ) => {
    setRooms((current) =>
      current.map((room) =>
        room.id === id
          ? {
              ...room,
              [field]: value,
            }
          : room,
      ),
    );
  };

  const addRoom = () => {
    setRooms((current) => [
      ...current,
      {
        id: Date.now(),
        name: "",
        monthlyRent: "",
        capacity: "",
        availableSlots: "",
      },
    ]);
  };

  const removeRoom = (id: number) => {
    setRooms((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((room) => room.id !== id);
    });
  };

  const roomsValid = rooms.every((room) => {
    const capacity = Number(room.capacity);
    const slots = Number(room.availableSlots);

    return (
      room.name.trim().length > 0 &&
      Number(room.monthlyRent) > 0 &&
      capacity > 0 &&
      slots >= 0 &&
      slots <= capacity
    );
  });

  const handleContinue = () => {
  if (!roomsValid) return;

  router.push({
    pathname: "/(owner)/property/add-amenities",
    params: {
      ...params,
      rooms: JSON.stringify(rooms),
    },
  });
};

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>

          <Text style={styles.headerTitle}>Add Property</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepText}>STEP 3 OF 5</Text>

          <Text style={styles.title}>Rooms</Text>

          <Text style={styles.subtitle}>
            Add the rooms or rental spaces available in this property.
          </Text>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>

          {rooms.map((room, index) => {
            const invalidSlots =
              room.capacity !== "" &&
              room.availableSlots !== "" &&
              Number(room.availableSlots) > Number(room.capacity);

            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomTitle}>
                    Room {index + 1}
                  </Text>

                  {rooms.length > 1 && (
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeRoom(room.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#DC2626"
                      />
                    </Pressable>
                  )}
                </View>

                <Text style={styles.label}>
                  Room Name <Text style={styles.required}>*</Text>
                </Text>

                <TextInput
                  style={styles.input}
                  value={room.name}
                  onChangeText={(value) =>
                    updateRoom(room.id, "name", value)
                  }
                  placeholder="e.g. Room A, Single Room, Bedspace"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.label}>
                  Monthly Rent <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.moneyInput}>
                  <Text style={styles.currency}>₱</Text>

                  <TextInput
                    style={styles.moneyTextInput}
                    value={room.monthlyRent}
                    onChangeText={(value) =>
                      updateRoom(room.id, "monthlyRent", value)
                    }
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>
                      Capacity <Text style={styles.required}>*</Text>
                    </Text>

                    <TextInput
                      style={styles.input}
                      value={room.capacity}
                      onChangeText={(value) =>
                        updateRoom(room.id, "capacity", value)
                      }
                      placeholder="e.g. 4"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.half}>
                    <Text style={styles.label}>
                      Available <Text style={styles.required}>*</Text>
                    </Text>

                    <TextInput
                      style={styles.input}
                      value={room.availableSlots}
                      onChangeText={(value) =>
                        updateRoom(room.id, "availableSlots", value)
                      }
                      placeholder="e.g. 2"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {invalidSlots && (
                  <View style={styles.errorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text style={styles.errorText}>
                      Available slots cannot exceed the room capacity.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          <Pressable style={styles.addRoomButton} onPress={addRoom}>
            <Ionicons
              name="add-circle-outline"
              size={20}
              color="#2563EB"
            />

            <Text style={styles.addRoomText}>
              Add Another Room
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.continueButton,
              !roomsValid && styles.continueButtonDisabled,
            ]}
            disabled={!roomsValid}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 60,
  },

  stepText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 8,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginTop: 5,
  },

  progressBackground: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 28,
    overflow: "hidden",
  },

  progressFill: {
    width: "60%",
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  roomCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },

  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roomTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 16,
  },

  required: {
    color: "#DC2626",
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  moneyInput: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  currency: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginRight: 8,
  },

  moneyTextInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: "#0F172A",
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  half: {
    flex: 1,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#DC2626",
  },

  addRoomButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  addRoomText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },

  continueButton: {
    minHeight: 52,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
