// src/js/config/supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://taicbbbjqgxrrtguirpx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaWNiYmJqcWd4cnJ0Z3VpcnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTc2NDAsImV4cCI6MjA4NDEzMzY0MH0.XBBVoX5D7vIbI7bvZnV9I1fbqjKpgsqSYWY-uIOo6SQ";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
