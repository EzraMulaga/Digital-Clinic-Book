import { supabase } from "../config/supabase.js";

// Patient
export async function searchPatients(q) {
    // Strip characters that are special in PostgREST filter syntax to prevent
    // filter parsing issues (e.g. commas used as OR separators).
    const sanitized = q.replace(/[,()]/g, "");
    const like = `%${sanitized}%`;
    const {data, error} = await supabase
    .from("patients")
    .select("patient_id, first_name, last_name, date_of_birth, blood_type")
    .or(`first_name.ilike.${like},last_name.ilike.${like}`)
    .order("last_name", {ascending: true})
    .limit(25);
    
    // IF error occur
    if (error) throw error;
    return data;
}


// Get patient by ID
export async function getPatient(patientId) {
    const {data, error} = await supabase
    .from("patients")
    .select("*")
    .eq("patient_id", patientId)
    .single();

    // If error occur
    if (error) throw error;
    return data;
}

// Fetches all patient visits and medical information
export async function getPatientVisits(patientId){
    const {data, error} = await supabase
    .from("visits")
    .select(`
      visit_id, visit_date, reason_for_visit, practitioner_name, created_at,
      diagnoses(diagnosis_id, diagnosis, notes, created_at),
      prescriptions(prescription_id, medication_name, dosage, frequency, duration, instructions, created_at),
      treatments(treatment_id, treatment, notes, created_at)
    `)
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false });

    // If error occurs

    if(error) throw error;
    return data;
}

// Creates visits
export async function createVisit({ patient_id, reason_for_visit, practitioner_name, practitioner_id }) {
  const { data, error } = await supabase
    .from("visits")
    .insert([{ patient_id, reason_for_visit, practitioner_name, practitioner_id }])
    .select("visit_id")
    .single();

  if (error) throw error;
  return data;
}

export async function addDiagnosis({ visit_id, diagnosis, notes }) {
  const { error } = await supabase
    .from("diagnoses")
    .insert([{ visit_id, diagnosis, notes }]);
  if (error) throw error;
}

export async function addPrescription(p) {
  const { error } = await supabase.from("prescriptions").insert([p]);
  if (error) throw error;
}

export async function addTreatment(t) {
  const { error } = await supabase.from("treatments").insert([t]);
  if (error) throw error;
}

// Get a single visit with all related data
export async function getVisit(visitId) {
  const { data, error } = await supabase
    .from("visits")
    .select(`
      visit_id, visit_date, reason_for_visit, practitioner_name, patient_id,
      diagnoses(diagnosis_id, diagnosis, notes),
      prescriptions(prescription_id, medication_name, dosage, frequency, duration, instructions),
      treatments(treatment_id, treatment, notes)
    `)
    .eq("visit_id", visitId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new patient
export async function createPatient(data) {
  const { data: row, error } = await supabase
    .from("patients")
    .insert([data])
    .select("patient_id")
    .single();

  if (error) throw error;
  return row;
}

// Update a patient's emergency/profile fields
export async function updatePatient(patientId, updates) {
  const { error } = await supabase
    .from("patients")
    .update(updates)
    .eq("patient_id", patientId);

  if (error) throw error;
}

// Create a new practitioner
export async function createPractitioner(data) {
  const { data: row, error } = await supabase
    .from("practitioners")
    .insert([data])
    .select("practitioner_id")
    .single();

  if (error) throw error;
  return row;
}

// Get a single practitioner by ID
export async function getPractitioner(practitionerId) {
  const { data, error } = await supabase
    .from("practitioners")
    .select("practitioner_id, first_name, last_name, registration_number, role, is_active")
    .eq("practitioner_id", practitionerId)
    .single();

  if (error) throw error;
  return data;
}

// Update a practitioner's profile fields
export async function updatePractitioner(practitionerId, updates) {
  const { error } = await supabase
    .from("practitioners")
    .update(updates)
    .eq("practitioner_id", practitionerId);

  if (error) throw error;
}

// Update a visit's editable fields
export async function updateVisit(visitId, updates) {
  const { error } = await supabase
    .from("visits")
    .update(updates)
    .eq("visit_id", visitId);

  if (error) throw error;
}

