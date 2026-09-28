export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Enter a valid email address.";
}
export function validatePassword(
  password: string,
  confirmation: string,
): string | null {
  if (
    password.length < 8 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  )
    return "Use at least 8 characters, including letters and numbers.";
  return password === confirmation ? null : "Your passwords do not match.";
}
