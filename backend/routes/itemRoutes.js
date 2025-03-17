const express = require("express");
const CartItem = require("../models/CartItem");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    const { productId, name, price, weight, expiryDate } = req.body;
    const newItem = new CartItem({ productId, name, price, weight, expiryDate });
    await newItem.save();

    res.status(201).json({ message: "Item added to cart", newItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/remove/:id", async (req, res) => {
  try {
    await CartItem.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const items = await CartItem.find();
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
