import { supabase } from "../config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn("Session check warning:", error);

  if (!data?.session) {
    // Not logged in -> Access denied (or login)
    window.location.replace("access-denied.html?reason=not_logged_in");
  }
});
