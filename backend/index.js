require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB FIRST, then set up Socket.IO handlers
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected");
    
    // Only set up Socket.IO handlers AFTER MongoDB is ready
    setupSocketHandlers();
  })
  .catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });


// Start server
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


function setupSocketHandlers() {
  // Backend-side cooldown cache to prevent rapid toggle behavior
  // Maps "cartId:tagId" to last action timestamp
  const rfidCooldownCache = new Map();
  const COOLDOWN_MS = 5000; // 5 seconds cooldown on backend
  
  io.on("connection", (socket) => {
  console.log("Microcontroller Connected:", socket.id);

  socket.on("rfid_scan", async (data) => {
    try {
      // Subtask 3.1: Extract and validate event payload
      const { cartId, tagId, timestamp } = data;
      
      if (!cartId || !tagId) {
        console.warn("[RFID] Missing required data: cartId or tagId");
        socket.emit("error", { message: "Missing cartId or tagId" });
        return;
      }
      
      console.log(`[RFID] Received scan - Cart: ${cartId}, Tag: ${tagId}`);
      
      // Check backend cooldown to prevent rapid toggles
      const cacheKey = `${cartId}:${tagId}`;
      const now = Date.now();
      const lastScan = rfidCooldownCache.get(cacheKey);
      
      if (lastScan && (now - lastScan) < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - (now - lastScan);
        console.log(`[RFID] ⏱️  Cooldown active for ${tagId} (${(remainingMs/1000).toFixed(1)}s remaining)`);
        return; // Silently ignore - still in cooldown
      }
      
      // Update cooldown cache
      rfidCooldownCache.set(cacheKey, now);
      
      // Periodic cleanup of old cache entries (every 100 scans)
      if (rfidCooldownCache.size > 100) {
        const cutoff = now - COOLDOWN_MS;
        for (const [key, time] of rfidCooldownCache.entries()) {
          if (time < cutoff) {
            rfidCooldownCache.delete(key);
          }
        }
      }
      
      // Load models
      const Cart = require("./models/Cart");
      const Item = require("./models/CartItem");
      
      // Find cart
      const cart = await Cart.findOne({ cartId });
      if (!cart) {
        console.warn(`[RFID] Cart ${cartId} not found`);
        socket.emit("error", { message: "Cart not found" });
        return;
      }
      
      // Subtask 3.2: Product lookup by RFID tag
      const product = await Item.findOne({ rfidTag: tagId });
      if (!product) {
        console.warn(`[RFID] Unknown tag: ${tagId}`);
        io.emit("unknownTag", { cartId, tagId, timestamp: timestamp || new Date().toISOString() });
        return;
      }
      
      // Subtask 3.3: Toggle logic for add/remove
      const existingItemIndex = cart.items.findIndex(item => 
        item.productId === product.productId
      );
      
      let action;
      
      if (existingItemIndex !== -1) {
        // ===== REMOVE LOGIC =====
        cart.items.splice(existingItemIndex, 1);
        action = 'remove';
        console.log(`[RFID] 🗑️  REMOVED ${product.name} from cart ${cartId}`);
      } else {
        // ===== ADD LOGIC =====
        cart.items.push({
          productId: product.productId,
          name: product.name,
          price: product.price,
          weight: product.weight,
          expiryDate: product.expiryDate,
          quantity: 1,
          image: product.image || "https://via.placeholder.com/150",
          addedAt: new Date()
        });
        action = 'add';
        console.log(`[RFID] ✅ ADDED ${product.name} to cart ${cartId}`);
      }
      
      // Subtask 3.4: Update cart totals
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity, 
        0
      );
      cart.totalWeight = cart.items.reduce(
        (sum, item) => sum + item.weight * item.quantity, 
        0
      );
      
      await cart.save();
      
      // Subtask 3.5: Emit cart updates to frontend
      io.emit("updateCart", {
        ...cart.toObject(),
        action: action,
        affectedProduct: product.name
      });
      
    } catch (err) {
      console.error("[RFID] Error processing scan:", err.message);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("weight_update", async (data) => {
    try {
      const { cartId, measuredWeight, timestamp } = data;
      
      // Query Cart by cartId with error handling
      const Cart = require("./models/Cart");
      const cart = await Cart.findOne({ cartId });
      
      if (!cart) {
        console.warn(`[Weight] Cart ${cartId} not found`);
        return;
      }
      
      // Update cart.measuredWeight with received value
      cart.measuredWeight = measuredWeight;
      
      // Calculate weight difference between measuredWeight and totalWeight
      const expectedWeight = cart.totalWeight || 0;
      const weightDiff = Math.abs(measuredWeight - expectedWeight);
      
      // Set cart.weightDiscrepancy to true if difference exceeds 0.5kg
      cart.weightDiscrepancy = weightDiff > 0.5;
      
      // Update cart.lastWeightUpdate with current timestamp
      cart.lastWeightUpdate = new Date();
      
      // Save cart to database
      await cart.save();
      
      // Emit weightUpdate event to frontend with all weight data
      io.emit("weightUpdate", {
        cartId,
        measuredWeight,
        expectedWeight,
        discrepancy: cart.weightDiscrepancy,
        timestamp: timestamp || new Date().toISOString()
      });
      
      // Add logging for weight updates and discrepancies
      if (cart.weightDiscrepancy) {
        console.log(`[Weight] ⚠️  DISCREPANCY DETECTED - Cart ${cartId}: measured=${measuredWeight}kg, expected=${expectedWeight}kg, diff=${weightDiff.toFixed(2)}kg`);
      } else {
        console.log(`[Weight] Cart ${cartId}: measured=${measuredWeight}kg, expected=${expectedWeight}kg`);
      }
    } catch (err) {
      console.error("[Weight] Error processing weight update:", err.message);
    }
  });
  });
}


const transactionRoutes = require("./routes/transactionRoutes");
app.use("/api/transactions", transactionRoutes);

const cartRoutes = require("./routes/cartRoutes"); 
app.use("/api/admin", cartRoutes); 

const itemRoutes = require("./routes/itemRoutes");
app.use("/api/item", itemRoutes);

// 🔮 Recommendation routes
const recommendationRoutes = require("./routes/recommendationRoutes");
app.use("/api/recommendations", recommendationRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/shop", userRoutes);

const createRFIDRoutes = require("./routes/rfidRoutes");
app.use("/api/rfid", createRFIDRoutes(io));

// ============================================================================
// OPTIONAL: RFID Hardware Integration
// ============================================================================
// Uncomment the lines below to enable direct Impinj R420 RFID reader integration.
// This will start the RFID service that connects to the hardware reader via LLRP.
//
// Prerequisites:
// 1. Set RFID_ENABLED=true in your .env file
// 2. Configure RFID_READER_HOST with your R420 reader's IP address
// 3. Configure RFID_CART_ID with the cart ID to associate with this reader
// 4. Ensure the R420 reader is powered on and accessible on the network
// 5. Ensure ROSpecs are configured on the reader via the Impinj web interface
//
// Example .env configuration:
//   RFID_ENABLED=true
//   RFID_READER_HOST=192.168.0.143
//   RFID_CART_ID=1234
//
// Once enabled, the RFID service will:
// - Connect to the R420 reader via LLRP protocol
// - Automatically add items to the cart when RFID tags are detected
// - Emit real-time updates to the /rfid-monitor page
//
// To enable, uncomment these two lines:
// const { initializeRFID } = require("./initRFID");
// initializeRFID(io);