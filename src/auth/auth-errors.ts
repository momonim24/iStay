export class AuthFlowError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export function authErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  )
    return error.code;
  return undefined;
}
export function authErrorMessage(error: unknown): string {
  switch (authErrorCode(error)) {
    case "configuration_missing":
      return "Sign-in is not configured yet. Please contact the iStay team.";
    case "native_build_required":
      return "Open iStay in an installed app build to use email links and Google sign-in.";
    case "invalid_credentials":
      return "The email or password is incorrect. Check your details and try again.";
    case "email_not_confirmed":
      return "Please verify your email before signing in.";
    case "user_already_exists":
    case "email_exists":
      return "An account may already use this email. Try logging in or resetting your password.";
    case "weak_password":
      return "Choose a stronger password with at least 8 characters, including letters and numbers.";
    case "same_password":
      return "Choose a password different from your current password.";
    case "email_address_invalid":
    case "validation_failed":
      return "Check your email and other details, then try again.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many requests. Please wait a few minutes before trying again.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
    case "pkce_verifier_missing":
    case "pkce_code_verifier_not_found":
    case "invalid_link":
      return "This link is invalid, expired, or already used. Request a new link and open it on the same device that requested it.";
    case "provider_disabled":
    case "oauth_provider_not_supported":
    case "validation_failed_provider":
      return "Google sign-in is not available yet. Please use email or try again later.";
    case "access_denied":
      return "Google sign-in was not completed. You can try again or use email.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Your session has ended. Please log in again.";
    case "email_address_not_authorized":
      return "Email delivery is not available for this address yet. Please contact the iStay team.";
    case "email_provider_disabled":
    case "signup_disabled":
      return "Email registration is not available right now. Please try again later.";
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error &&
      /network|fetch|connection|timeout/i.test(error.message))
  ) {
    return "We couldn't connect to iStay. Check your internet connection and try again.";
  }
  return "We couldn't complete that request. Please try again in a moment.";
}
