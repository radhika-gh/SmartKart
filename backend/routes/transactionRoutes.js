const express = require("express");
const Transaction = require("backend/models/Transaction");
const Cart = require("../models/Cart");
const router = express.Router();

// Checkout and create a transaction
router.post("/checkout", async (req, res) => {
  try {
    const { cartId, paymentMethod } = req.body;

    // Find the cart based on cartId
    const cart = await Cart.findOne({ cartId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Create a transaction from cart data
    const newTransaction = new Transaction({
      cartId: cart.cartId,
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalWeight: cart.totalWeight,
      paymentMethod,
      paymentStatus: "Completed",
    });

    await newTransaction.save();

    // Reset the cart (remove all items and set total values to 0)
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalWeight = 0;
    cart.active =false;
    await cart.save();

    res.status(201).json({ message: "Transaction completed, cart reset", newTransaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get transaction by cartId
router.get("/:cartId", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ cartId: req.params.cartId });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
