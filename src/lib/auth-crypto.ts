import {
  CryptoDigestAlgorithm,
  digest,
  getRandomValues,
  randomUUID,
} from "expo-crypto";
import { Platform } from "react-native";
// Supabase needs this Web Crypto subset for S256 PKCE. Browsers keep their full API.
if (Platform.OS !== "web" && !globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues,
      randomUUID,
      subtle: {
        digest: (algorithm: string, data: Uint8Array) => {
          if (algorithm !== "SHA-256")
            throw new Error("Unsupported auth digest");
          return digest(CryptoDigestAlgorithm.SHA256, new Uint8Array(data));
        },
      },
    },
  });
}
