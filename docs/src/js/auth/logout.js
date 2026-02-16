import { supabase } from "../config/supabase.js";

/**
 * Logs the user out and redirects safely.
 * Uses location.replace to avoid "Back" returning to protected pages.
 */
async function logoutAndRedirect() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn("Sign out warning:", error);
  } catch (e) {
    console.warn("Sign out exception:", e);
  }

  // Redirect to home after logout
  window.location.replace("../../index.html");
}

logoutAndRedirect();
