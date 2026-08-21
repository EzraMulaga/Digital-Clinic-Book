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

  // A practitioner row exists but is deactivated (or pending activation) --
  // report this distinctly from "unknown" so callers can show a specific
  // message instead of treating it as an orphaned account.
  if (prac) {
    return prac.is_active
      ? { type: "practitioner", ...prac }
      : { type: "inactive_practitioner", ...prac };
  }

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

// ---------------------------------------------------------------------------
// Deferred profile creation
// ---------------------------------------------------------------------------
// signUp() only returns an active session immediately if the Supabase project
// auto-confirms emails. If "Confirm email" is enabled, there is no session
// until the user clicks the confirmation link, so the patients/patient_users
// (or practitioners) insert cannot happen inside the signup handler -- it
// would run as the anon role and be rejected by RLS. Instead we stash the
// submitted profile fields locally and finish creating the profile the first
// time we see an authenticated session with no matching role (see
// routeAfterAuth in authRouter.js). This only works if confirmation is
// completed in the same browser the user registered from.

const PENDING_PROFILE_KEY = "dcb_pending_profile";

export function savePendingProfile(type, email, fields) {
  try {
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ type, email, fields }));
  } catch (e) {
    console.warn("Could not save pending profile locally:", e);
  }
}

export function getPendingProfile() {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch (e) {
    // ignore
  }
}

// Shared insert logic used both by the immediate-session signup path and by
// the deferred completion path in routeAfterAuth().
export async function createPatientProfile(authUserId, fields) {
  const { data: patientData, error: patientError } = await supabase
    .from("patients")
    .insert([fields])
    .select("patient_id")
    .single();

  if (patientError) return { error: patientError };

  const { error: linkError } = await supabase
    .from("patient_users")
    .insert([{ auth_user_id: authUserId, patient_id: patientData.patient_id }]);

  return { error: linkError || null };
}

// New practitioner accounts are always created inactive. Self-registration
// must never be sufficient to grant access to patient data -- a practitioner
// must be verified and activated out-of-band (see rls-policies.sql section 0).
// is_active: false is set explicitly here as defense in depth, in addition to
// the column default in the schema.
export async function createPractitionerProfile(authUserId, fields) {
  const { error } = await supabase
    .from("practitioners")
    .insert([{ auth_user_id: authUserId, ...fields, is_active: false }]);

  return { error: error || null };
}
