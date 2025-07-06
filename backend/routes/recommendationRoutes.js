const express = require("express");
const Cart = require("../models/Cart");
const Item = require("../models/CartItem");

const router = express.Router();

/**
 * GET /api/recommendations?cartId=XXXX&limit=4
 * Returns up to `limit` products that share the most tag overlap with the
 * items currently in the given cart, excluding products already in the cart.
 */
router.get("/", async (req, res) => {
  try {
    const { cartId, limit = 4 } = req.query;
    if (!cartId) {
      return res.status(400).json({ error: "cartId query param is required" });
    }

    // 1. Get cart
    const cart = await Cart.findOne({ cartId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartProductIds = cart.items.map((i) => i.productId);

    // 2. Build tag set from items in cart
    const cartProducts = await Item.find({ productId: { $in: cartProductIds } });
    const tagSet = new Set();
    cartProducts.forEach((p) => {
      (p.tags || []).forEach((t) => tagSet.add(t));
    });

    // If no tags available, nothing to recommend yet
    if (tagSet.size === 0) {
      return res.json({ recommendations: [] });
    }

    // 3. Fetch other products not in cart
    const otherProducts = await Item.find({ productId: { $nin: cartProductIds } });

    // 4. Compute scores
    const scored = otherProducts
      .map((p) => {
        const shared = (p.tags || []).filter((t) => tagSet.has(t));
        const score = p.tags && p.tags.length > 0 ? shared.length / p.tags.length : 0;
        return { product: p, score };
      })
      .filter((s) => s.score > 0) // keep only relevant
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit));

    const recommendations = scored.map(({ product, score }) => ({
      productId: product.productId,
      name: product.name,
      price: product.price,
      weight: product.weight,
      image: product.image,
      tags: product.tags,
      score,
    }));

    res.json({ recommendations });
  } catch (err) {
    console.error("Error generating recommendations", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router; 