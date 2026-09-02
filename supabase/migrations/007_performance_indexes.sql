-- Migration: 007_performance_indexes.sql
-- Description: Adds comprehensive performance indexes from Section 10.1 of the Project Audit Report.

-- 1. Call Performance Indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_student_id ON call_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_parent_id ON call_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status_created ON call_sessions(status, created_at DESC);

-- 2. Student Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_students_hostel_id_active ON students(hostel_id, is_active);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);

-- 3. Guardian Relationship Indexes
CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_parent_id ON student_guardians(parent_id);

-- 4. Audit Logs Compliance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_hostel_action_created ON audit_logs(hostel_id, action, created_at DESC);
