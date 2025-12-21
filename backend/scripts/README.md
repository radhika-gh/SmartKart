# RFID Tag Registration Scripts

These scripts help you map RFID tags to products in your database.

## Prerequisites

1. Run the migration to add the `rfidTag` field:
   ```bash
   node backend/migrations/add-rfid-tag-field.js
   ```

2. Make sure your MongoDB connection is configured in `backend/.env`

## How to Get RFID Tag IDs

Before you can register tags, you need to know the 10-character tag IDs. Here's how:

### Method 1: Using the RFID Service (Recommended)
1. Start the RFID service (once you implement task 2)
2. Hold an RFID tag near the reader
3. Check the console logs - you'll see the 10-character tag ID
4. Copy that ID and use it in the registration scripts

### Method 2: Using an RFID Reader App
Some RFID readers come with software that displays tag IDs. Check your RDM6300 documentation.

## Scripts

### 1. List All Products

See which products exist and which already have RFID tags:

```bash
node backend/scripts/register-rfid-tag.js --list
```

**Output:**
```
📦 Available Products:

ProductID           Name                          RFID Tag
----------------------------------------------------------------------
PROD001             Apple                         1234567890
PROD002             Banana                        (not registered)
PROD003             Orange                        0987654321

Total: 3 products
```

### 2. Register Single RFID Tag

Register one RFID tag to a product:

```bash
node backend/scripts/register-rfid-tag.js <productId> <rfidTag>
```

**Example:**
```bash
node backend/scripts/register-rfid-tag.js PROD002 5566778899
```

**Output:**
```
✅ RFID tag registered successfully!
   Product: Banana (PROD002)
   RFID Tag: 5566778899
   Price: $1.99
   Weight: 0.2kg
```

### 3. Remove RFID Tag

Remove an RFID tag from a product:

```bash
node backend/scripts/register-rfid-tag.js <productId> --remove
```

**Example:**
```bash
node backend/scripts/register-rfid-tag.js PROD002 --remove
```

### 4. Bulk Register from CSV

Register multiple RFID tags at once using a CSV file:

```bash
node backend/scripts/bulk-register-rfid.js <csvFilePath>
```

**CSV Format:**
```csv
productId,rfidTag
PROD001,1234567890
PROD002,0987654321
PROD003,1122334455
```

**Example:**
```bash
# Use the template
cp backend/scripts/rfid-mappings-template.csv my-rfid-mappings.csv

# Edit my-rfid-mappings.csv with your actual product IDs and RFID tags

# Run the bulk registration
node backend/scripts/bulk-register-rfid.js my-rfid-mappings.csv
```

**Output:**
```
🏷️  RFID Bulk Registration Tool

✅ MongoDB connected
📄 Loaded 3 mappings from my-rfid-mappings.csv

🔄 Processing 3 RFID tag registrations...

✅ Registered PROD001 (Apple) → 1234567890
✅ Registered PROD002 (Banana) → 0987654321
✅ Registered PROD003 (Orange) → 1122334455

======================================================================
📊 BULK REGISTRATION SUMMARY
======================================================================

✅ Successful: 3
   - PROD001 (Apple) → 1234567890
   - PROD002 (Banana) → 0987654321
   - PROD003 (Orange) → 1122334455

⏭️  Skipped: 0

❌ Failed: 0

======================================================================

🎉 Bulk registration completed successfully!
```

## Workflow

Here's the recommended workflow for setting up RFID tags:

1. **List your products** to see what's available:
   ```bash
   node backend/scripts/register-rfid-tag.js --list
   ```

2. **Scan your RFID tags** (using the RFID service or reader app) to get the tag IDs

3. **Create a CSV file** with your mappings:
   ```csv
   productId,rfidTag
   PROD001,1234567890
   PROD002,0987654321
   ```

4. **Run bulk registration**:
   ```bash
   node backend/scripts/bulk-register-rfid.js my-mappings.csv
   ```

5. **Verify** by listing products again:
   ```bash
   node backend/scripts/register-rfid-tag.js --list
   ```

## Error Handling

### "RFID tag is already registered to another product"
Each RFID tag can only be assigned to one product. If you need to reassign:
```bash
# Remove from old product
node backend/scripts/register-rfid-tag.js OLD_PROD_ID --remove

# Register to new product
node backend/scripts/register-rfid-tag.js NEW_PROD_ID 1234567890
```

### "Product not found"
Make sure the productId exists in your database. Run `--list` to see available products.

### "Warning: RFID tag should be 10 characters"
RDM6300 readers output 10-character tag IDs. If you see this warning, double-check your tag ID.

## Notes

- RFID tags are case-sensitive
- Each tag must be unique across all products
- Products without RFID tags can still be used (the field is optional)
- You can update a product's RFID tag by running the register command again
- The scripts are idempotent - safe to run multiple times
