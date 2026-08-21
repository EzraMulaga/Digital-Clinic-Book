import { supabase } from "../config/supabase.js";
import {
  requireAuth,
  getUserRole,
  logout,
  getPendingProfile,
  clearPendingProfile,
  createPatientProfile,
  createPractitionerProfile,
} from "./access-control.js";

// If this session has no matching practitioners/patient_users row, check for
// a profile that was deferred at signup time (Confirm-email was enabled, so
// there was no session yet to insert with -- see access-control.js). Returns
// true if a profile was created just now and the role should be re-checked.
async function tryCompletePendingProfile(session) {
  const pending = getPendingProfile();
  if (!pending || pending.email !== session.user.email) return false;

  const { type, fields } = pending;
  const { error } = type === "practitioner"
    ? await createPractitionerProfile(session.user.id, fields)
    : await createPatientProfile(session.user.id, fields);

  if (error) {
    console.error("Deferred profile creation failed:", error);
    return false;
  }

  clearPendingProfile();
  return true;
}

export async function routeAfterAuth(options = {}) {
  const {
    patientDashboard = "patient-dashboard.html",
    practitionerDashboard = "practitioner-dashboard.html",
    unknownRedirect = "user-login.html"
  } = options;

  const session = await requireAuth(unknownRedirect);
  const authUserId = session.user.id;

  let role = await getUserRole(authUserId);

  if (role.type === "unknown") {
    const completed = await tryCompletePendingProfile(session);
    if (completed) role = await getUserRole(authUserId);
  }

  if (role.type === "practitioner"){
    window.location.href = practitionerDashboard;
    return;
  }

  if (role.type === "patient"){
    window.location.href = patientDashboard;
    return;
  }

  await supabase.auth.signOut();

  // role.type is "inactive_practitioner" or still "unknown" (no matching
  // profile and nothing pending to complete it with) -- give the user a
  // reason instead of bouncing them back to login with no explanation.
  const reason = role.type === "inactive_practitioner" ? "account_inactive" : "account_incomplete";
  window.location.href = `${unknownRedirect}${unknownRedirect.includes("?") ? "&" : "?"}error=${reason}`;
}