const express = require("express");
const Transaction = require("../models/Transaction");
const Cart = require("../models/Cart");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();
const { createOrder } = require("../controllers/payment.js");
// ✅ Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


router.post("/create-order", async (req, res) => {
  try {
    console.log("📢 Received request to create order for Cart ID:", req.body.cartId);
    
    const { cartId } = req.body;
    const cart = await Cart.findOne({ cartId });
    console.log("🔍 Searching for Cart with ID:", cartId);

    if (!cart) {
      console.log("❌ Cart not found for:", cartId);
      return res.status(404).json({ error: "Cart not found" });
    }

    console.log("✅ Cart found:", cart);

    // ✅ Create order in Razorpay
    const options = {
      amount: cart.totalPrice * 100, // Convert to paise
      currency: "INR",
      receipt: `order_rcptid_${cartId}`,
      payment_capture: 1,
    };

    console.log("🔄 Creating order in Razorpay...");
    const order = await razorpay.orders.create(options);

    console.log("✅ Order created successfully:", order);

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      cartId,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});


/** 🔄 **Step 2: Verify Razorpay Payment Signature** */
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cartId, paymentMethod } = req.body;

    const cart = await Cart.findOne({ cartId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    if (paymentMethod === "Razorpay") {
      // ✅ Razorpay Payment Verification
      const generatedSignature = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update(razorpay_order_id + "|" + razorpay_payment_id)
  .digest("hex");


      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      console.log("✅ Razorpay payment verified");
    } else if (paymentMethod === "Cash") {
      // ✅ Directly process cash payments (No verification needed)
      console.log("💰 Cash payment received, processing transaction...");
    } else {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // ✅ Create a transaction entry
    const transaction = new Transaction({
      cartId: cart.cartId,
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalWeight: cart.totalWeight,
      paymentMethod,
      paymentStatus: "Completed",
      paymentId: paymentMethod === "Razorpay" ? razorpay_payment_id : null,
    });

    await transaction.save();

    // ✅ Clear the cart after successful payment
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalWeight = 0;
    cart.active = false;
    await cart.save();

    res.status(200).json({ success: true, message: "Payment processed successfully!" });

  } catch (error) {
    console.error("❌ Payment processing failed:", error);
    res.status(500).json({ error: "Payment processing failed." });
  }
});


module.exports = router;
