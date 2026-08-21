import { supabase } from "../config/supabase.js";
import { savePendingProfile, createPatientProfile } from "../auth/access-control.js";
import { friendlyErrorMessage, validateRequiredFields, setFieldError } from "../utils/html-utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Redirect if already authenticated
  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    window.location.href = "patient-dashboard.html";
    return;
  }

  const form = document.getElementById("user-signup-form");
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
    const date_of_birth = fd.get("date_of_birth")?.trim() || null;
    const blood_type = fd.get("blood_type")?.trim() || null;
    const allergies = fd.get("allergies")?.trim() || null;
    const chronic_conditions = fd.get("chronic_conditions")?.trim() || null;
    const emergency_notes = fd.get("emergency_notes")?.trim() || null;

    const valid = validateRequiredFields(form, [
      { name: "first_name", label: "First name" },
      { name: "last_name", label: "Last name" },
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

      const patientFields = {
        first_name,
        last_name,
        date_of_birth,
        blood_type,
        allergies,
        chronic_conditions,
        emergency_notes,
      };

      // Step 2: Create the patient record + link it to this auth user.
      // If the Supabase project requires email confirmation, signUp() above
      // does not return a session, so there is no "authenticated" request we
      // could make yet -- the insert policies would reject it. Defer the
      // profile creation until the user's first authenticated session instead
      // (completed automatically by routeAfterAuth() after they confirm and
      // log in -- see access-control.js).
      if (!signUpData.session) {
        savePendingProfile("patient", email, patientFields);
        if (msgEl) {
          msgEl.textContent = "Registration started! Please check your email to confirm your account, then log in — we'll finish setting up your profile automatically.";
          msgEl.className = "note";
          msgEl.style.display = "block";
        }
        form.reset();
        return;
      }

      const { error: profileError } = await createPatientProfile(auth_user_id, patientFields);

      if (profileError) {
        // Sign the user out so they are not left in a broken authenticated state
        // (auth account exists but has no linked patient record). They can try
        // registering again once the underlying issue is resolved.
        await supabase.auth.signOut();
        if (msgEl) { msgEl.textContent = `${friendlyErrorMessage(profileError)} Your session has been reset — please try registering again or contact support.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
        return;
      }

      if (msgEl) {
        msgEl.textContent = "Registration successful!";
        msgEl.className = "note";
        msgEl.style.display = "block";
      }
      form.reset();
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
    }
  });
});
