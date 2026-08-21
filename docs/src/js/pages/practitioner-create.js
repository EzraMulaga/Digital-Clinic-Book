import { requireAuth, getUserRole } from "../auth/access-control.js";
import { createPractitioner } from "../services/clinic-services.js";
import { friendlyErrorMessage, validateRequiredFields } from "../utils/html-utils.js";

const session = await requireAuth("user-login.html");
const role = await getUserRole(session.user.id);

if (role.type !== "practitioner") {
  window.location.href = role.type === "patient"
    ? "patient-dashboard.html"
    : "user-login.html";
  throw new Error("Practitioner access required");
}

// Attach logout button
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.style.display = "inline-block";
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "logout.html";
  });
}

const form = document.getElementById("practitioner-create-form");
const msgEl = document.getElementById("form-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; }

  const valid = validateRequiredFields(form, [
    { name: "first_name", label: "First name" },
    { name: "last_name", label: "Last name" },
    { name: "registration_number", label: "Registration number" },
    { name: "role", label: "Role" },
    { name: "auth_user_id", label: "Supabase Auth User ID" },
  ]);
  if (!valid) return;

  const fd = new FormData(form);
  const first_name = fd.get("first_name")?.trim();
  const last_name = fd.get("last_name")?.trim();
  const registration_number = fd.get("registration_number")?.trim();
  const role_value = fd.get("role");
  const auth_user_id = fd.get("auth_user_id")?.trim();

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitBtnLabel = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving…"; }

  try {
    await createPractitioner({
      first_name,
      last_name,
      registration_number,
      role: role_value,
      auth_user_id,
    });

    if (msgEl) {
      msgEl.textContent = "Practitioner registered successfully.";
      msgEl.style.display = "block";
    }
    form.reset();
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = friendlyErrorMessage(err);
      msgEl.style.display = "block";
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
  }
});
