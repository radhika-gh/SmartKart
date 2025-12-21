const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  weight: { type: Number },
  expiryDate: { type: Date },
  image: { type: String },
  // Optional list of descriptive tags for recommendation engine
  tags: { type: [String], default: [] },
  // RFID tag for automatic product detection (10-character string from RDM6300)
  rfidTag: { 
    type: String, 
    unique: true,      // Each tag maps to one product
    sparse: true,      // Allow products without tags (null values won't violate unique constraint)
    index: true        // Fast lookup by tag
  },
  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CartItem", CartItemSchema);
