const express = require("express");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const { addTagToCart } = require("../services/rfidReaderService");

// In-memory storage for recent tag reads (last 50)
const recentTagReads = [];
const MAX_RECENT_TAGS = 50;

/**
 * Add a tag read to the recent tags history
 * @param {Object} tagRead - Tag read object with epc, timestamp, cartId
 */
function addRecentTagRead(tagRead) {
  recentTagReads.unshift(tagRead);
  if (recentTagReads.length > MAX_RECENT_TAGS) {
    recentTagReads.pop();
  }
}

/**
 * Create RFID routes with Socket.IO instance
 * @param {Object} io - Socket.IO instance
 * @returns {express.Router} - Express router
 */
function createRFIDRoutes(io) {
  const router = express.Router();

/**
 * GET /api/rfid/status
 * Returns RFID service connection status and configuration
 */
router.get("/status", (req, res) => {
  const rfidEnabled = process.env.RFID_ENABLED === "true";
  const readerHost = process.env.RFID_READER_HOST || "192.168.0.143";
  const cartId = process.env.RFID_CART_ID || "1234";

  res.json({
    connected: rfidEnabled,
    readerHost: readerHost,
    cartId: cartId
  });
});

/**
 * GET /api/rfid/recent-tags
 * Returns array of recent tag reads (last 50)
 */
router.get("/recent-tags", (req, res) => {
  res.json(recentTagReads);
});

/**
 * POST /api/rfid/test-tag
 * Manually trigger a tag read for testing without hardware
 */
router.post("/test-tag", async (req, res) => {
  try {
    const { epc, cartId } = req.body;

    if (!epc || !cartId) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: epc and cartId" 
      });
    }

    // Call addTagToCart directly for testing
    await addTagToCart(epc, cartId, io);

    // Fetch updated cart
    const cart = await Cart.findOne({ cartId });

    // Add to recent tags
    addRecentTagRead({
      epc: epc,
      timestamp: new Date().toISOString(),
      cartId: cartId
    });

    res.json({
      success: true,
      cart: cart
    });
  } catch (err) {
    console.error("[RFID] Error in test-tag endpoint:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

  return router;
}

module.exports = createRFIDRoutes;
module.exports.addRecentTagRead = addRecentTagRead;
