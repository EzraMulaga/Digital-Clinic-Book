/**
 * NOTE:
 * This file currently contains placeholder / partial logic.
 * Access rules and data handling are under active development.
 */

import { supabase } from "../config/supabase.js";

export async function requireAuth(redirectTo = ".././pages/user-login.html") {
  const {data: {session}} = await supabase.auth.getSession();
  if (!session){
    window.location.href = redirectTo;
    throw new Error("Not authenticated");
  }
  return session;
}

export async function getUserRole(authUserID) {
  // Check if user is a practitioner
  const {data: prac } = await supabase
  .from("practitioners")
  .select("practitioner_id, role, is_active")
  .eq("auth_user_id", authUserID)
  .maybesingle();
  
  if(prac?.is_active) return {type: "practitioner". ...prac};
  // Check user is a patient
  const {data: pu} = await supabase
  .from("patient_users")
  .select("patient_id, patient_user_id")
  .eq("auth_user_id", authUserID)
  .maybesingle();

  if (pu) return {type: "patient", ...pu};

  // return unkown if match not found.
  return {type: "unkown"};

}

export async function logout() {
  await supabase.auth.signout();
  // Check location for error
  window.location.href = "index.html"
  
}