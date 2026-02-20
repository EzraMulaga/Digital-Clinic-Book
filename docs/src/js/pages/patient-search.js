import { requireAuth } from "../auth/access-control.js";
import { searchPatients, getPatient } from "../services/clinic-services.js";
import { escapeHtml } from "../utils/html-utils.js";

await requireAuth();

const form = document.getElementById("search-form");
const input = document.getElementById("q");
const results = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  results.innerHTML = "";

  if (!q) {
    results.innerHTML = "<li>Please enter a patient ID or name.</li>";
    return;
  }

  results.innerHTML = "<li>Searching...</li>";

  try {
    // If it looks like a UUID, treat as patient_id lookup
    const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q);

    if (looksUuid) {
      const p = await getPatient(q);
      results.innerHTML = `
        <li>
          <a href="patient-info.html?patient_id=${escapeHtml(p.patient_id)}">
            ${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)} (${escapeHtml(p.date_of_birth ?? "DOB?")})
          </a>
        </li>
      `;
      return;
    }

    // Otherwise do name search
    const rows = await searchPatients(q);

    results.innerHTML = rows.length
      ? rows.map(p => `
          <li>
            <a href="patient-info.html?patient_id=${escapeHtml(p.patient_id)}">
              ${escapeHtml(p.last_name)}, ${escapeHtml(p.first_name)} (${escapeHtml(p.date_of_birth ?? "DOB?")})
            </a>
          </li>
        `).join("")
      : "<li>No matches found.</li>";

  } catch (err) {
    results.innerHTML = `<li>Error: ${escapeHtml(err.message)}</li>`;
  }
});
