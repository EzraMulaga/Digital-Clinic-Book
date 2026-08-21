import { requireAuth, getUserRole } from "../auth/access-control.js";
import { getPatient, getPatientVisits } from "../services/clinic-services.js";
import { escapeHtml, friendlyErrorMessage } from "../utils/html-utils.js";

const session = await requireAuth();
const role = await getUserRole(session.user.id);

const params = new URLSearchParams(location.search);
let patientId = params.get("patient_id");

// If no patient_id in URL, resolve from the logged-in patient user
if (!patientId) {
  if (role.type === "patient") {
    patientId = role.patient_id;
  } else if (role.type === "practitioner") {
    // Practitioner must supply a patient_id; redirect back to search
    window.location.href = "patient-search.html";
    throw new Error("No patient_id provided");
  }
}

const patientBox = document.getElementById("patient");
const visitsBox = document.getElementById("visits");

// Show "Log Visit" link for practitioners
const logVisitLink = document.getElementById("log-visit-link");
if (logVisitLink && role.type === "practitioner") {
  logVisitLink.href = `visit-create.html?patient_id=${encodeURIComponent(patientId)}`;
  logVisitLink.style.display = "inline-block";
}

// Set edit link with patient_id
const editLink = document.getElementById("edit-link");
if (editLink && patientId) {
  editLink.href = `patient-edit.html?patient_id=${encodeURIComponent(patientId)}`;
}

try {
  const patient = await getPatient(patientId);
  if (patientBox) {
    patientBox.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</p>
      <p><strong>Date of Birth:</strong> ${escapeHtml(patient.date_of_birth ?? "—")}</p>
      <p><strong>Blood Type:</strong> ${escapeHtml(patient.blood_type ?? "—")}</p>
      <p><strong>Allergies:</strong> ${escapeHtml(patient.allergies ?? "None recorded")}</p>
      <p><strong>Chronic Conditions:</strong> ${escapeHtml(patient.chronic_conditions ?? "None recorded")}</p>
      <p><strong>Emergency Notes:</strong> ${escapeHtml(patient.emergency_notes ?? "—")}</p>
    `;
  }

  const visits = await getPatientVisits(patientId);
  if (visitsBox) {
    visitsBox.innerHTML = visits.length
      ? visits.map(v => `
        <article class="card">
          <h3>
            ${escapeHtml(new Date(v.visit_date).toLocaleString())} — ${escapeHtml(v.reason_for_visit ?? "")}
            <a href="visit-details.html?visit_id=${escapeHtml(v.visit_id)}" class="btn" style="float:right; font-size:0.85rem;">Details</a>
          </h3>
          <p><strong>Practitioner:</strong> ${escapeHtml(v.practitioner ? `${v.practitioner.first_name} ${v.practitioner.last_name}` : "—")}</p>

          <h4>Diagnoses</h4>
          <ul>${(v.diagnoses ?? []).map(d => `<li>${escapeHtml(d.diagnosis)} ${d.notes ? "— " + escapeHtml(d.notes) : ""}</li>`).join("") || "<li>None</li>"}</ul>

          <h4>Prescriptions</h4>
          <ul>${(v.prescriptions ?? []).map(p => `<li>${escapeHtml(p.medication_name)} ${escapeHtml(p.dosage ?? "")} (${escapeHtml(p.frequency ?? "")})</li>`).join("") || "<li>None</li>"}</ul>

          <h4>Treatments</h4>
          <ul>${(v.treatments ?? []).map(t => `<li>${escapeHtml(t.treatment)} ${t.notes ? "— " + escapeHtml(t.notes) : ""}</li>`).join("") || "<li>None</li>"}</ul>
        </article>
      `).join("")
      : "<p class='note'>No visits recorded.</p>";
  }
} catch (err) {
  if (patientBox) {
    patientBox.textContent = `${friendlyErrorMessage(err, "We couldn't load this patient's record.")} Please try again.`;
    patientBox.className = "error-message";
  }
}
