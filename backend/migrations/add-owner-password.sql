-- Migration: Add ownerPassword column to Stalls table
-- Run this on your Render PostgreSQL database

-- Add the ownerPassword column
ALTER TABLE "Stalls" 
ADD COLUMN IF NOT EXISTS "ownerPassword" VARCHAR(255);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'Stalls' AND column_name = 'ownerPassword';
