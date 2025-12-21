/**
 * Bulk RFID Tag Registration Script
 * 
 * This script allows you to register multiple RFID tags from a CSV file.
 * 
 * CSV Format:
 *   productId,rfidTag
 *   PROD001,1234567890
 *   PROD002,0987654321
 * 
 * Usage:
 *   node backend/scripts/bulk-register-rfid.js <csvFilePath>
 * 
 * Example:
 *   node backend/scripts/bulk-register-rfid.js rfid-mappings.csv
 */

const mongoose = require("mongoose");
const CartItem = require("../models/CartItem");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: "./backend/.env" });

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error("❌ Error: Missing CSV file path");
  console.log("\nUsage:");
  console.log("  node backend/scripts/bulk-register-rfid.js <csvFilePath>");
  console.log("\nCSV Format:");
  console.log("  productId,rfidTag");
  console.log("  PROD001,1234567890");
  console.log("  PROD002,0987654321");
  process.exit(1);
}

const csvFilePath = args[0];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Parse CSV file
const parseCSV = (filePath) => {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Error: File not found: ${fullPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const mappings = dataLines.map((line, index) => {
      const [productId, rfidTag] = line.split(",").map(s => s.trim());
      
      if (!productId || !rfidTag) {
        console.warn(`⚠️  Warning: Skipping invalid line ${index + 2}: "${line}"`);
        return null;
      }
      
      return { productId, rfidTag };
    }).filter(Boolean);

    return mappings;
  } catch (err) {
    console.error("❌ Error reading CSV file:", err.message);
    throw err;
  }
};

// Bulk register tags
const bulkRegister = async (mappings) => {
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  console.log(`\n🔄 Processing ${mappings.length} RFID tag registrations...\n`);

  for (const mapping of mappings) {
    try {
      const { productId, rfidTag } = mapping;

      // Check if tag is already registered
      const existingTag = await CartItem.findOne({ rfidTag });
      if (existingTag && existingTag.productId !== productId) {
        results.skipped.push({
          productId,
          rfidTag,
          reason: `Tag already registered to ${existingTag.productId}`
        });
        console.log(`⏭️  Skipped ${productId}: Tag already registered to ${existingTag.productId}`);
        continue;
      }

      // Find the product
      const product = await CartItem.findOne({ productId });
      if (!product) {
        results.failed.push({
          productId,
          rfidTag,
          reason: "Product not found"
        });
        console.log(`❌ Failed ${productId}: Product not found`);
        continue;
      }

      // Update the product
      product.rfidTag = rfidTag;
      await product.save();

      results.success.push({
        productId,
        rfidTag,
        name: product.name
      });
      console.log(`✅ Registered ${productId} (${product.name}) → ${rfidTag}`);

    } catch (err) {
      results.failed.push({
        productId: mapping.productId,
        rfidTag: mapping.rfidTag,
        reason: err.message
      });
      console.log(`❌ Failed ${mapping.productId}: ${err.message}`);
    }
  }

  return results;
};

// Print summary
const printSummary = (results) => {
  console.log("\n" + "=".repeat(70));
  console.log("📊 BULK REGISTRATION SUMMARY");
  console.log("=".repeat(70));
  
  console.log(`\n✅ Successful: ${results.success.length}`);
  if (results.success.length > 0) {
    results.success.forEach(item => {
      console.log(`   - ${item.productId} (${item.name}) → ${item.rfidTag}`);
    });
  }

  console.log(`\n⏭️  Skipped: ${results.skipped.length}`);
  if (results.skipped.length > 0) {
    results.skipped.forEach(item => {
      console.log(`   - ${item.productId}: ${item.reason}`);
    });
  }

  console.log(`\n❌ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(item => {
      console.log(`   - ${item.productId}: ${item.reason}`);
    });
  }

  console.log("\n" + "=".repeat(70));
};

// Main execution
const main = async () => {
  try {
    console.log("🏷️  RFID Bulk Registration Tool\n");
    
    await connectDB();
    
    const mappings = parseCSV(csvFilePath);
    console.log(`📄 Loaded ${mappings.length} mappings from ${csvFilePath}`);
    
    const results = await bulkRegister(mappings);
    
    printSummary(results);
    
    if (results.failed.length === 0) {
      console.log("\n🎉 Bulk registration completed successfully!");
    } else {
      console.log("\n⚠️  Bulk registration completed with some failures");
    }
    
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Bulk registration failed:", err.message);
    process.exit(1);
  }
};

// Run the script
main();
