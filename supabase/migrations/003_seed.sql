-- HostelConnect Development Seed Data
-- Migration: 003_seed.sql
-- Description: Standard plans, default configuration, and development demo data.

-- =============================================================================
-- SUBSCRIPTION PLANS
-- =============================================================================
INSERT INTO public.plans (id, name, slug, description, price_monthly, price_yearly, currency, max_students, max_staff, max_devices, max_monthly_call_minutes, max_hostels, max_storage_mb, features, is_active, sort_order)
VALUES 
(
  'a0000000-0000-0000-0000-000000000001',
  'Starter',
  'starter',
  'Ideal for small residential schools and single-hostel institutions.',
  249900, -- ₹2,499 in paise
  2499000, -- ₹24,990 yearly
  'INR',
  50,
  3,
  2,
  1000,
  1,
  500,
  '[
    "Up to 50 active students",
    "2 shared calling kiosk devices",
    "3 staff/warden accounts",
    "1,000 monthly call minutes",
    "Scheduled & instant calling",
    "Automated email notifications",
    "Basic usage analytics",
    "Standard email support"
  ]'::jsonb,
  true,
  1
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Growth',
  'growth',
  'Designed for growing boarding institutions with multiple dormitories.',
  599900, -- ₹5,999 in paise
  5999000, -- ₹59,990 yearly
  'INR',
  200,
  10,
  6,
  5000,
  3,
  2000,
  '[
    "Up to 200 active students",
    "6 shared calling kiosk devices",
    "10 staff/warden accounts",
    "5,000 monthly call minutes",
    "Up to 3 hostel buildings",
    "Kiosk locked mode with PIN/Code",
    "Advanced scheduling & quota control",
    "Full audit logs & security tracking",
    "Priority support"
  ]'::jsonb,
  true,
  2
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Enterprise',
  'enterprise',
  'For premier multi-campus boarding schools and large student living chains.',
  1499900, -- ₹14,999 in paise
  14999000, -- ₹149,990 yearly
  'INR',
  1000,
  50,
  25,
  25000,
  10,
  10000,
  '[
    "Up to 1,000+ active students",
    "25 shared kiosk devices",
    "50 staff/warden accounts",
    "25,000 monthly call minutes",
    "Unlimited hostel buildings",
    "Custom Jitsi domain integration",
    "Custom SLA & dedicated account manager",
    "API access & webhooks",
    "24/7 emergency phone support"
  ]'::jsonb,
  true,
  3
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_students = EXCLUDED.max_students,
  max_devices = EXCLUDED.max_devices,
  max_monthly_call_minutes = EXCLUDED.max_monthly_call_minutes;

-- =============================================================================
-- DEFAULT PLATFORM SETTINGS
-- =============================================================================
INSERT INTO public.settings (scope, scope_id, key, value, description)
VALUES
(
  'platform',
  NULL,
  'general',
  '{
    "app_name": "HostelConnect",
    "support_email": "support@hostelconnect.app",
    "allow_public_signup": true,
    "require_parent_verification": true,
    "default_call_duration_minutes": 15,
    "max_call_duration_minutes": 30,
    "allowed_calling_window": {"start": "08:00", "end": "21:00"}
  }'::jsonb,
  'General platform wide defaults'
),
(
  'platform',
  NULL,
  'video_provider',
  '{
    "provider": "jitsi",
    "domain": "meet.jit.si",
    "require_auth": false
  }'::jsonb,
  'Video conferencing server settings'
)
ON CONFLICT (scope, scope_id, key) DO NOTHING;
