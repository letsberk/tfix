-- ============================================================
-- RAILAPP – Supabase Setup
-- Ausführen in: Supabase → SQL Editor → New Query → Run
-- ============================================================


-- ── 1. PROFILES (Benutzerdaten + Rollen) ────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Automatisch Profil anlegen wenn sich ein User registriert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 2. ITEMS (Hauptdaten – CRUD) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'allgemein',
  file_url    TEXT,
  file_name   TEXT,
  file_size   BIGINT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_items_updated_at ON public.items;
CREATE TRIGGER set_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 3. SYNC LOG (für Audit-Trail) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,  -- 'sync', 'upload', 'delete'
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte User sieht sein eigenes Profil
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin sieht alle Profile
CREATE POLICY "admin_read_all_profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin darf Rollen ändern
CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- System darf Profil anlegen (via Trigger)
CREATE POLICY "system_insert_profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── items ────────────────────────────────────────────────────
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User dürfen lesen
CREATE POLICY "authenticated_read_items"
  ON public.items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Nur Admin darf erstellen
CREATE POLICY "admin_insert_items"
  ON public.items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Nur Admin darf bearbeiten
CREATE POLICY "admin_update_items"
  ON public.items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Nur Admin darf löschen
CREATE POLICY "admin_delete_items"
  ON public.items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ── sync_log ─────────────────────────────────────────────────
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_log"
  ON public.sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_log"
  ON public.sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_all_log"
  ON public.sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Bucket anlegen (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'railapp-files',
  'railapp-files',
  false,  -- nicht öffentlich!
  52428800,  -- 50 MB max
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Nur eingeloggte User dürfen Dateien herunterladen
CREATE POLICY "authenticated_read_files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'railapp-files'
    AND auth.role() = 'authenticated'
  );

-- Nur Admin darf hochladen
CREATE POLICY "admin_upload_files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'railapp-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Nur Admin darf löschen
CREATE POLICY "admin_delete_files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'railapp-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- HELPER FUNCTION: Ist aktueller User Admin?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- TESTDATEN (optional, kann gelöscht werden)
-- ============================================================
-- Ersten Admin-User anlegen (nach der Registrierung ausführen):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'deine@email.de';
