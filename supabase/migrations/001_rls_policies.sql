-- HostelConnect Row Level Security (RLS) Policies
-- Migration: 001_rls_policies.sql
-- Description: Enforces Row-Level Security for multi-tenant and role-based access control.

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_hostel_role(p_hostel_id UUID, p_roles member_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM hostel_members 
    WHERE hostel_id = p_hostel_id 
      AND user_id = auth.uid() 
      AND role = ANY(p_roles)
      AND is_active = true
  ) OR is_super_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_parent_of_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_guardians sg
    JOIN parents p ON p.id = sg.parent_id
    WHERE sg.student_id = p_student_id
      AND p.user_id = auth.uid()
      AND sg.verification_status = 'VERIFIED'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- PROFILES POLICIES
-- =============================================================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid())); -- Role cannot be self-elevated

CREATE POLICY "Super admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_super_admin());

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================
CREATE POLICY "Super admins can manage all organizations"
  ON organizations FOR ALL
  USING (is_super_admin());

CREATE POLICY "Org owners can view their organizations"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid() OR is_super_admin());

CREATE POLICY "Org owners can update their organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- =============================================================================
-- HOSTELS POLICIES
-- =============================================================================
CREATE POLICY "Public/Parents can view active hostels they are connected to"
  ON hostels FOR SELECT
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = hostels.organization_id AND o.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM hostel_members hm WHERE hm.hostel_id = hostels.id AND hm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s
      JOIN student_guardians sg ON sg.student_id = s.id
      JOIN parents p ON p.id = sg.parent_id
      WHERE s.hostel_id = hostels.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners and Hostel Admins can update hostels"
  ON hostels FOR UPDATE
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = hostels.organization_id AND o.owner_id = auth.uid()
    ) OR
    has_hostel_role(hostels.id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

-- =============================================================================
-- HOSTEL MEMBERS POLICIES
-- =============================================================================
CREATE POLICY "Members can view staff in their hostel"
  ON hostel_members FOR SELECT
  USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role])
  );

CREATE POLICY "Hostel admins can manage staff"
  ON hostel_members FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

-- =============================================================================
-- ROOMS POLICIES
-- =============================================================================
CREATE POLICY "View rooms in assigned hostel"
  ON rooms FOR SELECT
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role])
  );

CREATE POLICY "Hostel admins can manage rooms"
  ON rooms FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

-- =============================================================================
-- STUDENTS POLICIES
-- =============================================================================
CREATE POLICY "Staff can view students in their hostel"
  ON students FOR SELECT
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role]) OR
    is_parent_of_student(id) OR
    user_id = auth.uid()
  );

CREATE POLICY "Hostel admins and wardens can manage students"
  ON students FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role])
  );

-- =============================================================================
-- PARENTS POLICIES
-- =============================================================================
CREATE POLICY "Parents can view own record"
  ON parents FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM student_guardians sg
      JOIN students s ON s.id = sg.student_id
      WHERE sg.parent_id = parents.id AND has_hostel_role(s.hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role])
    )
  );

CREATE POLICY "Parents can update own record"
  ON parents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Hostel admins can manage parents"
  ON parents FOR ALL
  USING (is_super_admin() OR auth_user_role() IN ('HOSTEL_ADMIN', 'WARDEN'));

-- =============================================================================
-- STUDENT GUARDIANS POLICIES
-- =============================================================================
CREATE POLICY "View student guardian relationships"
  ON student_guardians FOR SELECT
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM parents p WHERE p.id = student_guardians.parent_id AND p.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_guardians.student_id AND has_hostel_role(s.hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role])
    )
  );

CREATE POLICY "Hostel admins manage guardian links"
  ON student_guardians FOR ALL
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_guardians.student_id AND has_hostel_role(s.hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role])
    )
  );

-- =============================================================================
-- DEVICES & ACTIVATION POLICIES
-- =============================================================================
CREATE POLICY "Staff can view devices"
  ON devices FOR SELECT
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role])
  );

CREATE POLICY "Admins manage devices"
  ON devices FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

CREATE POLICY "Admins manage activation codes"
  ON device_activation_codes FOR ALL
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM devices d WHERE d.id = device_activation_codes.device_id AND has_hostel_role(d.hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
    )
  );

-- =============================================================================
-- CALL SESSIONS POLICIES
-- =============================================================================
CREATE POLICY "View permitted call sessions"
  ON call_sessions FOR SELECT
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role]) OR
    EXISTS (
      SELECT 1 FROM parents p WHERE p.id = call_sessions.parent_id AND p.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = call_sessions.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Create call sessions (Parents and Staff)"
  ON call_sessions FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role]) OR
    (
      EXISTS (
        SELECT 1 FROM parents p WHERE p.id = call_sessions.parent_id AND p.user_id = auth.uid()
      ) AND is_parent_of_student(call_sessions.student_id)
    )
  );

CREATE POLICY "Update call sessions"
  ON call_sessions FOR UPDATE
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role, 'STAFF'::member_role, 'DEVICE_OPERATOR'::member_role]) OR
    EXISTS (
      SELECT 1 FROM parents p WHERE p.id = call_sessions.parent_id AND p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- CALL SLOTS & BLOCKED DATES
-- =============================================================================
CREATE POLICY "View call slots"
  ON call_slots FOR SELECT
  USING (true); -- Allowed for all authenticated users to see scheduling options

CREATE POLICY "Manage call slots"
  ON call_slots FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

CREATE POLICY "View blocked dates"
  ON blocked_dates FOR SELECT
  USING (true);

CREATE POLICY "Manage blocked dates"
  ON blocked_dates FOR ALL
  USING (
    is_super_admin() OR
    has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role])
  );

-- =============================================================================
-- PLANS, SUBSCRIPTIONS & PAYMENTS
-- =============================================================================
CREATE POLICY "Public/Users view active plans"
  ON plans FOR SELECT
  USING (is_active = true OR is_super_admin());

CREATE POLICY "Super admins manage plans"
  ON plans FOR ALL
  USING (is_super_admin());

CREATE POLICY "Org owners view subscriptions"
  ON subscriptions FOR SELECT
  USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = subscriptions.organization_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Org owners view payments"
  ON payments FOR SELECT
  USING (
    is_super_admin() OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = payments.organization_id AND o.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- NOTIFICATIONS POLICIES
-- =============================================================================
CREATE POLICY "Users view and manage own notifications"
  ON notifications FOR ALL
  USING (user_id = auth.uid() OR is_super_admin());

-- =============================================================================
-- AUDIT LOGS & SECURITY POLICIES
-- =============================================================================
CREATE POLICY "Admins view audit logs"
  ON audit_logs FOR SELECT
  USING (
    is_super_admin() OR
    (hostel_id IS NOT NULL AND has_hostel_role(hostel_id, ARRAY['HOSTEL_ADMIN'::member_role]))
  );

CREATE POLICY "Super admins view security events"
  ON security_events FOR SELECT
  USING (is_super_admin());

-- =============================================================================
-- SETTINGS POLICIES
-- =============================================================================
CREATE POLICY "Settings access"
  ON settings FOR SELECT
  USING (
    is_super_admin() OR
    scope = 'platform' OR
    (scope = 'hostel' AND has_hostel_role(scope_id, ARRAY['HOSTEL_ADMIN'::member_role, 'WARDEN'::member_role]))
  );

CREATE POLICY "Settings management"
  ON settings FOR ALL
  USING (
    is_super_admin() OR
    (scope = 'hostel' AND has_hostel_role(scope_id, ARRAY['HOSTEL_ADMIN'::member_role]))
  );
