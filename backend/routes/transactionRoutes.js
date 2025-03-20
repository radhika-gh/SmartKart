const express = require("express");
const Transaction = require("../models/Transaction");
const Cart = require("../models/Cart");
const router = express.Router();

// Checkout and create a transaction
// Process Payment
router.post("/checkout", async (req, res) => {
  try {
    const { cartId, paymentMethod } = req.body;

    // Find the cart
    const cart = await Cart.findOne({ cartId });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    // Simulate payment processing (In real projects, integrate a payment gateway)
    console.log(`Processing payment for Cart ID: ${cartId} with ${paymentMethod}`);

    // Create a new transaction
    const transaction = new Transaction({
      cartId: cart.cartId,
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalWeight: cart.totalWeight,
      paymentMethod,
      paymentStatus: "Completed",
    });

    await transaction.save();

    // Clear cart after successful payment
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalWeight = 0;
    cart.active = false;
    await cart.save();

    res.status(200).json({ message: "Payment successful", transaction });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ error: "Payment processing failed." });
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
