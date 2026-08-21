import { supabase } from "../config/supabase.js";
import { routeAfterAuth } from "../auth/authRouter.js";
import { friendlyErrorMessage, validateRequiredFields } from "../utils/html-utils.js";

const ROUTE_OPTIONS = {
  patientDashboard: "patient-dashboard.html",
  practitionerDashboard: "practitioner-dashboard.html",
  unknownRedirect: "user-login.html",
};

const ERROR_MESSAGES = {
  account_inactive: "Your practitioner account is pending activation and does not yet have access. Please contact an administrator.",
  account_incomplete: "We couldn't find a completed profile for this account. If you just registered, make sure you've confirmed your email from the link we sent, then log in again. If this keeps happening, please contact support.",
};

document.addEventListener("DOMContentLoaded", async () => {
  const errorEl = document.getElementById("login-error");

  const reason = new URLSearchParams(window.location.search).get("error");
  if (errorEl && reason) {
    errorEl.textContent = ERROR_MESSAGES[reason] || "There was a problem accessing your account. Please contact support.";
  }

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

    if (errorEl) errorEl.textContent = "";

    const valid = validateRequiredFields(form, [
      { name: "email", label: "Email address" },
      { name: "password", label: "Password" },
    ]);
    if (!valid) return;

    const email = form.elements["email"].value.trim();
    const password = form.elements["password"].value;

    const submitBtn = form.querySelector('button[type="submit"]');
    const submitBtnLabel = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Logging in…"; }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (errorEl) errorEl.textContent = friendlyErrorMessage(error);
        return;
      }

      await routeAfterAuth(ROUTE_OPTIONS);
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
    }
  });
});
