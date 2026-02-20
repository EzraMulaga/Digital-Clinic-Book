import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getVisit, updateVisit, addDiagnosis, addPrescription, addTreatment } from "../services/clinic-services.js";
import { escapeHtml } from "../utils/html-utils.js";

const session = await requireAuth("user-login.html");
const role = await getUserRole(session.user.id);

if (role.type !== "practitioner") {
  window.location.href = role.type === "patient"
    ? "patient-dashboard.html"
    : "user-login.html";
  throw new Error("Practitioner access required");
}

const params = new URLSearchParams(location.search);
const visitId = params.get("visit_id");

if (!visitId) {
  window.location.href = "patient-search.html";
  throw new Error("No visit_id provided");
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

// Set back/cancel link
const backLink = document.getElementById("back-link");
if (backLink) {
  backLink.href = `visit-details.html?visit_id=${encodeURIComponent(visitId)}`;
}

const diagnosesList = document.getElementById("diagnoses-list");
const prescriptionsList = document.getElementById("prescriptions-list");
const treatmentsList = document.getElementById("treatments-list");

function renderDiagnoses(items) {
  if (!diagnosesList) return;
  diagnosesList.innerHTML = items.length
    ? items.map(d => `<li>${escapeHtml(d.diagnosis)}${d.notes ? " — " + escapeHtml(d.notes) : ""}</li>`).join("")
    : "<li class='note'>No diagnoses recorded.</li>";
}

function renderPrescriptions(items) {
  if (!prescriptionsList) return;
  prescriptionsList.innerHTML = items.length
    ? items.map(p => `
        <li>
          <strong>${escapeHtml(p.medication_name)}</strong>
          ${p.dosage ? " — " + escapeHtml(p.dosage) : ""}
          ${p.frequency ? " | " + escapeHtml(p.frequency) : ""}
          ${p.duration ? " | " + escapeHtml(p.duration) : ""}
          ${p.instructions ? " | " + escapeHtml(p.instructions) : ""}
        </li>
      `).join("")
    : "<li class='note'>No prescriptions recorded.</li>";
}

function renderTreatments(items) {
  if (!treatmentsList) return;
  treatmentsList.innerHTML = items.length
    ? items.map(t => `<li>${escapeHtml(t.treatment)}${t.notes ? " — " + escapeHtml(t.notes) : ""}</li>`).join("")
    : "<li class='note'>No treatments recorded.</li>";
}

// Load current visit data into the form
let visit;
try {
  visit = await getVisit(visitId);

  const form = document.getElementById("visit-edit-form");
  if (form) {
    const setVal = (name, value) => {
      const el = form.elements[name];
      if (el && value != null) el.value = value;
    };
    setVal("reason_for_visit", visit.reason_for_visit);
    setVal("practitioner_name", visit.practitioner_name);
  }

  renderDiagnoses(visit.diagnoses ?? []);
  renderPrescriptions(visit.prescriptions ?? []);
  renderTreatments(visit.treatments ?? []);
} catch (err) {
  console.error("Failed to load visit data:", err);
}

// Handle visit details update
const visitEditForm = document.getElementById("visit-edit-form");
const visitEditMsg = document.getElementById("visit-edit-message");

visitEditForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (visitEditMsg) { visitEditMsg.style.display = "none"; visitEditMsg.textContent = ""; }

  const fd = new FormData(visitEditForm);
  const reason_for_visit = fd.get("reason_for_visit")?.trim();

  if (!reason_for_visit) {
    if (visitEditMsg) { visitEditMsg.textContent = "Reason for visit is required."; visitEditMsg.style.display = "block"; }
    return;
  }

  try {
    await updateVisit(visitId, {
      reason_for_visit,
      practitioner_name: fd.get("practitioner_name")?.trim() || null,
    });
    if (visitEditMsg) {
      visitEditMsg.textContent = "Visit details updated.";
      visitEditMsg.style.display = "block";
    }
  } catch (err) {
    if (visitEditMsg) {
      visitEditMsg.textContent = `Error: ${err.message}`;
      visitEditMsg.style.display = "block";
    }
  }
});

