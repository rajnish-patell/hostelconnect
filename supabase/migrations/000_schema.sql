-- HostelConnect Database Schema
-- Migration: 000_schema.sql
-- Description: Complete database schema for the HostelConnect platform

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CUSTOM TYPES / ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'HOSTEL_ADMIN',
  'WARDEN',
  'STAFF',
  'PARENT',
  'STUDENT',
  'DEVICE_OPERATOR'
);

CREATE TYPE call_status AS ENUM (
  'REQUESTED',
  'SCHEDULED',
  'APPROVED',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'MISSED',
  'FAILED'
);

CREATE TYPE device_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
  'DEACTIVATED'
);

CREATE TYPE subscription_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'TRIAL',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE payment_status AS ENUM (
  'CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PENDING'
);

CREATE TYPE notification_type AS ENUM (
  'CALL_REMINDER',
  'CALL_STARTED',
  'CALL_ENDED',
  'CALL_CANCELLED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_EXPIRING',
  'DEVICE_ALERT',
  'SECURITY_ALERT',
  'GENERAL'
);

CREATE TYPE guardian_relationship AS ENUM (
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'OTHER'
);

CREATE TYPE verification_status AS ENUM (
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

CREATE TYPE hostel_status AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE'
);

CREATE TYPE member_role AS ENUM (
  'HOSTEL_ADMIN',
  'WARDEN',
  'STAFF',
  'DEVICE_OPERATOR'
);

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'PARENT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- =============================================================================
-- ORGANIZATIONS (Top-level tenant)
-- =============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- =============================================================================
-- HOSTELS
-- =============================================================================
CREATE TABLE hostels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  address JSONB DEFAULT '{}',
  phone TEXT,
  email TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status hostel_status NOT NULL DEFAULT 'ACTIVE',
  max_call_duration_minutes INTEGER NOT NULL DEFAULT 15,
  max_calls_per_student_per_day INTEGER NOT NULL DEFAULT 2,
  max_calls_per_parent_per_day INTEGER NOT NULL DEFAULT 3,
  allowed_call_start_time TIME NOT NULL DEFAULT '08:00:00',
  allowed_call_end_time TIME NOT NULL DEFAULT '21:00:00',
  allowed_call_days INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  emergency_calls_enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_hostels_org ON hostels(organization_id);
CREATE INDEX idx_hostels_status ON hostels(status);

-- =============================================================================
-- HOSTEL MEMBERS (Staff assignments)
-- =============================================================================
CREATE TABLE hostel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, user_id)
);

CREATE INDEX idx_hostel_members_hostel ON hostel_members(hostel_id);
CREATE INDEX idx_hostel_members_user ON hostel_members(user_id);

-- =============================================================================
-- ROOMS
-- =============================================================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor TEXT,
  capacity INTEGER DEFAULT 4,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, name)
);

CREATE INDEX idx_rooms_hostel ON rooms(hostel_id);

-- =============================================================================
-- STUDENTS
-- =============================================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  date_of_birth DATE,
  admission_number TEXT,
  class_grade TEXT,
  section TEXT,
  photo_url TEXT,
  emergency_contact TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, admission_number)
);

CREATE INDEX idx_students_hostel ON students(hostel_id);
CREATE INDEX idx_students_room ON students(room_id);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_active ON students(is_active) WHERE is_active = true;

-- =============================================================================
-- PARENTS
-- =============================================================================
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  alternate_phone TEXT,
  address JSONB DEFAULT '{}',
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parents_user ON parents(user_id);
CREATE INDEX idx_parents_email ON parents(email);

-- =============================================================================
-- STUDENT-GUARDIAN RELATIONSHIPS
-- =============================================================================
CREATE TABLE student_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  relationship guardian_relationship NOT NULL DEFAULT 'GUARDIAN',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  can_video_call BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

CREATE INDEX idx_student_guardians_student ON student_guardians(student_id);
CREATE INDEX idx_student_guardians_parent ON student_guardians(parent_id);
CREATE INDEX idx_student_guardians_verified ON student_guardians(verification_status);

