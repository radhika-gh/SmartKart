const express = require("express");
const Cart = require("../models/Cart");
const router = express.Router();

/** ✅ Add a New Cart (Admin Only) **/
router.post("/admin/addCart", async (req, res) => {
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
router.delete("/admin/removeCart", async (req, res) => {
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
router.get("/admin/getAllCarts", async (req, res) => {
  try {
    const carts = await Cart.find();
    res.status(200).json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
