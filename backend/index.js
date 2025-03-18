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



const userRoutes = require("./routes/userRoutes");
app.use("/api/shop", userRoutes);
io.on("connection", (socket) => {
  console.log("Microcontroller Connected:", socket.id);

  socket.on("rfid_scan", async (data) => {
    console.log("Received RFID Scan:", data);

    try {
      // Send the scanned product to the existing API route
      const response = await axios.post("http://localhost:8001/api/shop/add", data);

      console.log("API Response:", response.data);

      // Fetch updated cart and emit to frontend
      const cartResponse = await axios.get(`http://localhost:8001/api/shop/${data.cartId}`);
      io.emit("updateCart", cartResponse.data);
    } catch (err) {
      console.error("Error updating cart:", err.response ? err.response.data : err.message);
    }
  });
});


const transactionRoutes = require("./routes/transactionRoutes");
app.use("/api/transactions", transactionRoutes);

const cartRoutes = require("./routes/cartRoutes"); 
app.use("/api/cart", cartRoutes); 

const itemRoutes = require("./routes/itemRoutes");
app.use("/api/item", itemRoutes);