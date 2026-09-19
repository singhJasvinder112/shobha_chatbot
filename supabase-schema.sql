-- Chat persistence tables for the Alpha Heights Site Assistant.
-- Uses the same Supabase project as shobha_poc; table names are prefixed
-- with chat_ so they don't collide with shobha_poc's own tables.

create table if not exists chat_sessions (
  id text primary key,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id text primary key,
  session_id text not null references chat_sessions(id) on delete cascade,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now(),
  -- Monotonic insert order, used instead of created_at for sorting: messages
  -- saved in the same upsert batch can share an identical now() timestamp
  -- within one Postgres transaction, which makes created_at unreliable for
  -- ordering a conversation.
  seq bigserial
);

create index if not exists chat_messages_session_seq_idx
  on chat_messages (session_id, seq);
