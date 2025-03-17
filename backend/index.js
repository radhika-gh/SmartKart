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

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// WebSocket connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));



const userRoutes = require("./routes/userRoutes");
app.use("/api/cart", userRoutes);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("cartUpdated", async () => {
    const items = await CartItem.find();
    io.emit("updateCart", items);
  });
});

const transactionRoutes = require("./routes/transactionRoutes");
app.use("/api/transactions", transactionRoutes);

const cartRoutes = require("./routes/cartRoutes"); 
app.use("/api/cart", cartRoutes); 

