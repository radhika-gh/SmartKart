const { LLRPClient } = require("llrpjs");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");

// Tag debounce mechanism - tracks EPC timestamps to prevent duplicate additions
const recentTags = new Map();
const TAG_COOLDOWN_MS = 1000;

/**
 * Check if a tag should be processed based on debounce logic
 * @param {string} epc - Electronic Product Code from RFID tag
 * @returns {boolean} - True if tag should be processed, false if within cooldown period
 */
function shouldProcessTag(epc) {
  const now = Date.now();
  if (recentTags.has(epc) && now - recentTags.get(epc) < TAG_COOLDOWN_MS) {
    return false; // Skip duplicate - within cooldown period
  }
  recentTags.set(epc, now);
  return true;
}

/**
 * Query product catalog by productId (EPC matches productId)
 * @param {string} productId - Product identifier matching EPC
 * @returns {Promise<Object>} - Product details
 * @throws {Error} - If product not found
 */
async function getProductById(productId) {
  const product = await CartItem.findOne({ productId });
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  return {
    productId: product.productId,
    name: product.name,
    price: product.price,
    weight: product.weight,
    expiryDate: product.expiryDate,
    image: product.image,
    tags: product.tags
  };
}

/**
 * Add RFID tag to cart with debouncing and quantity management
 * @param {string} epc - Electronic Product Code
 * @param {string} cartId - Cart identifier
 * @param {Object} io - Socket.IO instance for event emission
 */
async function addTagToCart(epc, cartId, io) {
  // 1. Debounce check
  if (!shouldProcessTag(epc)) {
    return;
  }

  try {
    // 2. Find cart
    const cart = await Cart.findOne({ cartId });
    if (!cart) {
      console.warn(`[RFID] Cart ${cartId} not found`);
      return;
    }

    // 3. Get product details
    const product = await getProductById(epc);

    // 4. Check if item exists in cart
    const existingItem = cart.items.find(item => item.productId === epc);

    if (existingItem) {
      // Increment quantity
      existingItem.quantity += 1;
    } else {
      // Add new item
      cart.items.push({
        productId: product.productId,
        name: product.name,
        price: product.price,
        weight: product.weight,
        expiryDate: product.expiryDate,
        quantity: 1,
        image: product.image || ""
      });
    }

    // 5. Recalculate totals
    cart.totalPrice = cart.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0);
    cart.totalWeight = cart.items.reduce((sum, item) => 
      sum + (item.weight * item.quantity), 0);

    cart.active = true;

    // 6. Save to database
    await cart.save();

    const timestamp = new Date().toISOString();

    // 7. Emit Socket.IO event for RFID monitor page
    io.emit("rfidUpdate", {
      epc: epc,
      cartId: cartId,
      cart: cart,
      timestamp: timestamp
    });

    // 8. Add to recent tags history
    const { addRecentTagRead } = require("../routes/rfidRoutes");
    addRecentTagRead({
      epc: epc,
      timestamp: timestamp,
      cartId: cartId
    });

    console.log(`[RFID] Tag seen: ${epc} for cart ${cartId}`);
    console.log(`[RFID] Cart ${cartId} updated: ${cart.items.length} items, ₹${cart.totalPrice}, ${cart.totalWeight}kg`);
  } catch (err) {
    if (err.message.includes("Product not found")) {
      console.warn(`[RFID] Product not found for EPC: ${epc}`);
    } else {
      console.error(`[RFID] Error adding tag to cart:`, err.message);
    }
  }
}

/**
 * Initialize and start RFID reader connection
 * @param {Object} config - Configuration object
 * @param {string} config.readerHost - IP address of R420 reader
 * @param {string} config.cartId - Associated cart identifier
 * @param {Object} config.io - Socket.IO instance
 */
function startRFIDReader({ readerHost, cartId, io }) {
  console.log(`[RFID] Starting RFID Reader Service for cart ${cartId}`);
  console.log(`[RFID] Connecting to reader at ${readerHost}`);

  // Set up LLRP client
  const reader = new LLRPClient();

  // Connection event handler
  reader.on("connect", () => {
    console.log(`[RFID] Connected to reader: ${readerHost}`);
  });

  // Disconnect event handler
  reader.on("disconnect", () => {
    console.log(`[RFID] Disconnected from reader: ${readerHost}`);
  });

  // Error event handler
  reader.on("error", (err) => {
    console.error(`[RFID] Reader error:`, err.message);
  });

  // RO_ACCESS_REPORT handler - processes tag reads
  reader.on("RO_ACCESS_REPORT", async (msg) => {
    try {
      // Extract tag report data and normalize to array
      let tagReportDataList = msg.getTagReportData();
      if (!Array.isArray(tagReportDataList)) {
        tagReportDataList = [tagReportDataList];
      }

      // Loop through tag reports and extract EPC from each
      for (const tagReportData of tagReportDataList) {
        const epcParam = tagReportData.getEPCParameter();
        if (!epcParam) {
          console.warn("[RFID] Tag report missing EPC parameter");
          continue;
        }

        const epc = epcParam.getEPC();
        if (epc) {
          await addTagToCart(epc, cartId, io);
        }
      }
    } catch (err) {
      console.error("[RFID] Error processing tag report:", err.message);
    }
  });

  // Connect to reader
  reader.connect(readerHost);
}

module.exports = {
  startRFIDReader,
  shouldProcessTag,
  getProductById,
  addTagToCart
};
