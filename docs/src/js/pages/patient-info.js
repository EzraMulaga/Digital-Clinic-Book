import { requireAuth } from "../access-control.js";
import { getPatient, getPatientVisits } from "../services/clinicService.js";

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
      <h3>${new Date(v.visit_date).toLocaleString()} — ${v.reason_for_visit}</h3>
      <p>Practitioner: ${v.practitioner_name ?? "—"}</p>

      <h4>Diagnoses</h4>
      <ul>${(v.diagnoses ?? []).map(d => `<li>${d.diagnosis} — ${d.notes ?? ""}</li>`).join("") || "<li>None</li>"}</ul>

      <h4>Prescriptions</h4>
      <ul>${(v.prescriptions ?? []).map(p => `<li>${p.medication_name} ${p.dosage ?? ""} (${p.frequency ?? ""})</li>`).join("") || "<li>None</li>"}</ul>

      <h4>Treatments</h4>
      <ul>${(v.treatments ?? []).map(t => `<li>${t.treatment} — ${t.notes ?? ""}</li>`).join("") || "<li>None</li>"}</ul>
    </article>
  `).join("");
} catch (err) {
  patientBox.textContent = `Error: ${err.message}`;
}
