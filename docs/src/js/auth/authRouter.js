import { supabase } from "../config/supabase";
import { requireAuth,getUserRole, logout } from "./access-control";
export async function routeAfterAuth(options = {}) {
  const {
    patientDashboard = "patient-dashboard.html",
    practitionerDashboard = "practitioner-dashboard.html",
    unkownRedirect = "user-login.html"
  } = options;
  
  const session = await requireAuth(unkownRedirect);
  const authUserId = session.user.id;

  const role = await getUserRole(authUserId)

  if (role == "practitioner"){
    window.location.href = practitionerDashboard;
    return;
  }

  if (role == "patient"){
    window.location.href = patientDashboard;
    return;
  }

  await supabase.auth.signOut();
  window.location.href = unkownRedirect;

}