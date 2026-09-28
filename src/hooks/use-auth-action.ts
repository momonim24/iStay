import { useRef, useState } from "react";
import { authErrorMessage } from "../auth/auth-errors";
// A ref closes the double-tap window before React renders the disabled button.
export function useAuthAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, setError, setMessage, run };
}