// Handle add diagnosis
const addDiagnosisForm = document.getElementById("add-diagnosis-form");
const diagnosisMsg = document.getElementById("diagnosis-message");

addDiagnosisForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (diagnosisMsg) { diagnosisMsg.style.display = "none"; diagnosisMsg.textContent = ""; }

  const fd = new FormData(addDiagnosisForm);
  const diagnosis = fd.get("diagnosis")?.trim();

  if (!diagnosis) {
    if (diagnosisMsg) { diagnosisMsg.textContent = "Diagnosis is required."; diagnosisMsg.style.display = "block"; }
    return;
  }

  try {
    await addDiagnosis({ visit_id: visitId, diagnosis, notes: fd.get("diagnosis_notes")?.trim() || null });
    addDiagnosisForm.reset();
    if (diagnosisMsg) { diagnosisMsg.textContent = "Diagnosis added."; diagnosisMsg.style.display = "block"; }
    // Refresh displayed list
    const refreshed = await getVisit(visitId);
    renderDiagnoses(refreshed.diagnoses ?? []);
  } catch (err) {
    if (diagnosisMsg) { diagnosisMsg.textContent = `Error: ${err.message}`; diagnosisMsg.style.display = "block"; }
  }
});

// Handle add prescription
const addPrescriptionForm = document.getElementById("add-prescription-form");
const prescriptionMsg = document.getElementById("prescription-message");

addPrescriptionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (prescriptionMsg) { prescriptionMsg.style.display = "none"; prescriptionMsg.textContent = ""; }

  const fd = new FormData(addPrescriptionForm);
  const medication_name = fd.get("medication_name")?.trim();

  if (!medication_name) {
    if (prescriptionMsg) { prescriptionMsg.textContent = "Medication name is required."; prescriptionMsg.style.display = "block"; }
    return;
  }

  try {
    await addPrescription({
      visit_id: visitId,
      medication_name,
      dosage: fd.get("dosage")?.trim() || null,
      frequency: fd.get("frequency")?.trim() || null,
      duration: fd.get("duration")?.trim() || null,
      instructions: fd.get("instructions")?.trim() || null,
    });
    addPrescriptionForm.reset();
    if (prescriptionMsg) { prescriptionMsg.textContent = "Prescription added."; prescriptionMsg.style.display = "block"; }
    // Refresh displayed list
    const refreshed = await getVisit(visitId);
    renderPrescriptions(refreshed.prescriptions ?? []);
  } catch (err) {
    if (prescriptionMsg) { prescriptionMsg.textContent = `Error: ${err.message}`; prescriptionMsg.style.display = "block"; }
  }
});

// Handle add treatment
const addTreatmentForm = document.getElementById("add-treatment-form");
const treatmentMsg = document.getElementById("treatment-message");

addTreatmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (treatmentMsg) { treatmentMsg.style.display = "none"; treatmentMsg.textContent = ""; }

  const fd = new FormData(addTreatmentForm);
  const treatment = fd.get("treatment")?.trim();

  if (!treatment) {
    if (treatmentMsg) { treatmentMsg.textContent = "Treatment is required."; treatmentMsg.style.display = "block"; }
    return;
  }

  try {
    await addTreatment({ visit_id: visitId, treatment, notes: fd.get("treatment_notes")?.trim() || null });
    addTreatmentForm.reset();
    if (treatmentMsg) { treatmentMsg.textContent = "Treatment added."; treatmentMsg.style.display = "block"; }
    // Refresh displayed list
    const refreshed = await getVisit(visitId);
    renderTreatments(refreshed.treatments ?? []);
  } catch (err) {
    if (treatmentMsg) { treatmentMsg.textContent = `Error: ${err.message}`; treatmentMsg.style.display = "block"; }
  }
});
