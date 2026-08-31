-- HostelConnect: Fix Auth Trigger & Permissions
-- Migration: 004_fix_auth_trigger.sql
-- Description: Ensures supabase_auth_admin can seamlessly insert into public.profiles

-- 1. Grant table access to standard roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Drop existing trigger to clean up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create the robust SECURITY DEFINER trigger function with public search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role public.user_role := 'PARENT';
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  -- Safely extract role
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
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

  -- Insert profile
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

  -- If role is PARENT, create initial parent profile if needed
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
  -- Fallback: Do not block user registration if metadata error occurs
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Rebind the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
