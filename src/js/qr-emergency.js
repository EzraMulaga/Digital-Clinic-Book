// Initialize Supabase client
const supabaseUrl = "https://YOUR_PROJECT_ID.supabase.co";
const supabaseKey = "YOUR_PUBLIC_ANON_KEY";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let emergencyPatientId = null;

// Load emergency data on button click
document.getElementById('load-emergency-btn').addEventListener('click', async () => {
  const token = document.getElementById('qr-token').value.trim();
  if (!token) return alert('Please enter a QR token.');

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('qr_token', token)
    .single();

  const display = document.getElementById('emergency-data');

  if (error || !patient) {
    display.innerHTML = "<p>No emergency data found for this QR code.</p>";
    document.getElementById('full-access-section').style.display = 'none';
    return;
  }

  emergencyPatientId = patient.patient_id;

  display.innerHTML = `
    <h2>Emergency Data</h2>
    <p><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
    <p><strong>Blood Type:</strong> ${patient.blood_type}</p>
    <p><strong>Allergies:</strong> ${patient.allergies}</p>
    <p><strong>Chronic Conditions:</strong> ${patient.chronic_conditions}</p>
    <p><strong>Emergency Notes:</strong> ${patient.emergency_notes}</p>
  `;

  document.getElementById('full-access-section').style.display = 'block';
});

// Full medical history button
document.getElementById('full-record-btn').addEventListener('click', async () => {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    // Not logged in → redirect to practitioner login
    window.location.href = 'practitioner-login.html';
  } else {
    // Logged in → redirect to full record page with patient ID
    window.location.href = `practitioner-patient-view.html?patient_id=${emergencyPatientId}`;
  }
});
