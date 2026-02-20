import { requireAuth } from "../auth/access-control.js";
import { getPatient, getPatientVisits } from "../services/clinic-services.js";
import { escapeHtml } from "../utils/html-utils.js";

await requireAuth();

const params = new URLSearchParams(location.search);
const patientId = params.get("patient_id");

const patientBox = document.getElementById("patient");
const visitsBox = document.getElementById("visits");

try {
  const patient = await getPatient(patientId);
  patientBox.textContent = `${patient.first_name} ${patient.last_name} — ${patient.blood_type ?? ""}`;

  const visits = await getPatientVisits(patientId);
  visitsBox.innerHTML = visits.map(v => `
    <article>
      <h3>${escapeHtml(new Date(v.visit_date).toLocaleString())} — ${escapeHtml(v.reason_for_visit)}</h3>
      <p>Practitioner: ${escapeHtml(v.practitioner_name ?? "—")}</p>

      <h4>Diagnoses</h4>
      <ul>${(v.diagnoses ?? []).map(d => `<li>${escapeHtml(d.diagnosis)} — ${escapeHtml(d.notes ?? "")}</li>`).join("") || "<li>None</li>"}</ul>

      <h4>Prescriptions</h4>
      <ul>${(v.prescriptions ?? []).map(p => `<li>${escapeHtml(p.medication_name)} ${escapeHtml(p.dosage ?? "")} (${escapeHtml(p.frequency ?? "")})</li>`).join("") || "<li>None</li>"}</ul>

      <h4>Treatments</h4>
      <ul>${(v.treatments ?? []).map(t => `<li>${escapeHtml(t.treatment)} — ${escapeHtml(t.notes ?? "")}</li>`).join("") || "<li>None</li>"}</ul>
    </article>
  `).join("");
} catch (err) {
  patientBox.textContent = `Error: ${err.message}`;
}
