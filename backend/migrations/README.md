# Database Migration Instructions for Render

## Quick Migration: Add ownerPassword Column

### Option 1: Via Render Dashboard (Recommended)

1. Go to your Render Dashboard
2. Click on your PostgreSQL database service
3. Click the "Shell" tab
4. Copy and paste this command:

```sql
ALTER TABLE "Stalls" ADD COLUMN IF NOT EXISTS "ownerPassword" VARCHAR(255);
```

5. Press Enter to execute

### Option 2: Via Local psql Client

If you have psql installed locally:

```bash
# Get your database external URL from Render dashboard
# It looks like: postgres://username:password@host/database

# Connect to Render database
psql "postgresql://your-db-url-from-render"

# Run the migration
ALTER TABLE "Stalls" ADD COLUMN IF NOT EXISTS "ownerPassword" VARCHAR(255);

# Verify
\d "Stalls"
```

### Option 3: Run Migration File

```bash
# From your local terminal
psql "your-render-db-url" -f migrations/add-owner-password.sql
```

## Verify Migration

After running the migration, verify the column exists:

```sql
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'Stalls' AND column_name = 'ownerPassword';
```

Expected output:
```
 column_name   | data_type | character_maximum_length 
---------------+-----------+-------------------------
 ownerPassword | character varying | 255
```

## After Migration

Once the migration is complete:
1. Your backend will automatically start using the new column
2. Test creating a new stall - credentials should be auto-generated
3. Check the stall owner's email for login details
4. Test the stall owner login with Stall ID + password

## Troubleshooting

If stalls endpoint still fails after migration:
1. Restart your Render backend service (manual deploy or redeploy)
2. Check Render logs for any errors
3. Verify the column exists using the verification query above
