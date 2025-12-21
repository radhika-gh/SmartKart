/**
 * RFID Tag Registration Script
 * 
 * This script allows you to register RFID tags to products.
 * 
 * Usage:
 *   node backend/scripts/register-rfid-tag.js <productId> <rfidTag>
 * 
 * Example:
 *   node backend/scripts/register-rfid-tag.js PROD001 1234567890
 * 
 * To scan and get the RFID tag:
 *   1. Run the RFID service to see tag IDs in the console
 *   2. Hold your product's RFID tag near the reader
 *   3. Copy the 10-character tag ID from the logs
 *   4. Run this script with the productId and tagId
 */

const mongoose = require("mongoose");
const CartItem = require("../models/CartItem");
require("dotenv").config({ path: "./backend/.env" });

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("❌ Error: Missing arguments");
  console.log("\nUsage:");
  console.log("  node backend/scripts/register-rfid-tag.js <productId> <rfidTag>");
  console.log("\nExample:");
  console.log("  node backend/scripts/register-rfid-tag.js PROD001 1234567890");
  console.log("\nTo list all products:");
  console.log("  node backend/scripts/register-rfid-tag.js --list");
  process.exit(1);
}

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

// List all products
const listProducts = async () => {
  try {
    const products = await CartItem.find().select("productId name rfidTag");
    
    console.log("\n📦 Available Products:\n");
    console.log("ProductID".padEnd(20) + "Name".padEnd(30) + "RFID Tag");
    console.log("-".repeat(70));
    
    products.forEach(product => {
      console.log(
        product.productId.padEnd(20) + 
        product.name.padEnd(30) + 
        (product.rfidTag || "(not registered)")
      );
    });
    
    console.log(`\nTotal: ${products.length} products`);
  } catch (err) {
    console.error("❌ Error listing products:", err.message);
    throw err;
  }
};

// Register RFID tag to product
const registerTag = async (productId, rfidTag) => {
  try {
    // Validate RFID tag format (should be 10 characters)
    if (rfidTag.length !== 10) {
      console.warn(`⚠️  Warning: RFID tag should be 10 characters (got ${rfidTag.length})`);
    }

    // Check if tag is already registered to another product
    const existingTag = await CartItem.findOne({ rfidTag });
    if (existingTag) {
      console.error(`❌ Error: RFID tag "${rfidTag}" is already registered to product "${existingTag.productId}" (${existingTag.name})`);
      console.log("\nTo reassign this tag, first remove it from the other product:");
      console.log(`  node backend/scripts/register-rfid-tag.js ${existingTag.productId} --remove`);
      process.exit(1);
    }

    // Find the product
    const product = await CartItem.findOne({ productId });
    if (!product) {
      console.error(`❌ Error: Product "${productId}" not found`);
      console.log("\nRun this command to see available products:");
      console.log("  node backend/scripts/register-rfid-tag.js --list");
      process.exit(1);
    }

    // Update the product with RFID tag
    product.rfidTag = rfidTag;
    await product.save();

    console.log("\n✅ RFID tag registered successfully!");
    console.log(`   Product: ${product.name} (${product.productId})`);
    console.log(`   RFID Tag: ${rfidTag}`);
    console.log(`   Price: $${product.price}`);
    console.log(`   Weight: ${product.weight}kg`);

  } catch (err) {
    if (err.code === 11000) {
      console.error("❌ Error: This RFID tag is already registered to another product");
    } else {
      console.error("❌ Error registering tag:", err.message);
    }
    throw err;
  }
};

// Remove RFID tag from product
const removeTag = async (productId) => {
  try {
    const product = await CartItem.findOne({ productId });
    if (!product) {
      console.error(`❌ Error: Product "${productId}" not found`);
      process.exit(1);
    }

    if (!product.rfidTag) {
      console.log(`ℹ️  Product "${product.name}" (${productId}) has no RFID tag registered`);
      process.exit(0);
    }

    const oldTag = product.rfidTag;
    product.rfidTag = null;
    await product.save();

    console.log("\n✅ RFID tag removed successfully!");
    console.log(`   Product: ${product.name} (${product.productId})`);
    console.log(`   Removed Tag: ${oldTag}`);

  } catch (err) {
    console.error("❌ Error removing tag:", err.message);
    throw err;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();

    const [arg1, arg2] = args;

    // Handle --list flag
    if (arg1 === "--list" || arg1 === "-l") {
      await listProducts();
      process.exit(0);
    }

    // Handle --remove flag
    if (arg2 === "--remove" || arg2 === "-r") {
      await removeTag(arg1);
      process.exit(0);
    }

    // Register tag
    await registerTag(arg1, arg2);
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Operation failed:", err.message);
    process.exit(1);
  }
};

// Run the script
main();
