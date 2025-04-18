const express = require("express");
const Cart = require("../models/Cart");
const Item = require("../models/CartItem");
const router = express.Router();
const axios = require("axios"); 

/** ✅ Claim the Cart (Activate if Inactive) **/
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


//scan cart
/** ✅ Decide Whether to Add or Remove an Item **/
router.post("/scan", async (req, res) => {
  try {
    const { cartId, productId, weight } = req.body;
    console.log(`Scanning item: ${productId}, Weight: ${weight}`);

    let cart = await Cart.findOne({ cartId });
    const product = await Item.findOne({ productId });
    if (!product)
      return res.status(404).json({ error: "❌ Product not found" });
    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    if (!cart.active)
      return res.status(400).json({ error: "🚫 Cart is inactive. Please claim it first." });

    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      console.log("🛑 Item already exists in cart, shifting control to REMOVE function...");
      
      // Manually call the remove function
      return router.handle({ ...req, url: "/remove", method: "DELETE" }, res);
    } else {
      console.log("✅ Item is new, shifting control to ADD function...");
      
      // Manually call the add function
      return router.handle({ ...req, url: "/add", method: "POST" }, res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** ✅ Add an Item to the Cart (Only if Active) **/
router.post("/add", async (req, res) => {
  try {
    const { cartId, productId, weight } = req.body;
    console.log(`🛒 Adding item: ${productId}, Weight: ${weight}`);

    let cart = await Cart.findOne({ cartId });
    const product = await Item.findOne({ productId });

    if (!product) {
      console.log("❌ Product not found in Item collection!");
      return res.status(404).json({ error: "❌ Product not found" });
    }

    console.log("📸 Image URL from DB:", product.image); // ✅ Log image URL before adding to cart

    const expectedWeight = cart.totalWeight + product.weight;
    if (Math.abs(weight - expectedWeight) > 0.05) {
      return res.status(400).json({
        error: `⚠️ Weight mismatch! Expected: ${expectedWeight} kg, Received: ${weight} kg`,
      });
    }

    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += 1; // ✅ Increment quantity if item exists
    } else {
      cart.items.push({
        productId: product.productId,
        name: product.name,
        price: product.price,
        weight: product.weight,
        expiryDate: product.expiryDate,
        quantity: 1,
        image: product.image || "https://via.placeholder.com/150",  
      });
    }

    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.totalWeight = weight;
    
    await cart.save();

    res.status(201).json({ message: "✅ Item added to cart", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** ✅ Remove an Item from the Cart **/
router.delete("/remove", async (req, res) => {
  try {
    const { cartId, productId, weight } = req.body;

    let cart = await Cart.findOne({ cartId });
    const existingItem = cart.items.find((item) => item.productId === productId);
    const expectedWeight = cart.totalWeight - existingItem.weight;
    if (Math.abs(weight - expectedWeight) > 0.05) {
      return res.status(400).json({
        error: `⚠️ Total weight mismatch! Expected: ${expectedWeight} kg, Received: ${weight} kg`,
      });
    }
    cart.items = cart.items.filter((item) => item.productId !== productId);
    // ✅ Update total price & total weight
    cart.totalPrice = cart.items.reduce(
      (sum, item) => sum + item.price ,
      0
    );
    cart.totalWeight = weight;
    await cart.save();

    res.status(200).json({ message: "✅ Item removed from cart", cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ✅ Get Cart Details **/
router.get("/:cartId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ cartId: req.params.cartId })
      .populate("items", "name price weight expiryDate quantity image");  // ✅ Ensure `image` is included

    if (!cart) return res.status(404).json({ error: "❌ Cart not found" });

    res.status(200).json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;