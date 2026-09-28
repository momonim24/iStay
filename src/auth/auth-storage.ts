export type StringStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
// Keep native SecureStore entries below 2 KB, including Unicode metadata.
// Publish the manifest last so an interrupted write preserves the old session.
export function chunkedStorage(
  storage: StringStorage,
  createId: () => string,
): StringStorage {
  const readManifest = (
    raw: string | null,
  ): { id: string; count: number } | null => {
    if (!raw?.startsWith("chunks:")) return null;
    const [, id, count] = raw.split(":");
    const size = Number(count);
    if (
      !/^[a-zA-Z0-9-]+$/.test(id) ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > 1024
    )
      throw new Error("Invalid saved session");
    return { id, count: size };
  };
  const clear = async (
    key: string,
    manifest: ReturnType<typeof readManifest>,
  ) => {
    if (manifest)
      await Promise.all(
        Array.from({ length: manifest.count }, (_, i) =>
          storage.removeItem(`${key}.${manifest.id}.${i}`),
        ),
      );
  };
  return {
    async getItem(key) {
      const raw = await storage.getItem(key);
      const manifest = readManifest(raw);
      if (!manifest) return raw; // Also reads sessions saved by the original app.
      const chunks = await Promise.all(
        Array.from({ length: manifest.count }, (_, i) =>
          storage.getItem(`${key}.${manifest.id}.${i}`),
        ),
      );
      if (chunks.some((chunk) => chunk === null))
        throw new Error("Incomplete saved session");
      return chunks.join("");
    },
    async setItem(key, value) {
      const previous = readManifest(await storage.getItem(key));
      const id = createId();
      const chunks = value.match(/[\s\S]{1,450}/gu) ?? [""];
      if (chunks.length > 1024) throw new Error("Saved session is too large");
      try {
        await Promise.all(
          chunks.map((chunk, i) => storage.setItem(`${key}.${id}.${i}`, chunk)),
        );
        await storage.setItem(key, `chunks:${id}:${chunks.length}`);
      } catch (error) {
        await clear(key, { id, count: chunks.length }).catch(() => undefined);
        throw error;
      }
      await clear(key, previous).catch(() => undefined);
    },
    async removeItem(key) {
      const previous = readManifest(await storage.getItem(key));
      await storage.removeItem(key);
      await clear(key, previous);
    },
  };
}
