-- Fix Attendance Table - Remove Unique Constraint
-- This allows students to check-in/check-out multiple times for the same event

-- Drop the unique constraint on (eventId, studentId)
ALTER TABLE "attendances" 
DROP CONSTRAINT IF EXISTS "attendances_eventId_studentId_key";

-- Drop the unique index if it exists
DROP INDEX IF EXISTS "attendances_event_id_student_id";

-- Create new non-unique indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_attendances_event_student_time" 
ON "attendances" ("eventId", "studentId", "checkInTime" DESC);

CREATE INDEX IF NOT EXISTS "idx_attendances_event_status" 
ON "attendances" ("eventId", "status");

CREATE INDEX IF NOT EXISTS "idx_attendances_student" 
ON "attendances" ("studentId");

-- Verify the change
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'attendances'::regclass
    AND conname LIKE '%eventId%';

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'attendances';

COMMIT;
