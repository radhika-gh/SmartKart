const express = require("express");
const Transaction = require("../models/Transaction");
const CartItem = require("../models/CartItem");
const router = express.Router();

// Checkout and create a transaction
router.post("/checkout", async (req, res) => {
  try {
    const { cartId, items, totalAmount, totalWeight, paymentMethod } = req.body;

    const newTransaction = new Transaction({
      cartId,
      items,
      totalAmount,
      totalWeight,
      paymentMethod,
      paymentStatus: "Completed",
    });

    await newTransaction.save();

    // Reset cart after successful payment
    await CartItem.deleteMany({});

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

module.exports = router;
