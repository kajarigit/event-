-- Migration: Add 5-category rating system to feedbacks table
-- Date: 2025-11-20
-- Description: Replace single rating with 5 separate rating categories

-- Add new rating columns
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "qualityRating" INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "innovationRating" INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "presentationRating" INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "valueRating" INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS "averageRating" DECIMAL(3, 2);

-- Add check constraints for new rating columns
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_qualityRating_check" CHECK ("qualityRating" >= 1 AND "qualityRating" <= 5);
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_serviceRating_check" CHECK ("serviceRating" >= 1 AND "serviceRating" <= 5);
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_innovationRating_check" CHECK ("innovationRating" >= 1 AND "innovationRating" <= 5);
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_presentationRating_check" CHECK ("presentationRating" >= 1 AND "presentationRating" <= 5);
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_valueRating_check" CHECK ("valueRating" >= 1 AND "valueRating" <= 5);
ALTER TABLE feedbacks ADD CONSTRAINT "feedbacks_averageRating_check" CHECK ("averageRating" >= 1.00 AND "averageRating" <= 5.00);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_feedbacks_qualityRating" ON feedbacks("qualityRating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_serviceRating" ON feedbacks("serviceRating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_innovationRating" ON feedbacks("innovationRating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_presentationRating" ON feedbacks("presentationRating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_valueRating" ON feedbacks("valueRating");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_averageRating" ON feedbacks("averageRating");

-- For existing data, populate new columns with the old rating value
-- This is a temporary measure to maintain data integrity during migration
UPDATE feedbacks 
SET 
    "qualityRating" = rating,
    "serviceRating" = rating,
    "innovationRating" = rating,
    "presentationRating" = rating,
    "valueRating" = rating,
    "averageRating" = rating::decimal(3,2)
WHERE "qualityRating" IS NULL;

-- Make new columns NOT NULL after populating data
ALTER TABLE feedbacks ALTER COLUMN "qualityRating" SET NOT NULL;
ALTER TABLE feedbacks ALTER COLUMN "serviceRating" SET NOT NULL;
ALTER TABLE feedbacks ALTER COLUMN "innovationRating" SET NOT NULL;
ALTER TABLE feedbacks ALTER COLUMN "presentationRating" SET NOT NULL;
ALTER TABLE feedbacks ALTER COLUMN "valueRating" SET NOT NULL;
ALTER TABLE feedbacks ALTER COLUMN "averageRating" SET NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN feedbacks."qualityRating" IS 'Product/Service Quality Rating (1-5)';
COMMENT ON COLUMN feedbacks."serviceRating" IS 'Customer Service Rating (1-5)';
COMMENT ON COLUMN feedbacks."innovationRating" IS 'Innovation/Creativity Rating (1-5)';
COMMENT ON COLUMN feedbacks."presentationRating" IS 'Presentation/Display Rating (1-5)';
COMMENT ON COLUMN feedbacks."valueRating" IS 'Value for Money Rating (1-5)';
COMMENT ON COLUMN feedbacks."averageRating" IS 'Calculated average of all 5 ratings';