
-- App config table (single row)
CREATE TABLE public.app_config (
  id INT PRIMARY KEY DEFAULT 1,
  start_date DATE NOT NULL DEFAULT '2026-02-24',
  end_date DATE NOT NULL DEFAULT '2026-12-31',
  timezone TEXT NOT NULL DEFAULT 'America/Halifax',
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  dashboard_slug TEXT UNIQUE,
  CHECK (id = 1)
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read app_config
CREATE POLICY "Anyone can read app_config"
  ON public.app_config FOR SELECT
  USING (true);

-- Anyone can update app_config (no auth, secret-URL based app)
CREATE POLICY "Anyone can update app_config"
  ON public.app_config FOR UPDATE
  USING (true);

-- Participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  charity_name TEXT NOT NULL,
  secret_slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants"
  ON public.participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update participants"
  ON public.participants FOR UPDATE
  USING (true);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SUGAR', 'FREE_DAY')),
  ts_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_local DATE NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update events"
  ON public.events FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete events"
  ON public.events FOR DELETE
  USING (true);

-- Partial unique index: only one active FREE_DAY per participant per date
CREATE UNIQUE INDEX idx_unique_free_day
  ON public.events (participant_id, date_local)
  WHERE type = 'FREE_DAY' AND deleted_at IS NULL;

-- Index for efficient querying
CREATE INDEX idx_events_participant ON public.events (participant_id, date_local);
CREATE INDEX idx_events_type ON public.events (participant_id, type) WHERE deleted_at IS NULL;

-- Seed app_config
INSERT INTO public.app_config (id, start_date, end_date, timezone, setup_complete, dashboard_slug)
VALUES (1, '2026-02-24', '2026-12-31', 'America/Halifax', FALSE, NULL);

-- Seed participants with placeholder slugs (will be generated on setup)
INSERT INTO public.participants (display_name, charity_name, secret_slug)
VALUES
  ('Kelsey', 'LungNsPei', 'placeholder-kelsey-' || substr(gen_random_uuid()::text, 1, 8)),
  ('Sharon', 'SPCA', 'placeholder-sharon-' || substr(gen_random_uuid()::text, 1, 8));
