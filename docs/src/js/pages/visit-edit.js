import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getVisit, updateVisit, addDiagnosis, addPrescription, addTreatment } from "../services/clinic-services.js";
import { escapeHtml, friendlyErrorMessage, validateRequiredFields } from "../utils/html-utils.js";

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

// Handle visit details update
const visitEditForm = document.getElementById("visit-edit-form");
const visitEditMsg = document.getElementById("visit-edit-message");

// Load current visit data into the form
let visit;
try {
  visit = await getVisit(visitId);

  if (visitEditForm) {
    const setVal = (name, value) => {
      const el = visitEditForm.elements[name];
      if (el && value != null) el.value = value;
    };
    setVal("reason_for_visit", visit.reason_for_visit);
  }

  renderDiagnoses(visit.diagnoses ?? []);
  renderPrescriptions(visit.prescriptions ?? []);
  renderTreatments(visit.treatments ?? []);
} catch (err) {
  console.error("Failed to load visit data:", err);
  if (visitEditMsg) {
    visitEditMsg.textContent = `${friendlyErrorMessage(err, "We couldn't load this visit.")} Please try reloading the page.`;
    visitEditMsg.className = "error-message";
    visitEditMsg.style.display = "block";
  }
}

visitEditForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (visitEditMsg) { visitEditMsg.style.display = "none"; visitEditMsg.textContent = ""; visitEditMsg.className = "note"; }

  const valid = validateRequiredFields(visitEditForm, [
    { name: "reason_for_visit", label: "Reason for visit" },
  ]);
  if (!valid) return;

  const fd = new FormData(visitEditForm);
  const reason_for_visit = fd.get("reason_for_visit")?.trim();

  const visitEditSubmitBtn = visitEditForm.querySelector('button[type="submit"]');
  const visitEditSubmitLabel = visitEditSubmitBtn?.textContent;
  if (visitEditSubmitBtn) { visitEditSubmitBtn.disabled = true; visitEditSubmitBtn.textContent = "Saving…"; }

  try {
    await updateVisit(visitId, { reason_for_visit });
    if (visitEditMsg) {
      visitEditMsg.textContent = "Visit details updated.";
      visitEditMsg.style.display = "block";
    }
  } catch (err) {
    if (visitEditMsg) {
      visitEditMsg.textContent = friendlyErrorMessage(err);
      visitEditMsg.className = "error-message";
      visitEditMsg.style.display = "block";
    }
  } finally {
    if (visitEditSubmitBtn) { visitEditSubmitBtn.disabled = false; visitEditSubmitBtn.textContent = visitEditSubmitLabel; }
  }
});

// Handle add diagnosis
const addDiagnosisForm = document.getElementById("add-diagnosis-form");
const diagnosisMsg = document.getElementById("diagnosis-message");

addDiagnosisForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (diagnosisMsg) { diagnosisMsg.style.display = "none"; diagnosisMsg.textContent = ""; diagnosisMsg.className = "note"; }

  const valid = validateRequiredFields(addDiagnosisForm, [
    { name: "diagnosis", label: "Diagnosis" },
  ]);
  if (!valid) return;

  const fd = new FormData(addDiagnosisForm);
  const diagnosis = fd.get("diagnosis")?.trim();

  const diagnosisSubmitBtn = addDiagnosisForm.querySelector('button[type="submit"]');
  const diagnosisSubmitLabel = diagnosisSubmitBtn?.textContent;
  if (diagnosisSubmitBtn) { diagnosisSubmitBtn.disabled = true; diagnosisSubmitBtn.textContent = "Saving…"; }

  try {
    await addDiagnosis({ visit_id: visitId, diagnosis, notes: fd.get("diagnosis_notes")?.trim() || null });
    addDiagnosisForm.reset();
    if (diagnosisMsg) { diagnosisMsg.textContent = "Diagnosis added."; diagnosisMsg.style.display = "block"; }
    // Refresh displayed list
    const refreshed = await getVisit(visitId);
    renderDiagnoses(refreshed.diagnoses ?? []);
  } catch (err) {
    if (diagnosisMsg) { diagnosisMsg.textContent = friendlyErrorMessage(err); diagnosisMsg.className = "error-message"; diagnosisMsg.style.display = "block"; }
  } finally {
    if (diagnosisSubmitBtn) { diagnosisSubmitBtn.disabled = false; diagnosisSubmitBtn.textContent = diagnosisSubmitLabel; }
  }
});

// Handle add prescription
const addPrescriptionForm = document.getElementById("add-prescription-form");
const prescriptionMsg = document.getElementById("prescription-message");

addPrescriptionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (prescriptionMsg) { prescriptionMsg.style.display = "none"; prescriptionMsg.textContent = ""; prescriptionMsg.className = "note"; }

  const valid = validateRequiredFields(addPrescriptionForm, [
    { name: "medication_name", label: "Medication name" },
  ]);
  if (!valid) return;

  const fd = new FormData(addPrescriptionForm);
  const medication_name = fd.get("medication_name")?.trim();

  const prescriptionSubmitBtn = addPrescriptionForm.querySelector('button[type="submit"]');
  const prescriptionSubmitLabel = prescriptionSubmitBtn?.textContent;
  if (prescriptionSubmitBtn) { prescriptionSubmitBtn.disabled = true; prescriptionSubmitBtn.textContent = "Saving…"; }

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
    if (prescriptionMsg) { prescriptionMsg.textContent = friendlyErrorMessage(err); prescriptionMsg.className = "error-message"; prescriptionMsg.style.display = "block"; }
  } finally {
    if (prescriptionSubmitBtn) { prescriptionSubmitBtn.disabled = false; prescriptionSubmitBtn.textContent = prescriptionSubmitLabel; }
  }
});

// Handle add treatment
const addTreatmentForm = document.getElementById("add-treatment-form");
const treatmentMsg = document.getElementById("treatment-message");

addTreatmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (treatmentMsg) { treatmentMsg.style.display = "none"; treatmentMsg.textContent = ""; treatmentMsg.className = "note"; }

  const valid = validateRequiredFields(addTreatmentForm, [
    { name: "treatment", label: "Treatment" },
  ]);
  if (!valid) return;

  const fd = new FormData(addTreatmentForm);
  const treatment = fd.get("treatment")?.trim();

  const treatmentSubmitBtn = addTreatmentForm.querySelector('button[type="submit"]');
  const treatmentSubmitLabel = treatmentSubmitBtn?.textContent;
  if (treatmentSubmitBtn) { treatmentSubmitBtn.disabled = true; treatmentSubmitBtn.textContent = "Saving…"; }

  try {
    await addTreatment({ visit_id: visitId, treatment, notes: fd.get("treatment_notes")?.trim() || null });
    addTreatmentForm.reset();
    if (treatmentMsg) { treatmentMsg.textContent = "Treatment added."; treatmentMsg.style.display = "block"; }
    // Refresh displayed list
    const refreshed = await getVisit(visitId);
    renderTreatments(refreshed.treatments ?? []);
  } catch (err) {
    if (treatmentMsg) { treatmentMsg.textContent = friendlyErrorMessage(err); treatmentMsg.className = "error-message"; treatmentMsg.style.display = "block"; }
  } finally {
    if (treatmentSubmitBtn) { treatmentSubmitBtn.disabled = false; treatmentSubmitBtn.textContent = treatmentSubmitLabel; }
  }
});
