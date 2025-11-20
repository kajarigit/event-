-- SQL Migration for Volunteer System
-- Run these commands manually in your PostgreSQL database if migrate-volunteer-system.js fails

-- Add volunteerId column to users table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='volunteerId') THEN
    ALTER TABLE users ADD COLUMN "volunteerId" VARCHAR(255);
    ALTER TABLE users ADD CONSTRAINT users_volunteerId_comment CHECK (true);
    COMMENT ON COLUMN users."volunteerId" IS 'Unique volunteer identifier for volunteer login';
    
    RAISE NOTICE 'Added volunteerId column to users table';
  ELSE
    RAISE NOTICE 'volunteerId column already exists';
  END IF;
END $$;

-- Update any existing volunteers to have volunteer IDs if they don't have them
DO $$
DECLARE
  volunteer_record RECORD;
  new_volunteer_id VARCHAR(255);
BEGIN
  FOR volunteer_record IN 
    SELECT id, name FROM users 
    WHERE role = 'volunteer' AND "volunteerId" IS NULL
  LOOP
    -- Generate volunteer ID: VOL + timestamp + random number
    new_volunteer_id := 'VOL' || RIGHT(EXTRACT(epoch FROM NOW())::TEXT, 6) || LPAD((RANDOM() * 99)::INTEGER::TEXT, 2, '0');
    
    UPDATE users 
    SET "volunteerId" = new_volunteer_id 
    WHERE id = volunteer_record.id;
    
    RAISE NOTICE 'Assigned volunteer ID % to %', new_volunteer_id, volunteer_record.name;
  END LOOP;
END $$;

-- Create index on volunteerId for better performance
CREATE INDEX IF NOT EXISTS idx_users_volunteer_id ON users("volunteerId") WHERE "volunteerId" IS NOT NULL;

-- Create index on regNo for better student login performance  
CREATE INDEX IF NOT EXISTS idx_users_reg_no ON users("regNo") WHERE "regNo" IS NOT NULL;

-- Verify the migration
SELECT 
  'Migration Summary:' as status,
  (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM users WHERE role = 'volunteer') as total_volunteers,
  (SELECT COUNT(*) FROM users WHERE role = 'volunteer' AND "volunteerId" IS NOT NULL) as volunteers_with_id,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM users WHERE role = 'stall_owner') as total_stall_owners;

-- Show sample volunteer IDs created
SELECT 
  name,
  "volunteerId",
  role,
  "createdAt"
FROM users 
WHERE role = 'volunteer' 
ORDER BY "createdAt" DESC 
LIMIT 5;