import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getVisit } from "../services/clinic-services.js";
import { escapeHtml } from "../utils/html-utils.js";

const session = await requireAuth("user-login.html");
const role = await getUserRole(session.user.id);

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

const loadingEl = document.getElementById("visit-loading");
const visitInfoEl = document.getElementById("visit-info");
const visitDateEl = document.getElementById("visit-date");
const visitReasonEl = document.getElementById("visit-reason");
const visitPractitionerEl = document.getElementById("visit-practitioner");
const diagnosesList = document.getElementById("diagnoses-list");
const prescriptionsList = document.getElementById("prescriptions-list");
const treatmentsList = document.getElementById("treatments-list");
const backLink = document.getElementById("back-to-patient");

try {
  const visit = await getVisit(visitId);

  if (loadingEl) loadingEl.style.display = "none";
  if (visitInfoEl) visitInfoEl.style.display = "block";

  if (visitDateEl) visitDateEl.textContent = new Date(visit.visit_date).toLocaleString();
  if (visitReasonEl) visitReasonEl.textContent = visit.reason_for_visit ?? "—";
  if (visitPractitionerEl) visitPractitionerEl.textContent = visit.practitioner_name ?? "—";

  if (backLink && visit.patient_id) {
    backLink.href = `patient-info.html?patient_id=${encodeURIComponent(visit.patient_id)}`;
  }

  const logAnotherLink = document.getElementById("log-another-visit");
  if (logAnotherLink && visit.patient_id) {
    logAnotherLink.href = `visit-create.html?patient_id=${encodeURIComponent(visit.patient_id)}`;
  }

  // Show edit link for practitioners only
  const editVisitLink = document.getElementById("edit-visit-link");
  if (editVisitLink && role.type === "practitioner") {
    editVisitLink.href = `visit-edit.html?visit_id=${encodeURIComponent(visitId)}`;
    editVisitLink.style.display = "inline-block";
  }

  // Diagnoses
  if (diagnosesList) {
    const items = visit.diagnoses ?? [];
    diagnosesList.innerHTML = items.length
      ? items.map(d => `<li>${escapeHtml(d.diagnosis)}${d.notes ? " — " + escapeHtml(d.notes) : ""}</li>`).join("")
      : "<li class='note'>No diagnoses recorded for this visit.</li>";
  }

  // Prescriptions
  if (prescriptionsList) {
    const items = visit.prescriptions ?? [];
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
      : "<li class='note'>No prescriptions recorded for this visit.</li>";
  }

  // Treatments
  if (treatmentsList) {
    const items = visit.treatments ?? [];
    treatmentsList.innerHTML = items.length
      ? items.map(t => `<li>${escapeHtml(t.treatment)}${t.notes ? " — " + escapeHtml(t.notes) : ""}</li>`).join("")
      : "<li class='note'>No treatments recorded for this visit.</li>";
  }
} catch (err) {
  if (loadingEl) loadingEl.textContent = `Error loading visit: ${err.message}`;
}
