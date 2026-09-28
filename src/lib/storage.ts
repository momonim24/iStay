import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";
import { chunkedStorage, type StringStorage } from "../auth/auth-storage";
const nativeStorage: StringStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
const webStorage: StringStorage = {
  async getItem(key) {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};
export const secureStorage =
  Platform.OS === "web"
    ? webStorage
    : chunkedStorage(nativeStorage, randomUUID);
