import { supabase } from "../config/supabase.js";
import { escapeHtml } from "../utils/html-utils.js";

export async function getEmergencyByToken(token) {
  // Calls a SECURITY DEFINER RPC rather than querying `patients` directly --
  // this page is unauthenticated (anon role), and RLS on `patients` only
  // grants access to authenticated users. See rls-policies.sql section 10.
  const { data, error } = await supabase
    .rpc("get_emergency_patient_by_token", { p_qr_token: token });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No patient found for that QR token.");
  return data[0];
}

function vitalTile(label, value, critical = false) {
  const hasValue = value != null && value !== "";
  return `
    <div class="vital-tile${critical && hasValue ? " critical" : ""}">
      <span class="vital-label">${escapeHtml(label)}</span>
      <span class="vital-value">${escapeHtml(hasValue ? value : "Not recorded")}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("load-emergency-btn");
  const tokenInput = document.getElementById("qr-token");
  const dataSection = document.getElementById("emergency-data");
  const fullAccessSection = document.getElementById("full-access-section");
  const fullRecordBtn = document.getElementById("full-record-btn");

  if (!loadBtn || !tokenInput || !dataSection) return;

  loadBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    dataSection.innerHTML = "";
    if (fullAccessSection) fullAccessSection.style.display = "none";

    if (!token) {
      dataSection.innerHTML = `<p class="note" style="text-align:center;">Please enter the code from the patient's card first.</p>`;
      return;
    }

    const loadBtnLabel = loadBtn.textContent;
    loadBtn.disabled = true;
    loadBtn.textContent = "Looking up…";
    dataSection.innerHTML = `<p class="note" style="text-align:center;">Looking up emergency information…</p>`;

    try {
      const patient = await getEmergencyByToken(token);

      dataSection.innerHTML = `
        <section class="card emergency-result">
          <h2>
            ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}
            ${patient.date_of_birth ? `<span class="vital-dob">DOB: ${escapeHtml(patient.date_of_birth)}</span>` : ""}
          </h2>
          <div class="vital-grid">
            ${vitalTile("Blood Type", patient.blood_type)}
            ${vitalTile("Allergies", patient.allergies, true)}
            ${vitalTile("Chronic Conditions", patient.chronic_conditions)}
            ${vitalTile("Emergency Notes", patient.emergency_notes, true)}
          </div>
        </section>
      `;

      if (fullAccessSection && fullRecordBtn) {
        fullAccessSection.style.display = "block";
        fullRecordBtn.onclick = () => {
          window.location.href = `patient-info.html?patient_id=${encodeURIComponent(patient.patient_id)}`;
        };
      }
    } catch (err) {
      // Calm, dedicated failure page rather than an inline raw error --
      // see docs/src/pages/invalid-token.html.
      window.location.href = "invalid-token.html";
      return;
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = loadBtnLabel;
    }
  });
});
