-- Event Management System - PostgreSQL Database Schema
-- For AWS RDS PostgreSQL Deployment
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS "Votes" CASCADE;
DROP TABLE IF EXISTS "Feedbacks" CASCADE;
DROP TABLE IF EXISTS "ScanLogs" CASCADE;
DROP TABLE IF EXISTS "Attendances" CASCADE;
DROP TABLE IF EXISTS "Stalls" CASCADE;
DROP TABLE IF EXISTS "Events" CASCADE;
DROP TABLE IF EXISTS "OTPs" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

-- Users Table
CREATE TABLE "Users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rollNumber" VARCHAR(50) UNIQUE,
    "department" VARCHAR(100),
    "year" VARCHAR(10),
    "section" VARCHAR(10),
    "phoneNumber" VARCHAR(15),
    "role" VARCHAR(50) NOT NULL DEFAULT 'student',
    "isActive" BOOLEAN DEFAULT true,
    "profilePicture" VARCHAR(500),
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Users_email_check" CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT "Users_role_check" CHECK (role IN ('student', 'volunteer', 'admin'))
);

-- Create indexes for Users
CREATE INDEX "idx_users_email" ON "Users"("email");
CREATE INDEX "idx_users_role" ON "Users"("role");
CREATE INDEX "idx_users_rollNumber" ON "Users"("rollNumber");
CREATE INDEX "idx_users_department" ON "Users"("department");

-- OTPs Table (for password reset)
CREATE TABLE "OTPs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "otp" VARCHAR(6) NOT NULL,
    "purpose" VARCHAR(50) NOT NULL DEFAULT 'password_reset',
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "OTPs_purpose_check" CHECK (purpose IN ('password_reset', 'email_verification'))
);

-- Create indexes for OTPs
CREATE INDEX "idx_otps_userId" ON "OTPs"("userId");
CREATE INDEX "idx_otps_expiresAt" ON "OTPs"("expiresAt");

-- Events Table
CREATE TABLE "Events" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255),
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN DEFAULT false,
    "qrCodeData" TEXT,
    "createdBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Events_dates_check" CHECK ("endDate" > "startDate")
);

-- Create indexes for Events
CREATE INDEX "idx_events_isActive" ON "Events"("isActive");
CREATE INDEX "idx_events_startDate" ON "Events"("startDate");
CREATE INDEX "idx_events_createdBy" ON "Events"("createdBy");

-- Stalls Table
CREATE TABLE "Stalls" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255),
    "department" VARCHAR(100),
    "eventId" UUID NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
    "ownerName" VARCHAR(255),
    "ownerEmail" VARCHAR(255),
    "ownerContact" VARCHAR(15),
    "ownerPassword" VARCHAR(255),
    "qrCodeData" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "totalVotes" INTEGER DEFAULT 0,
    "averageRating" DECIMAL(3, 2) DEFAULT 0,
    "totalFeedbacks" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Stalls_ownerEmail_check" CHECK (
        "ownerEmail" IS NULL OR 
        "ownerEmail" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- Create indexes for Stalls
CREATE INDEX "idx_stalls_eventId" ON "Stalls"("eventId");
CREATE INDEX "idx_stalls_department" ON "Stalls"("department");
CREATE INDEX "idx_stalls_isActive" ON "Stalls"("isActive");
CREATE INDEX "idx_stalls_totalVotes" ON "Stalls"("totalVotes");
CREATE INDEX "idx_stalls_averageRating" ON "Stalls"("averageRating");

-- Attendances Table
CREATE TABLE "Attendances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "eventId" UUID NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
    "checkInTime" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(50) DEFAULT 'checked-in',
    "qrToken" VARCHAR(255),
    "scannedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Attendances_unique_user_event" UNIQUE ("userId", "eventId"),
    CONSTRAINT "Attendances_status_check" CHECK (status IN ('checked-in', 'checked-out', 'cancelled'))
);

-- Create indexes for Attendances
CREATE INDEX "idx_attendances_userId" ON "Attendances"("userId");
CREATE INDEX "idx_attendances_eventId" ON "Attendances"("eventId");
CREATE INDEX "idx_attendances_checkInTime" ON "Attendances"("checkInTime");
CREATE INDEX "idx_attendances_status" ON "Attendances"("status");

-- ScanLogs Table
CREATE TABLE "ScanLogs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "eventId" UUID REFERENCES "Events"("id") ON DELETE CASCADE,
    "stallId" UUID REFERENCES "Stalls"("id") ON DELETE SET NULL,
    "scannedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "scanType" VARCHAR(50) NOT NULL,
    "qrToken" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'success',
    "errorMessage" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ScanLogs_scanType_check" CHECK (scanType IN ('attendance', 'feedback', 'vote', 'checkout')),
    CONSTRAINT "ScanLogs_status_check" CHECK (status IN ('success', 'failed', 'flagged'))
);

