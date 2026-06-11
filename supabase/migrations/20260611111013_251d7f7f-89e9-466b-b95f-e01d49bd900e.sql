
-- Add avatar to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Vault files (the "Viewer" Obsidian replacement)
CREATE TABLE public.vault_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_folder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_files TO authenticated;
GRANT ALL ON public.vault_files TO service_role;

ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own vault" ON public.vault_files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vault" ON public.vault_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vault" ON public.vault_files FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vault" ON public.vault_files FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER vault_files_touch BEFORE UPDATE ON public.vault_files FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Google OAuth per-user connections
CREATE TABLE public.google_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  drive_folder_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only service_role can touch (contains tokens); user reads connection status via RPC
GRANT ALL ON public.google_connections TO service_role;

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

-- Allow user to know if they are connected (read only non-secret presence)
CREATE POLICY "Users read own google connection" ON public.google_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER google_connections_touch BEFORE UPDATE ON public.google_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
