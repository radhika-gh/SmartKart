const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  cartId: { type: String, required: true }, // Unique cart session ID
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      weight: { type: Number, required: true }, 
      expiryDate: { type: Date },
      quantity: { type: Number, default: 1 },
    },
  ],
  totalPrice: { type: Number, required: true },
  totalWeight: { type: Number, required: true }, // Total weight of all items
  paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
  paymentMethod: { type: String, enum: ["Card", "UPI", "Cash"], required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
