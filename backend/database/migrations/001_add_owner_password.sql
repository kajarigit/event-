-- Migration: Add ownerPassword column to stalls table
-- Date: 2025-11-18
-- Description: Adds ownerPassword field for stall owner dashboard authentication

-- Add ownerPassword column
ALTER TABLE stalls 
ADD COLUMN IF NOT EXISTS "ownerPassword" VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN stalls."ownerPassword" IS 'Password for stall owner dashboard access (auto-generated on stall creation)';
