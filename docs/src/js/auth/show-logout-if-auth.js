import { supabase } from "../config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;

  const { data } = await supabase.auth.getSession();
  btn.style.display = data?.session ? "inline-block" : "none";
});
