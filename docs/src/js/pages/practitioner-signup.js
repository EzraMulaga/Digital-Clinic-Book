import { supabase } from "../config/supabase.js";

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

    // Step 2: Insert practitioner profile
    const { error: insertError } = await supabase
      .from("practitioners")
      .insert([{ auth_user_id, first_name, last_name, registration_number, role }]);

    if (insertError) {
      if (msgEl) { msgEl.textContent = `Profile error: ${insertError.message}. Please contact support to complete your registration.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
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
