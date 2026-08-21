import { supabase } from "../config/supabase.js";
import { savePendingProfile, createPractitionerProfile } from "../auth/access-control.js";
import { friendlyErrorMessage, validateRequiredFields, setFieldError } from "../utils/html-utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Redirect if already authenticated
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    window.location.href = "practitioner-dashboard.html";
    return;
  }

  const form = document.getElementById("practitioner-signup-form");
  const msgEl = document.getElementById("signup-message");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msgEl) { msgEl.textContent = ""; msgEl.className = "note"; msgEl.style.display = "none"; }

    const fd = new FormData(form);
    const email = fd.get("email")?.trim();
    const password = fd.get("password");
    const confirm_password = fd.get("confirm_password");
    const first_name = fd.get("first_name")?.trim();
    const last_name = fd.get("last_name")?.trim();
    const registration_number = fd.get("registration_number")?.trim();
    const role = fd.get("role");

    const valid = validateRequiredFields(form, [
      { name: "first_name", label: "First name" },
      { name: "last_name", label: "Last name" },
      { name: "registration_number", label: "Registration number" },
      { name: "role", label: "Role" },
      { name: "email", label: "Email address" },
      { name: "password", label: "Password" },
      { name: "confirm_password", label: "Confirm password" },
    ]);
    if (!valid) return;

    if (password !== confirm_password) {
      setFieldError(form, "confirm_password", "Passwords do not match.");
      form.elements["confirm_password"].focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const submitBtnLabel = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating account…"; }

    try {
      // Step 1: Create Supabase Auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        if (msgEl) { msgEl.textContent = friendlyErrorMessage(signUpError); msgEl.className = "error-message"; msgEl.style.display = "block"; }
        return;
      }

      const auth_user_id = signUpData.user?.id;
      if (!auth_user_id) {
        if (msgEl) { msgEl.textContent = "Account creation failed. Please try again."; msgEl.className = "error-message"; msgEl.style.display = "block"; }
        return;
      }

      const practitionerFields = { first_name, last_name, registration_number, role };

      // Step 2: Create the practitioner profile. New practitioners are always
      // created inactive (createPractitionerProfile enforces this) -- self-
      // registration alone must never grant access to patient data. Someone
      // with access to the database must verify and activate the account.
      //
      // As with patient signup, if the project requires email confirmation
      // there's no session yet to insert with, so defer it (see
      // access-control.js / authRouter.js's routeAfterAuth()).
      if (!signUpData.session) {
        savePendingProfile("practitioner", email, practitionerFields);
        if (msgEl) {
          msgEl.textContent = "Registration started! Please check your email to confirm your account, then log in — we'll finish setting up your profile automatically. Note: new practitioner accounts are inactive until an administrator verifies and activates them.";
          msgEl.className = "note";
          msgEl.style.display = "block";
        }
        form.reset();
        return;
      }

      const { error: profileError } = await createPractitionerProfile(auth_user_id, practitionerFields);

      if (profileError) {
        // Sign out so the user isn't left authenticated with no profile row
        // (consistent with the patient signup failure path).
        await supabase.auth.signOut();
        if (msgEl) { msgEl.textContent = `${friendlyErrorMessage(profileError)} Your session has been reset — please try registering again or contact support.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
        return;
      }

      if (msgEl) {
        msgEl.textContent = "Registration successful! Your account is inactive until an administrator verifies and activates it — you won't have access to patient records until then.";
        msgEl.className = "note";
        msgEl.style.display = "block";
      }
      form.reset();
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
    }
  });
});
