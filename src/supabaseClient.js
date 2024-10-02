import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kkhczwhpupiunjdwxkjt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraGN6d2hwdXBpdW5qZHd4a2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0NzczNTgsImV4cCI6MjA0MjA1MzM1OH0.fUWBcOx91AKkVTO22nb_eTDhtH7HzQ1l8ydiCFFM5bc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
