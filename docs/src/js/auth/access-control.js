/**
 * Access Control (client-side gating)
 * Real security must be enforced with Supabase RLS policies.
 */

import { supabase } from "../config/supabase.js";

// From any /src/pages/*.html page, this relative path works:
export async function requireAuth(redirectTo = "user-login.html") {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("getSession error:", error);
  }

  if (!session) {
    window.location.href = redirectTo;
    throw new Error("Not authenticated");
  }

  return session;
}

export async function getUserRole(authUserId) {
  // Check practitioner
  const { data: prac, error: pracErr } = await supabase
    .from("practitioners")
    .select("practitioner_id, role, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (pracErr) console.error("practitioner lookup error:", pracErr);

  if (prac?.is_active) return { type: "practitioner", ...prac };

  // Check patient
  const { data: pu, error: puErr } = await supabase
    .from("patient_users")
    .select("patient_id, patient_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (puErr) console.error("patient lookup error:", puErr);

  if (pu) return { type: "patient", ...pu };

  return { type: "unknown" };
}


export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("signOut error:", error);

  // From /src/pages/*.html, go back to your site home:
  window.location.href = "../../index.html";
}
