import { supabase } from "./config/supabase.js";

export async function getEmergencyByToken(token) {
  const { data, error } = await supabase
    .from("patients")
    .select("first_name, last_name, date_of_birth, blood_type, allergies, chronic_conditions, emergency_notes")
    .eq("qr_token", token)
    .single();

  if (error) throw error;
  return data;
}
