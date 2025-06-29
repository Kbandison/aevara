// types/supabase.ts
export type GeneratedImage = {
  id: string;
  user_id: string | null;
  prompt: string;
  style_preset?: string | null;
  image_url: string;
  session_token?: string | null;
  created_at?: string;
};
