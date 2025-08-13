const express = require("express");
const Cart = require("../models/Cart");
const router = express.Router();
const Transaction = require("../models/Transaction");

/** ✅ Add a New Cart (Admin Only) **/
router.post("/addCart", async (req, res) => {
  try {
    const { cartId } = req.body;

    let existingCart = await Cart.findOne({ cartId });

    if (existingCart)
      return res.status(400).json({ error: "🚫 Cart already exists" });

    const newCart = new Cart({
      cartId,
      items: [],
      totalPrice: 0,
      totalWeight: 0,
      active: false,
    });

    await newCart.save();

    res.status(201).json({ message: "✅ Cart added successfully", newCart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Remove a Cart (Admin Only) **/
router.delete("/removeCart", async (req, res) => {
  try {
    const { cartId } = req.body;

    let cart = await Cart.findOne({ cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    await Cart.deleteOne({ cartId });

    res.status(200).json({ message: "✅ Cart removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Get All Carts (Admin Only) **/
router.get("/getAllCarts", async (req, res) => {
  try {
    const carts = await Cart.find();
    res.status(200).json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Verify Cash Payment (Admin Only) **/
router.post("/verifyCash", async (req, res) => {
  try {
    const { cartId } = req.body;
    const cart = await Cart.findOne({ cartId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    if (!cart.active) {
      return res.status(400).json({ error: "Cart is already processed" });
    }
    // Create a transaction for cash payment.
    const transaction = new Transaction({
      cartId: cart.cartId,
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalWeight: cart.totalWeight,
      paymentMethod: "Cash",
      paymentStatus: "Completed",
      paymentId: null, // No payment id for cash payments
    });
    await transaction.save();

    // Mark the cart inactive and clear it.
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalWeight = 0;
    cart.active = false;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cash payment verified and processed successfully!",
    });
  } catch (error) {
    console.error("Error in verifying cash payment:", error);
    res
      .status(500)
      .json({ error: "Failed to process cash payment verification." });
  }
});

module.exports = router;
