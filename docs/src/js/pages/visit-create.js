import { requireAuth, getUserRole } from "../auth/access-control.js";
import { createVisit, addDiagnosis, addPrescription, addTreatment } from "../services/clinic-services.js";
import { escapeHtml, friendlyErrorMessage, validateRequiredFields } from "../utils/html-utils.js";

const session = await requireAuth("user-login.html");
const role = await getUserRole(session.user.id);

if (role.type !== "practitioner") {
  window.location.href = role.type === "patient"
    ? "patient-dashboard.html"
    : "user-login.html";
  throw new Error("Practitioner access required");
}

// Pre-fill patient_id from URL params
const params = new URLSearchParams(location.search);
const prefilledPatientId = params.get("patient_id");
if (prefilledPatientId) {
  const patientIdInput = document.getElementById("patient_id");
  if (patientIdInput) patientIdInput.value = prefilledPatientId;
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

const form = document.getElementById("visit-create-form");
const msgEl = document.getElementById("form-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (msgEl) { msgEl.style.display = "none"; msgEl.textContent = ""; }

  const valid = validateRequiredFields(form, [
    { name: "patient_id", label: "Patient ID" },
    { name: "reason_for_visit", label: "Reason for visit" },
  ]);
  if (!valid) return;

  const fd = new FormData(form);
  const patient_id = fd.get("patient_id")?.trim();
  const reason_for_visit = fd.get("reason_for_visit")?.trim();

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitBtnLabel = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving…"; }

  try {
    const visit = await createVisit({
      patient_id,
      reason_for_visit,
      practitioner_id: role.practitioner_id ?? null,
    });

    const visit_id = visit.visit_id;

    // Add diagnosis if provided
    const diagnosis = fd.get("diagnosis")?.trim();
    if (diagnosis) {
      await addDiagnosis({ visit_id, diagnosis, notes: fd.get("diagnosis_notes")?.trim() || null });
    }

    // Add prescription if medication name provided
    const medication_name = fd.get("medication_name")?.trim();
    if (medication_name) {
      await addPrescription({
        visit_id,
        medication_name,
        dosage: fd.get("dosage")?.trim() || null,
        frequency: fd.get("frequency")?.trim() || null,
        duration: fd.get("duration")?.trim() || null,
        instructions: fd.get("instructions")?.trim() || null,
      });
    }

    // Add treatment if provided
    const treatment = fd.get("treatment")?.trim();
    if (treatment) {
      await addTreatment({ visit_id, treatment, notes: fd.get("treatment_notes")?.trim() || null });
    }

    // Redirect to visit details
    window.location.href = `visit-details.html?visit_id=${encodeURIComponent(visit_id)}`;
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = friendlyErrorMessage(err);
      msgEl.style.display = "block";
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtnLabel; }
  }
});
