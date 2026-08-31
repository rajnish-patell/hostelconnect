-- HostelConnect Database Functions & Triggers (Resilient & Fail-Safe)
-- Migration: 002_functions_triggers.sql

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
      AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_update_timestamp_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();', t, t);
  END LOOP;
END;
$$;

-- =============================================================================
-- TRIGGER: Handle New User Registration in Supabase Auth (Fail-Safe)
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'PARENT';
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  -- Extract role safely
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'PARENT';
    END;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_phone := NEW.raw_user_meta_data->>'phone';

  -- Upsert profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    is_active,
    email_verified,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_phone,
    v_role,
    true,
    (NEW.email_confirmed_at IS NOT NULL),
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    updated_at = now();

  -- If role is PARENT, check and insert parent if not exists
  IF v_role = 'PARENT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.parents WHERE user_id = NEW.id) THEN
      INSERT INTO public.parents (
        user_id,
        first_name,
        last_name,
        email,
        phone
      ) VALUES (
        NEW.id,
        SPLIT_PART(v_full_name, ' ', 1),
        SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1),
        NEW.email,
        v_phone
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth.users insertion on profile error
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================================================
-- FUNCTION: Calculate Call Duration on Call Completion
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_call_duration ON call_sessions;
CREATE TRIGGER trg_calc_call_duration
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED')
  EXECUTE PROCEDURE calculate_call_duration();

-- =============================================================================
-- FUNCTION: Audit Log Helper
-- =============================================================================
CREATE OR REPLACE FUNCTION create_audit_log(
  p_actor_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_hostel_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    description,
    metadata,
    hostel_id,
    organization_id,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_metadata,
    p_hostel_id,
    p_org_id,
    p_ip,
    p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
