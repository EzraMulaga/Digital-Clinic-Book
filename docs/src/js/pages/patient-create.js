import { requireAuth, getUserRole } from "../auth/access-control.js";
import { createPatient } from "../services/clinic-services.js";

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

const form = document.getElementById("patient-create-form");
const msgEl = document.getElementById("form-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; }

  const fd = new FormData(form);
  const first_name = fd.get("first_name")?.trim();
  const last_name = fd.get("last_name")?.trim();

  if (!first_name || !last_name) {
    if (msgEl) { msgEl.textContent = "First name and last name are required."; msgEl.style.display = "block"; }
    return;
  }

  try {
    const patient = await createPatient({
      first_name,
      last_name,
      date_of_birth: fd.get("date_of_birth") || null,
      blood_type: fd.get("blood_type") || null,
      allergies: fd.get("allergies")?.trim() || null,
      chronic_conditions: fd.get("chronic_conditions")?.trim() || null,
      emergency_notes: fd.get("emergency_notes")?.trim() || null,
    });

    window.location.href = `patient-info.html?patient_id=${encodeURIComponent(patient.patient_id)}`;
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = `Error: ${err.message}`;
      msgEl.style.display = "block";
    }
  }
});
