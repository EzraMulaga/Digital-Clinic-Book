import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getPractitioner, updatePractitioner } from "../services/clinic-services.js";
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

const form = document.getElementById("practitioner-edit-form");
const msgEl = document.getElementById("form-message");

// Load current practitioner data into the form
try {
  const practitioner = await getPractitioner(role.practitioner_id);

  const setVal = (name, value) => {
    const el = form.elements[name];
    if (el && value != null) el.value = value;
  };

  setVal("first_name", practitioner.first_name);
  setVal("last_name", practitioner.last_name);
  setVal("registration_number", practitioner.registration_number);
  setVal("role", practitioner.role);
} catch (err) {
  console.error("Failed to load practitioner data:", err);
  if (msgEl) {
    msgEl.textContent = `${friendlyErrorMessage(err, "We couldn't load your profile.")} Please try reloading the page.`;
    msgEl.className = "error-message";
    msgEl.style.display = "block";
  }
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; msgEl.className = "note"; }

  const valid = validateRequiredFields(form, [
    { name: "first_name", label: "First name" },
    { name: "last_name", label: "Last name" },
    { name: "registration_number", label: "Registration number" },
    { name: "role", label: "Role" },
  ]);
  if (!valid) return;

  const fd = new FormData(form);
  const first_name = fd.get("first_name")?.trim();
  const last_name = fd.get("last_name")?.trim();
  const registration_number = fd.get("registration_number")?.trim();
  const role_value = fd.get("role");

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitBtnLabel = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving…"; }

  try {
    await updatePractitioner(role.practitioner_id, {
      first_name,
      last_name,
      registration_number,
      role: role_value,
    });

    if (msgEl) {
      msgEl.textContent = "Profile updated successfully.";
      msgEl.style.display = "block";
    }
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = friendlyErrorMessage(err);
      msgEl.style.display = "block";
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
  }
});