-- =============================================================================
-- DEVICES
-- =============================================================================
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  device_type TEXT DEFAULT 'tablet',
  status device_status NOT NULL DEFAULT 'INACTIVE',
  last_seen_at TIMESTAMPTZ,
  last_ip TEXT,
  user_agent TEXT,
  activation_token TEXT,
  activated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_hostel ON devices(hostel_id);
CREATE INDEX idx_devices_status ON devices(status);

-- =============================================================================
-- DEVICE ACTIVATION CODES
-- =============================================================================
CREATE TABLE device_activation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_activation_device ON device_activation_codes(device_id);
CREATE INDEX idx_device_activation_code ON device_activation_codes(code);

-- =============================================================================
-- DEVICE SESSIONS
-- =============================================================================
CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX idx_device_sessions_token ON device_sessions(session_token);
CREATE INDEX idx_device_sessions_active ON device_sessions(is_active) WHERE is_active = true;

-- =============================================================================
-- CALL SLOTS (Schedule Configuration)
-- =============================================================================
CREATE TABLE call_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_concurrent_calls INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX idx_call_slots_hostel ON call_slots(hostel_id);
CREATE INDEX idx_call_slots_day ON call_slots(day_of_week);

-- =============================================================================
-- BLOCKED DATES (Holidays)
-- =============================================================================
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, blocked_date)
);

-- =============================================================================
-- CALL SESSIONS
-- =============================================================================
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  meeting_id TEXT UNIQUE NOT NULL,
  status call_status NOT NULL DEFAULT 'REQUESTED',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  max_duration_minutes INTEGER NOT NULL DEFAULT 15,
  initiated_by UUID REFERENCES profiles(id),
  ended_by UUID REFERENCES profiles(id),
  end_reason TEXT,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_sessions_hostel ON call_sessions(hostel_id);
CREATE INDEX idx_call_sessions_student ON call_sessions(student_id);
CREATE INDEX idx_call_sessions_parent ON call_sessions(parent_id);
CREATE INDEX idx_call_sessions_device ON call_sessions(device_id);
CREATE INDEX idx_call_sessions_status ON call_sessions(status);
CREATE INDEX idx_call_sessions_meeting ON call_sessions(meeting_id);
CREATE INDEX idx_call_sessions_scheduled ON call_sessions(scheduled_at);
CREATE INDEX idx_call_sessions_created ON call_sessions(created_at);

-- =============================================================================
-- CALL PARTICIPANTS
-- =============================================================================
CREATE TABLE call_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  participant_type TEXT NOT NULL CHECK (participant_type IN ('student', 'parent', 'staff')),
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_participants_session ON call_participants(call_session_id);
CREATE INDEX idx_call_participants_user ON call_participants(user_id);

-- =============================================================================
-- PLANS (Subscription Plans)
-- =============================================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  max_students INTEGER NOT NULL DEFAULT 50,
  max_staff INTEGER NOT NULL DEFAULT 5,
  max_devices INTEGER NOT NULL DEFAULT 3,
  max_monthly_call_minutes INTEGER NOT NULL DEFAULT 500,
  max_hostels INTEGER NOT NULL DEFAULT 1,
  max_storage_mb INTEGER NOT NULL DEFAULT 100,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'TRIAL',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'CREATED',
  description TEXT,
  receipt TEXT,
  refund_amount INTEGER,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- =============================================================================
-- PAYMENT EVENTS (Webhook idempotency)
-- =============================================================================
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_event_id ON payment_events(event_id);
CREATE INDEX idx_payment_events_processed ON payment_events(processed);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'GENERAL',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_hostel ON audit_logs(hostel_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =============================================================================
-- SECURITY EVENTS
-- =============================================================================
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created ON security_events(created_at);

-- =============================================================================
-- SETTINGS (Key-Value configuration)
-- =============================================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform', 'organization', 'hostel')),
  scope_id UUID,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, scope_id, key)
);

CREATE INDEX idx_settings_scope ON settings(scope, scope_id);
CREATE INDEX idx_settings_key ON settings(key);
