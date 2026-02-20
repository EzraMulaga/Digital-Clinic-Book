import { supabase } from "../config/supabase.js";
import { requireAuth, getUserRole, logout } from "./access-control.js";
export async function routeAfterAuth(options = {}) {
  const {
    patientDashboard = "patient-dashboard.html",
    practitionerDashboard = "practitioner-dashboard.html",
    unknownRedirect = "user-login.html"
  } = options;
  
  const session = await requireAuth(unknownRedirect);
  const authUserId = session.user.id;

  const role = await getUserRole(authUserId)

  if (role.type === "practitioner"){
    window.location.href = practitionerDashboard;
    return;
  }

  if (role.type === "patient"){
    window.location.href = patientDashboard;
    return;
  }

  await supabase.auth.signOut();
  window.location.href = unknownRedirect;

}