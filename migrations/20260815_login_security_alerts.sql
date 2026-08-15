-- Reliable Now: new-device sign-in security alerts
-- Server-side service role only; no client can read or write these records directly.

CREATE TABLE IF NOT EXISTS public.trusted_login_devices (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  country_code text,
  ip_hash text,
  alert_count integer NOT NULL DEFAULT 0,
  last_alert_sent_at timestamptz,
  PRIMARY KEY (user_id, device_hash)
);

CREATE INDEX IF NOT EXISTS trusted_login_devices_user_id_idx
  ON public.trusted_login_devices(user_id);

CREATE TABLE IF NOT EXISTS public.login_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  is_new_device boolean NOT NULL DEFAULT false,
  alert_attempted boolean NOT NULL DEFAULT false,
  alert_sent boolean NOT NULL DEFAULT false,
  alert_error text,
  user_agent text,
  country_code text,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS login_security_events_user_occurred_idx
  ON public.login_security_events(user_id, occurred_at DESC);

ALTER TABLE public.trusted_login_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct trusted device access" ON public.trusted_login_devices;
CREATE POLICY "No direct trusted device access"
  ON public.trusted_login_devices
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct login security event access" ON public.login_security_events;
CREATE POLICY "No direct login security event access"
  ON public.login_security_events
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.trusted_login_devices IS
  'Hashed trusted-device state for new-device sign-in alerts; raw IPs and device identifiers are never stored.';
COMMENT ON TABLE public.login_security_events IS
  'Append-only sign-in security audit events; service-role access only.';
COMMENT ON COLUMN public.login_security_events.alert_error IS
  'Sanitized provider error category only; never store provider response bodies or secrets.';

GRANT ALL ON public.trusted_login_devices TO service_role;
GRANT ALL ON public.login_security_events TO service_role;
REVOKE ALL ON public.trusted_login_devices FROM anon, authenticated;
REVOKE ALL ON public.login_security_events FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
