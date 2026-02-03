/**
 * NOTE:
 * This file currently contains placeholder / partial logic.
 * Access rules and data handling are under active development.
 */

// Initialize Supabase client
import { supabase } from "./config/supabase.js";
let emergencyPatientId = null;

// Load emergency data on button click
document.addEventListener("DOMContentLoaded", () => {
  const tokenInput = document.getElementById("qr-token");
  const loadBtn = document.getElementById("load-emergency-btn");
  const emergencyData = document.getElementById("emergency-data");
  const fullAccessSection = document.getElementById("full-access-section");
  const fullRecordBtn = document.getElementById("full-record-btn");

  // Safety check (classic defensive programming)
  if (
    !tokenInput ||
    !loadBtn ||
    !emergencyData ||
    !fullAccessSection ||
    !fullRecordBtn
  ) {
    console.error("Emergency QR page: missing required DOM elements.");
    return;
  }

  fullAccessSection.style.display = "none";

  // Load emergency data
  loadBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();

    if (!token) {
      alert("Please enter a QR token.");
      return;
    }

    emergencyPatientId = null;
    fullAccessSection.style.display = "none";
    emergencyData.innerHTML = "<p>Loading emergency data…</p>";

    const { data: patient, error } = await supabase
      .from("patients")
      .select(
        `
        patient_id,
        first_name,
        last_name,
        blood_type,
        allergies,
        chronic_conditions,
        emergency_notes
        `
      )
      .eq("qr_token", token)
      .single();

    if (error || !patient) {
      console.warn("No emergency record found:", error);
      emergencyData.innerHTML =
        "<p>No emergency data found for this QR token.</p>";
      return;
    }

    emergencyPatientId = patient.patient_id;

    emergencyData.innerHTML = `
      <h2>Emergency Data</h2>
      <p><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
      <p><strong>Blood Type:</strong> ${patient.blood_type ?? "N/A"}</p>
      <p><strong>Allergies:</strong> ${patient.allergies ?? "None recorded"}</p>
      <p><strong>Chronic Conditions:</strong> ${
        patient.chronic_conditions ?? "None recorded"
      }</p>
      <p><strong>Emergency Notes:</strong> ${
        patient.emergency_notes ?? "None"
      }</p>
    `;

    fullAccessSection.style.display = "block";
  });

  // View full medical history (requires login)
  fullRecordBtn.addEventListener("click", async () => {
    if (!emergencyPatientId) {
      alert("Load emergency data first.");
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Session check failed:", error);
    }

    if (!data?.session) {
      // Not logged in → practitioner login
      window.location.href = "practitioner-login.html";
      return;
    }

    // Logged in → full patient view
    window.location.href =
      `practitioner-patient-view.html?patient_id=` +
      encodeURIComponent(emergencyPatientId);
  });
});
