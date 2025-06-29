// lib/supabaseServerClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // For secure backend ops only

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
