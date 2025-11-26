require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const axios = require("axios"); 
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

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// Start server
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));





io.on("connection", (socket) => {
  console.log("Microcontroller Connected:", socket.id);

  socket.on("rfid_scan", async (data) => {
    console.log("Received RFID Scan:", data);

    try {
      // Send the scanned product to the existing API route
      const response = await axios.post("http://localhost:8001/api/shop/scan", data);

      console.log("API Response:", response.data);

      // Fetch updated cart and emit to frontend
      const cartResponse = await axios.get(`http://localhost:8001/api/shop/${data.cartId}`);
      io.emit("updateCart", cartResponse.data);
    } catch (err) {
      console.error("Error updating cart:", err.response ? err.response.data : err.message);
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