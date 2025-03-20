const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  weight: { type: Number },
  expiryDate: { type: Date },
  image: { type: String },
  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CartItem", CartItemSchema);
