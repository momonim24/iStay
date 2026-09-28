import { useEffect, useState } from "react";
// Per-address deadlines survive screen remounts; Supabase enforces server limits.
const deadlines = new Map<string, number>();
export function useAuthCooldown(key: string) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return {
    seconds: Math.max(0, Math.ceil(((deadlines.get(key) ?? 0) - now) / 1000)),
    start: () => {
      deadlines.set(key, Date.now() + 60_000);
      setNow(Date.now());
    },
  };
}
