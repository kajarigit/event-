-- Seed data for Event Management System
-- PostgreSQL version

-- Insert Admin User (password: Admin@123)
INSERT INTO "Users" ("id", "name", "email", "password", "role", "department", "isActive", "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4(),
    'System Admin',
    'admin@example.com',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    'admin',
    'IT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO NOTHING;

-- Insert Sample Volunteer User (password: Volunteer@123)
INSERT INTO "Users" ("id", "name", "email", "password", "role", "department", "rollNumber", "isActive", "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4(),
    'Sample Volunteer',
    'volunteer@example.com',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    'volunteer',
    'CSE',
    'VOL001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO NOTHING;

-- Insert Sample Student Users (password: Student@123)
INSERT INTO "Users" ("id", "name", "email", "password", "role", "department", "rollNumber", "year", "section", "phoneNumber", "isActive", "createdAt", "updatedAt")
VALUES 
    (
        uuid_generate_v4(),
        'John Doe',
        'john.doe@student.example.com',
        '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
        'student',
        'CSE',
        '21CSE001',
        '3',
        'A',
        '9876543210',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        uuid_generate_v4(),
        'Jane Smith',
        'jane.smith@student.example.com',
        '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
        'student',
        'ECE',
        '21ECE001',
        '3',
        'A',
        '9876543211',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        uuid_generate_v4(),
        'Mike Johnson',
        'mike.johnson@student.example.com',
        '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
        'student',
        'MECH',
        '21MECH001',
        '2',
        'B',
        '9876543212',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("email") DO NOTHING;

-- Insert Sample Event
INSERT INTO "Events" ("id", "name", "description", "location", "startDate", "endDate", "isActive", "createdAt", "updatedAt")
VALUES (
    uuid_generate_v4(),
    'Annual Tech Fest 2025',
    'Annual technology festival showcasing student innovations and creativity',
    'Main Campus Grounds',
    '2025-12-15 09:00:00+00',
    '2025-12-17 18:00:00+00',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Note: To insert stalls, votes, and feedbacks, you'll need to:
-- 1. Get the actual UUIDs from the inserted events and users
-- 2. Use those UUIDs in subsequent INSERT statements
-- 3. Or use a more advanced seeding script with queries

-- Example query to get the admin user ID for reference:
-- SELECT id FROM "Users" WHERE email = 'admin@example.com';

-- Example query to get the event ID for reference:
-- SELECT id FROM "Events" WHERE name = 'Annual Tech Fest 2025';
