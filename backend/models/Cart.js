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
    },
  ],
  totalPrice: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 },
  active: { type: Boolean, default: false }, 
});

module.exports = mongoose.model("Cart", CartSchema);
