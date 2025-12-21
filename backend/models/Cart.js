const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  cartId: { type: String, required: true, unique: true }, // 4-digit unique cart ID
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      weight: { type: Number, required: true },
      expiryDate: { type: Date },
      quantity: { type: Number, default: 1 },
      image: { type: String, required: false },
      addedAt: { type: Date, default: Date.now }, // Track when item was added
    },
  ],
  totalPrice: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
  measuredWeight: { type: Number, default: 0 }, // Actual weight from HX711 load cell in kg
  weightDiscrepancy: { type: Boolean, default: false }, // Alert flag for weight mismatch > 0.5kg
  lastWeightUpdate: { type: Date }, // Timestamp of last weight measurement
});

module.exports = mongoose.model("Cart", CartSchema);
