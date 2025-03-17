const express = require("express");
const Cart = require("../models/Cart");
const router = express.Router();

/** ✅ Claim a Cart (Activate if Inactive) **/
router.post("/claim", async (req, res) => {
  try {
    const { cartId } = req.body;

    let cart = await Cart.findOne({ cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    if (cart.active)
      return res.status(400).json({ error: "🚫 Cart is already in use" });

    cart.active = true;
    await cart.save();

    res.status(200).json({ message: "✅ Cart claimed successfully", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Add an Item to the Cart (Only if Active) **/
router.post("/add", async (req, res) => {
  try {
    const { cartId, productId, name, price, weight, expiryDate } = req.body;

    let cart = await Cart.findOne({ cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    if (!cart.active)
      return res
        .status(400)
        .json({ error: "🚫 Cart is inactive. Please claim it first." });

    const existingItem = cart.items.find(
      (item) => item.productId === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        name,
        price,
        weight,
        expiryDate,
        quantity: 1,
      });
    }

    // ✅ Update total price & total weight
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cart.totalWeight = cart.items.reduce(
      (sum, item) => sum + item.weight * item.quantity,
      0
    );

    await cart.save();

    res.status(201).json({ message: "✅ Item added to cart", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Remove an Item from the Cart **/
router.delete("/remove", async (req, res) => {
  try {
    const { cartId, productId } = req.body;

    let cart = await Cart.findOne({ cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    cart.items = cart.items.filter((item) => {
      if (item.productId === productId) {
        if (item.quantity > 1) {
          item.quantity -= 1;
          return true;
        }
        return false;
      }
      return true;
    });

    // ✅ Update total price & total weight
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cart.totalWeight = cart.items.reduce(
      (sum, item) => sum + item.weight * item.quantity,
      0
    );

    await cart.save();

    res.status(200).json({ message: "✅ Item removed from cart", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Get Cart Details **/
router.get("/:cartId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ cartId: req.params.cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    res.status(200).json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Checkout & Reset the Cart **/
router.post("/checkout", async (req, res) => {
  try {
    const { cartId } = req.body;

    let cart = await Cart.findOne({ cartId });

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    cart.items = [];
    cart.totalPrice = 0;
    cart.totalWeight = 0;
    cart.active = false; // ✅ Reset to inactive

    await cart.save();

    res
      .status(200)
      .json({ message: "✅ Checkout successful. Cart reset.", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
