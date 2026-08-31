-- Migration: 005_platform_enhancements.sql
-- Description: Adds pricing, recharge wallet, call time settings, and auto-parent linking

-- 1. Add Call Rate & Unlimited Settings to Hostels
ALTER TABLE hostels 
ADD COLUMN IF NOT EXISTS call_rate_per_minute INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS unlimited_calls_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Add Wallet Balance & Calling Controls to Students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS balance_paise INTEGER NOT NULL DEFAULT 5000, -- ₹50 initial wallet
ADD COLUMN IF NOT EXISTS unlimited_calls BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS max_call_duration_minutes INTEGER NOT NULL DEFAULT 15;

-- 3. Add Recharge Transactions Table
CREATE TABLE IF NOT EXISTS student_recharges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  recharged_by_user_id UUID REFERENCES profiles(id),
  recharge_type TEXT NOT NULL CHECK (recharge_type IN ('PARENT_ONLINE', 'SCHOOL_MANUAL', 'ADMIN_CREDIT')),
  amount_paise INTEGER NOT NULL,
  payment_id UUID REFERENCES payments(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_recharges_student ON student_recharges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_recharges_hostel ON student_recharges(hostel_id);

-- 4. Enable RLS on student_recharges
ALTER TABLE student_recharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all recharges"
ON student_recharges FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN'
  )
);

CREATE POLICY "Hostel admins can view recharges for their hostel"
ON student_recharges FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hostel_members
    WHERE hostel_members.hostel_id = student_recharges.hostel_id
    AND hostel_members.user_id = auth.uid()
    AND hostel_members.is_active = true
  )
);

CREATE POLICY "Parents can view recharges for their students"
ON student_recharges FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_guardians sg
    JOIN parents p ON p.id = sg.parent_id
    WHERE sg.student_id = student_recharges.student_id
    AND p.user_id = auth.uid()
  )
);
