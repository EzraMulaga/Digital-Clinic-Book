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

    // Step 2: Create the patient record.
    // The "authenticated can insert patient profile" RLS policy allows any
    // authenticated user to insert a patient row.  Ownership is established
    // by the patient_users link inserted in Step 3.
    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .insert([{
        first_name,
        last_name,
        date_of_birth,
        blood_type,
        allergies,
        chronic_conditions,
        emergency_notes,
      }])
      .select("patient_id")
      .single();

    if (patientError) {
      if (msgEl) { msgEl.textContent = `Patient record error: ${patientError.message}. Please contact support to complete your registration.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
      return;
    }

    // Step 3: Link the auth user to the newly created patient record.
    // The "authenticated can create own patient mapping" RLS policy enforces
    // that auth_user_id must equal auth.uid(), so users can only link
    // themselves to a patient record.
    const { error: linkError } = await supabase
      .from("patient_users")
      .insert([{
        auth_user_id,
        patient_id: patientData.patient_id,
      }]);

    if (linkError) {
      // Sign the user out so they are not left in a broken authenticated state
      // (patient record exists but has no auth link).  They can try registering
      // again once the underlying issue is resolved.
      await supabase.auth.signOut();
      if (msgEl) { msgEl.textContent = `Account linking error: ${linkError.message}. Your session has been reset — please try registering again or contact support.`; msgEl.className = "error-message"; msgEl.style.display = "block"; }
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
