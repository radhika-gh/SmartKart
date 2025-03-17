const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true }, // Unique cart identifier (QR Code)
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      weight: { type: Number },
      expiryDate: { type: Date },
      quantity: { type: Number, default: 1 },
    },
  ],
  totalPrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", CartSchema);
