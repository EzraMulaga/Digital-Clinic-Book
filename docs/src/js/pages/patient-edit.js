import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getPatient, updatePatient } from "../services/clinic-services.js";

const session = await requireAuth("user-login.html");
const role = await getUserRole(session.user.id);

const params = new URLSearchParams(location.search);
let patientId = params.get("patient_id");

// Patients editing their own record
if (!patientId && role.type === "patient") {
  patientId = role.patient_id;
}

if (!patientId) {
  window.location.href = "patient-search.html";
  throw new Error("No patient_id provided");
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

const form = document.getElementById("patient-edit-form");

// Load current patient data into the form
try {
  const patient = await getPatient(patientId);

  const setVal = (name, value) => {
    const el = form.elements[name];
    if (el && value != null) el.value = value;
  };

  setVal("first_name", patient.first_name);
  setVal("last_name", patient.last_name);
  setVal("date_of_birth", patient.date_of_birth);
  setVal("blood_type", patient.blood_type);
  setVal("allergies", patient.allergies);
  setVal("chronic_conditions", patient.chronic_conditions);
  setVal("emergency_notes", patient.emergency_notes);
} catch (err) {
  console.error("Failed to load patient data:", err);
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("form-message");
  if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; }

  const fd = new FormData(form);

  try {
    await updatePatient(patientId, {
      first_name: fd.get("first_name")?.trim(),
      last_name: fd.get("last_name")?.trim(),
      date_of_birth: fd.get("date_of_birth") || null,
      blood_type: fd.get("blood_type")?.trim() || null,
      allergies: fd.get("allergies")?.trim() || null,
      chronic_conditions: fd.get("chronic_conditions")?.trim() || null,
      emergency_notes: fd.get("emergency_notes")?.trim() || null,
    });

    window.location.href = `patient-info.html?patient_id=${encodeURIComponent(patientId)}`;
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = `Error saving: ${err.message}`;
      msgEl.style.display = "block";
    }
  }
});
