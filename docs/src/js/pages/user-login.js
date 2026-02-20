import { supabase } from "../config/supabase.js";
import { routeAfterAuth } from "../auth/authRouter.js";

const ROUTE_OPTIONS = {
  patientDashboard: "patient-dashboard.html",
  practitionerDashboard: "practitioner-dashboard.html",
  unknownRedirect: "user-login.html",
};

document.addEventListener("DOMContentLoaded", async () => {
  // If the user is already authenticated, route them to their dashboard
  // without showing the login form again.
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    await routeAfterAuth(ROUTE_OPTIONS);
    return;
  }

  // Handle login form submission
  const form = document.getElementById("user-login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;
    const errorEl = document.getElementById("login-error");

    if (errorEl) errorEl.textContent = "";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (errorEl) errorEl.textContent = error.message;
      return;
    }

    await routeAfterAuth(ROUTE_OPTIONS);
  });
});
