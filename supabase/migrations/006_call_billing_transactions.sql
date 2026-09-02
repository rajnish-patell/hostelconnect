-- Migration: 006_call_billing_transactions.sql
-- Description: Adds call billing transaction tracking table and billing status to call_sessions

-- 1. Add billing columns to call_sessions
ALTER TABLE call_sessions 
ADD COLUMN IF NOT EXISTS billing_status TEXT CHECK (billing_status IN ('PENDING', 'CHARGED', 'FREE', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS charge_paise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_balance_paise INTEGER,
ADD COLUMN IF NOT EXISTS new_balance_paise INTEGER;

-- 2. Create call billing transactions table
CREATE TABLE IF NOT EXISTS call_billing_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  rate_per_minute INTEGER NOT NULL DEFAULT 2,
  charge_paise INTEGER NOT NULL,
  previous_balance_paise INTEGER NOT NULL,
  new_balance_paise INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_billing_call ON call_billing_transactions(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_billing_student ON call_billing_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_call_billing_hostel ON call_billing_transactions(hostel_id);
CREATE INDEX IF NOT EXISTS idx_call_billing_status ON call_billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_call_billing_created ON call_billing_transactions(created_at);

-- 3. Enable RLS on call_billing_transactions
ALTER TABLE call_billing_transactions ENABLE ROW LEVEL SECURITY;

-- Super admins can view all transactions
CREATE POLICY "Super admins can view all billing transactions"
ON call_billing_transactions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN'
  )
);

-- Hostel admins can view transactions for their hostel
CREATE POLICY "Hostel admins can view billing transactions for their hostel"
ON call_billing_transactions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hostel_members
    WHERE hostel_members.hostel_id = call_billing_transactions.hostel_id
    AND hostel_members.user_id = auth.uid()
    AND hostel_members.is_active = true
  )
);

-- Students can view their own billing transactions
CREATE POLICY "Students can view their own call billing"
ON call_billing_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = call_billing_transactions.student_id
    AND students.user_id = auth.uid()
  )
);

-- Parents can view billing for their child's calls
CREATE POLICY "Parents can view billing for their student's calls"
ON call_billing_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_guardians sg
    JOIN parents p ON p.id = sg.parent_id
    WHERE sg.student_id = call_billing_transactions.student_id
    AND p.user_id = auth.uid()
  )
);

-- 4. Add billing columns index
CREATE INDEX IF NOT EXISTS idx_call_sessions_billing_status ON call_sessions(billing_status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_charge ON call_sessions(charge_paise);
