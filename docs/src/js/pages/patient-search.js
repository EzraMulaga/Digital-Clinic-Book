import { requireAuth } from "../access-control.js";
import { searchPatients } from "../services/clinicService.js";

await requireAuth();

const form = document.getElementById("search-form");
const input = document.getElementById("q");
const results = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  results.innerHTML = "Searching...";

  try {
    const rows = await searchPatients(input.value.trim());
    results.innerHTML = rows.map(p => `
      <li>
        <a href="patient-info.html?patient_id=${p.patient_id}">
          ${p.last_name}, ${p.first_name} (${p.date_of_birth ?? "DOB?"})
        </a>
      </li>
    `).join("") || "<li>No matches</li>";
  } catch (err) {
    results.innerHTML = `<li>Error: ${err.message}</li>`;
  }
});
