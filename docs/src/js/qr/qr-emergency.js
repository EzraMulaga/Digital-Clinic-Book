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

    if (!token) {
      dataSection.innerHTML = "<p class='note'>Please enter a QR token.</p>";
      return;
    }

    dataSection.innerHTML = "<p class='note'>Loading…</p>";

    try {
      const patient = await getEmergencyByToken(token);

      dataSection.innerHTML = `
        <h2>Emergency Patient Information</h2>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</li>
          <li><strong>Date of Birth:</strong> ${escapeHtml(patient.date_of_birth ?? "—")}</li>
          <li><strong>Blood Type:</strong> ${escapeHtml(patient.blood_type ?? "—")}</li>
          <li><strong>Allergies:</strong> ${escapeHtml(patient.allergies ?? "None recorded")}</li>
          <li><strong>Chronic Conditions:</strong> ${escapeHtml(patient.chronic_conditions ?? "None recorded")}</li>
          <li><strong>Emergency Notes:</strong> ${escapeHtml(patient.emergency_notes ?? "None")}</li>
        </ul>
      `;

      if (fullAccessSection && fullRecordBtn) {
        fullAccessSection.style.display = "block";
        fullRecordBtn.onclick = () => {
          window.location.href = `patient-info.html?patient_id=${encodeURIComponent(patient.patient_id)}`;
        };
      }
    } catch (err) {
      dataSection.innerHTML = `<p class='note' style='color:red;'>Error: ${escapeHtml(err.message)}</p>`;
      if (fullAccessSection) fullAccessSection.style.display = "none";
    }
  });
});
