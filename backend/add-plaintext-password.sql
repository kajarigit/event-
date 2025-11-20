// Simple SQL script to add plainTextPassword column
-- Add the new plainTextPassword column to stalls table
ALTER TABLE stalls ADD COLUMN IF NOT EXISTS "plainTextPassword" VARCHAR(255);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stalls' AND column_name = 'plainTextPassword';

-- Show current stalls count
SELECT COUNT(*) as stall_count FROM stalls;