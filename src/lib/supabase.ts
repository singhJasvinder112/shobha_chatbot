import { createClient } from '@supabase/supabase-js';

type ChatSessionRow = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  session_id: string;
  role: string;
  parts: unknown;
  created_at: string;
  seq: number;
};

export type Database = {
  public: {
    Tables: {
      chat_sessions: {
        Row: ChatSessionRow;
        Insert: Partial<ChatSessionRow> & Pick<ChatSessionRow, 'id'>;
        Update: Partial<ChatSessionRow>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Omit<ChatMessageRow, 'created_at' | 'seq'> & Partial<Pick<ChatMessageRow, 'created_at' | 'seq'>>;
        Update: Partial<ChatMessageRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    client = createClient<Database>(url, key, { auth: { persistSession: false } });
  }

  return client;
}
