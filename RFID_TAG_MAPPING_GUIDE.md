# RFID Tag Mapping Quick Start Guide

This guide shows you how to map RFID tags to your products after completing Task 1.

## Step 1: Run the Migration

First, add the `rfidTag` field to your existing products:

```bash
node backend/migrations/add-rfid-tag-field.js
```

**Expected output:**
```
✅ MongoDB connected for migration
🔄 Starting migration: Adding rfidTag field to CartItem collection...
📊 Found X documents in CartItem collection
✅ Migration completed successfully!
```

## Step 2: Choose Your Registration Method

### Option A: Single Product Registration (Quick Testing)

Best for: Testing with 1-2 products

```bash
# List all products
node backend/scripts/register-rfid-tag.js --list

# Register a tag
node backend/scripts/register-rfid-tag.js PROD001 1234567890
```

### Option B: Bulk Registration (Production)

Best for: Registering many products at once

```bash
# 1. Create a CSV file (or use the template)
cp backend/scripts/rfid-mappings-template.csv my-tags.csv

# 2. Edit my-tags.csv with your product IDs and RFID tags
# Format:
#   productId,rfidTag
#   PROD001,1234567890
#   PROD002,0987654321

# 3. Run bulk registration
node backend/scripts/bulk-register-rfid.js my-tags.csv
```

## Step 3: Get Your RFID Tag IDs

You need the 10-character tag IDs from your RFID tags. Here's how:

### Method 1: Scan with RFID Service (After Task 2)
Once you implement the RFID service (Task 2), you can:
1. Start the RFID service
2. Hold a tag near the reader
3. Check the console logs for the tag ID
4. Copy and use it in the registration scripts

### Method 2: Use RDM6300 Reader Software
Some RFID readers come with software that displays tag IDs. Check your hardware documentation.

### Method 3: Physical Tag Labels
Some RFID tags have the ID printed on them. Look for a 10-digit number.

## Step 4: Verify Registration

Check that your tags are registered:

```bash
node backend/scripts/register-rfid-tag.js --list
```

You should see your RFID tags listed next to the product names.

## Common Commands

```bash
# List all products and their RFID tags
node backend/scripts/register-rfid-tag.js --list

# Register a single tag
node backend/scripts/register-rfid-tag.js <productId> <rfidTag>

# Remove a tag from a product
node backend/scripts/register-rfid-tag.js <productId> --remove

# Bulk register from CSV
node backend/scripts/bulk-register-rfid.js <csvFile>
```

## Example Workflow

```bash
# 1. See what products you have
node backend/scripts/register-rfid-tag.js --list

# Output:
# ProductID           Name                          RFID Tag
# ----------------------------------------------------------------------
# PROD001             Apple                         (not registered)
# PROD002             Banana                        (not registered)
# PROD003             Orange                        (not registered)

# 2. Register tags one by one
node backend/scripts/register-rfid-tag.js PROD001 1234567890
node backend/scripts/register-rfid-tag.js PROD002 0987654321
node backend/scripts/register-rfid-tag.js PROD003 1122334455

# 3. Verify
node backend/scripts/register-rfid-tag.js --list

# Output:
# ProductID           Name                          RFID Tag
# ----------------------------------------------------------------------
# PROD001             Apple                         1234567890
# PROD002             Banana                        0987654321
# PROD003             Orange                        1122334455
```

## Troubleshooting

**"Product not found"**
- Run `--list` to see available products
- Make sure you're using the correct productId

**"RFID tag is already registered"**
- Each tag can only be assigned to one product
- Remove it from the old product first: `node backend/scripts/register-rfid-tag.js OLD_ID --remove`

**"MongoDB connection error"**
- Check that `MONGO_URI` is set in `backend/.env`
- Make sure MongoDB is running

## Next Steps

After mapping your RFID tags:
1. Proceed to Task 2: Create RFID service for Raspberry Pi
2. Test scanning products with the RFID readers
3. Verify that products are added/removed from the cart correctly

## Files Created

- `backend/models/CartItem.js` - Updated with rfidTag field
- `backend/migrations/add-rfid-tag-field.js` - Migration script
- `backend/scripts/register-rfid-tag.js` - Single tag registration
- `backend/scripts/bulk-register-rfid.js` - Bulk tag registration
- `backend/scripts/rfid-mappings-template.csv` - CSV template

For detailed documentation, see:
- `backend/migrations/README.md` - Migration documentation
- `backend/scripts/README.md` - Registration scripts documentation
