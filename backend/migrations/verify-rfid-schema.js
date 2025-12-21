/**
 * Verification Script: Test rfidTag field functionality
 * 
 * This script verifies that the rfidTag field works correctly:
 * - Can create products with RFID tags
 * - Can create products without RFID tags
 * - Unique constraint works (prevents duplicate tags)
 * - Can query products by RFID tag
 * 
 * Usage:
 *   node backend/migrations/verify-rfid-schema.js
 */

const mongoose = require("mongoose");
const CartItem = require("../models/CartItem");
require("dotenv").config({ path: "./backend/.env" });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected for verification");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Run verification tests
const runVerification = async () => {
  try {
    console.log("\n🔍 Starting schema verification tests...\n");

    // Test 1: Create product with RFID tag
    console.log("Test 1: Creating product with RFID tag...");
    const testProduct1 = new CartItem({
      productId: "TEST_RFID_001",
      name: "Test Product with RFID",
      price: 9.99,
      weight: 0.5,
      rfidTag: "1234567890"
    });
    await testProduct1.save();
    console.log("✅ Product with RFID tag created successfully");

    // Test 2: Create product without RFID tag
    console.log("\nTest 2: Creating product without RFID tag...");
    const testProduct2 = new CartItem({
      productId: "TEST_RFID_002",
      name: "Test Product without RFID",
      price: 5.99,
      weight: 0.3
    });
    await testProduct2.save();
    console.log("✅ Product without RFID tag created successfully");

    // Test 3: Query product by RFID tag
    console.log("\nTest 3: Querying product by RFID tag...");
    const foundProduct = await CartItem.findOne({ rfidTag: "1234567890" });
    if (foundProduct && foundProduct.name === "Test Product with RFID") {
      console.log("✅ Product lookup by RFID tag works correctly");
      console.log(`   Found: ${foundProduct.name} (${foundProduct.productId})`);
    } else {
      throw new Error("Product lookup by RFID tag failed");
    }

    // Test 4: Verify unique constraint (should fail)
    console.log("\nTest 4: Testing unique constraint on RFID tag...");
    try {
      const duplicateProduct = new CartItem({
        productId: "TEST_RFID_003",
        name: "Duplicate RFID Product",
        price: 7.99,
        weight: 0.4,
        rfidTag: "1234567890" // Same tag as testProduct1
      });
      await duplicateProduct.save();
      console.log("❌ Unique constraint failed - duplicate tag was allowed!");
    } catch (err) {
      if (err.code === 11000) {
        console.log("✅ Unique constraint works - duplicate tag rejected");
      } else {
        throw err;
      }
    }

    // Test 5: Update existing product with RFID tag
    console.log("\nTest 5: Updating existing product with RFID tag...");
    testProduct2.rfidTag = "0987654321";
    await testProduct2.save();
    const updatedProduct = await CartItem.findOne({ productId: "TEST_RFID_002" });
    if (updatedProduct.rfidTag === "0987654321") {
      console.log("✅ Product RFID tag update works correctly");
    } else {
      throw new Error("Product RFID tag update failed");
    }

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...");
    await CartItem.deleteMany({ productId: { $in: ["TEST_RFID_001", "TEST_RFID_002", "TEST_RFID_003"] } });
    console.log("✅ Test data cleaned up");

    console.log("\n✅ All verification tests passed!");

  } catch (err) {
    console.error("\n❌ Verification failed:", err.message);
    throw err;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await runVerification();
    console.log("\n🎉 Schema verification completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Schema verification failed:", err.message);
    process.exit(1);
  }
};

// Run the verification
main();
