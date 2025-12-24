/**
 * Migration Script: Add rfidTag field to existing CartItem documents
 * 
 * This script adds the rfidTag field to all existing products in the database.
 * The field is initialized as null for all existing products.
 * 
 * Usage:
 *   node backend/migrations/add-rfid-tag-field.js
 * 
 * Requirements: 1.2, 1.3
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected for migration");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Run migration
const runMigration = async () => {
  try {
    console.log("🔄 Starting migration: Adding rfidTag field to CartItem collection...");

    // Get the CartItem collection directly
    const db = mongoose.connection.db;
    const collection = db.collection("cartitems");

    // Check how many documents exist
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Found ${totalDocs} documents in CartItem collection`);

    if (totalDocs === 0) {
      console.log("ℹ️  No documents to migrate");
      return;
    }

    // Add rfidTag field to all documents that don't have it
    const result = await collection.updateMany(
      { rfidTag: { $exists: false } }, // Only update documents without rfidTag
      { $set: { rfidTag: null } }      // Set to null (allows future assignment)
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Documents matched: ${result.matchedCount}`);
    console.log(`   - Documents modified: ${result.modifiedCount}`);

    // Verify the migration
    const docsWithRfidField = await collection.countDocuments({ rfidTag: { $exists: true } });
    console.log(`✅ Verification: ${docsWithRfidField}/${totalDocs} documents now have rfidTag field`);

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw err;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await runMigration();
    console.log("\n🎉 Migration process completed!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration process failed:", err.message);
    process.exit(1);
  }
};

// Run the migration
main();
