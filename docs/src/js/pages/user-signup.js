import { supabase } from "../config/supabase.js";

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

    if (password !== confirm_password) {
      if (msgEl) { msgEl.textContent = "Passwords do not match."; msgEl.className = "error-message"; msgEl.style.display = "block"; }
      return;
    }

    // Step 1: Create Supabase Auth account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      if (msgEl) { msgEl.textContent = signUpError.message; msgEl.className = "error-message"; msgEl.style.display = "block"; }
      return;
    }

    const auth_user_id = signUpData.user?.id;
    if (!auth_user_id) {
      if (msgEl) { msgEl.textContent = "Account creation failed. Please try again."; msgEl.className = "error-message"; msgEl.style.display = "block"; }
      return;
    }

    // Step 2: Create patient record and link auth user via SECURITY DEFINER function
    // (bypasses RLS so the newly signed-up user is not blocked by row-level policies)
    const { error: registerError } = await supabase.rpc("register_patient_user", {
      p_first_name: first_name,
      p_last_name: last_name,
      p_date_of_birth: date_of_birth,
      p_blood_type: blood_type,
      p_allergies: allergies,
      p_chronic_conditions: chronic_conditions,
      p_emergency_notes: emergency_notes,
    });

    if (registerError) {
      if (msgEl) { msgEl.textContent = `Patient record error: ${registerError.message}. Please contact support to complete your registration.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
      return;
    }

    if (msgEl) {
      msgEl.textContent = "Registration successful! Please check your email to confirm your account, then log in.";
      msgEl.className = "note";
      msgEl.style.display = "block";
    }
    form.reset();
  });
});
