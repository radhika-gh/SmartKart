# Database Migrations

This directory contains database migration scripts for the SmartKart backend.

## Available Migrations

### add-rfid-tag-field.js
Adds the `rfidTag` field to all existing CartItem documents in the database.

**Purpose**: Enable RFID tag support for automatic product detection in the smart shopping cart system.

**What it does**:
- Adds `rfidTag` field (initialized as `null`) to all existing products
- Only updates documents that don't already have the field
- Provides verification output showing migration success

**Usage**:
```bash
node backend/migrations/add-rfid-tag-field.js
```

**Requirements**: 
- MongoDB connection must be configured in `backend/.env`
- `MONGO_URI` environment variable must be set

**Expected Output**:
```
✅ MongoDB connected for migration
🔄 Starting migration: Adding rfidTag field to CartItem collection...
📊 Found X documents in CartItem collection
✅ Migration completed successfully!
   - Documents matched: X
   - Documents modified: X
✅ Verification: X/X documents now have rfidTag field
🎉 Migration process completed!
```

## Running Migrations

1. Ensure your MongoDB connection is configured in `backend/.env`
2. Navigate to the project root directory
3. Run the migration script:
   ```bash
   node backend/migrations/add-rfid-tag-field.js
   ```
4. Verify the output shows successful completion

## Notes

- Migrations are idempotent - running them multiple times is safe
- Always backup your database before running migrations in production
- The `rfidTag` field uses a sparse unique index, allowing multiple null values
- RFID tags must be registered separately using the tag registration utility (see task 5 in implementation plan)