-- Create indexes for ScanLogs
CREATE INDEX "idx_scanlogs_userId" ON "ScanLogs"("userId");
CREATE INDEX "idx_scanlogs_eventId" ON "ScanLogs"("eventId");
CREATE INDEX "idx_scanlogs_stallId" ON "ScanLogs"("stallId");
CREATE INDEX "idx_scanlogs_scanType" ON "ScanLogs"("scanType");
CREATE INDEX "idx_scanlogs_status" ON "ScanLogs"("status");
CREATE INDEX "idx_scanlogs_createdAt" ON "ScanLogs"("createdAt");

-- Feedbacks Table
CREATE TABLE "Feedbacks" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "stallId" UUID NOT NULL REFERENCES "Stalls"("id") ON DELETE CASCADE,
    "eventId" UUID NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isAnonymous" BOOLEAN DEFAULT false,
    "submittedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Feedbacks_unique_user_stall" UNIQUE ("userId", "stallId", "eventId"),
    CONSTRAINT "Feedbacks_rating_check" CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes for Feedbacks
CREATE INDEX "idx_feedbacks_userId" ON "Feedbacks"("userId");
CREATE INDEX "idx_feedbacks_stallId" ON "Feedbacks"("stallId");
CREATE INDEX "idx_feedbacks_eventId" ON "Feedbacks"("eventId");
CREATE INDEX "idx_feedbacks_rating" ON "Feedbacks"("rating");
CREATE INDEX "idx_feedbacks_createdAt" ON "Feedbacks"("createdAt");

-- Votes Table
CREATE TABLE "Votes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "stallId" UUID NOT NULL REFERENCES "Stalls"("id") ON DELETE CASCADE,
    "eventId" UUID NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
    "submittedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Votes_unique_user_stall" UNIQUE ("userId", "stallId", "eventId")
);

-- Create indexes for Votes
CREATE INDEX "idx_votes_userId" ON "Votes"("userId");
CREATE INDEX "idx_votes_stallId" ON "Votes"("stallId");
CREATE INDEX "idx_votes_eventId" ON "Votes"("eventId");
CREATE INDEX "idx_votes_createdAt" ON "Votes"("createdAt");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "Users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON "Events"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stalls_updated_at BEFORE UPDATE ON "Stalls"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON "Attendances"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON "Feedbacks"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON "Votes"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update stall statistics
CREATE OR REPLACE FUNCTION update_stall_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stall statistics when feedback or vote is added/updated/deleted
    UPDATE "Stalls" SET
        "totalVotes" = (
            SELECT COUNT(*) FROM "Votes" 
            WHERE "stallId" = COALESCE(NEW."stallId", OLD."stallId")
        ),
        "averageRating" = (
            SELECT COALESCE(AVG(rating), 0) FROM "Feedbacks" 
            WHERE "stallId" = COALESCE(NEW."stallId", OLD."stallId")
        ),
        "totalFeedbacks" = (
            SELECT COUNT(*) FROM "Feedbacks" 
            WHERE "stallId" = COALESCE(NEW."stallId", OLD."stallId")
        ),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = COALESCE(NEW."stallId", OLD."stallId");
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply stall stats triggers
CREATE TRIGGER update_stall_stats_on_vote_insert AFTER INSERT ON "Votes"
    FOR EACH ROW EXECUTE FUNCTION update_stall_stats();

CREATE TRIGGER update_stall_stats_on_vote_delete AFTER DELETE ON "Votes"
    FOR EACH ROW EXECUTE FUNCTION update_stall_stats();

CREATE TRIGGER update_stall_stats_on_feedback_insert AFTER INSERT ON "Feedbacks"
    FOR EACH ROW EXECUTE FUNCTION update_stall_stats();

CREATE TRIGGER update_stall_stats_on_feedback_update AFTER UPDATE ON "Feedbacks"
    FOR EACH ROW EXECUTE FUNCTION update_stall_stats();

CREATE TRIGGER update_stall_stats_on_feedback_delete AFTER DELETE ON "Feedbacks"
    FOR EACH ROW EXECUTE FUNCTION update_stall_stats();

-- Comments for documentation
COMMENT ON TABLE "Users" IS 'Stores all user information including students, volunteers, and admins';
COMMENT ON TABLE "Events" IS 'Events organized by the institution';
COMMENT ON TABLE "Stalls" IS 'Stalls participating in events';
COMMENT ON TABLE "Attendances" IS 'Student attendance tracking for events';
COMMENT ON TABLE "ScanLogs" IS 'Audit log for all QR code scans';
COMMENT ON TABLE "Feedbacks" IS 'Student feedback for stalls';
COMMENT ON TABLE "Votes" IS 'Student votes for stalls';
COMMENT ON TABLE "OTPs" IS 'One-time passwords for authentication and verification';

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;
