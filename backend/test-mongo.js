require("dotenv").config();
const mongoose = require("mongoose");

console.log("Testing MongoDB connection...");
console.log("URI:", process.env.MONGO_URI.replace(/:[^:]*@/, ':****@')); // Hide password

mongoose
  .connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // 5 second timeout
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });
