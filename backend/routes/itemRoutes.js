const express = require("express");
const CartItem = require("../models/CartItem");
const router = express.Router();
const cloudinary = require("../cloudinaryConfig.js");
const multer = require("multer");

// ✅ Configure Multer to handle image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Add an item with image upload
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { productId, name, price, weight, expiryDate } = req.body;

    let imageUrl = "";

    if (req.file) {
      // ✅ Upload image to Cloudinary
      const result = await cloudinary.uploader.upload_stream(
        { folder: "smartkart" }, // Store in Cloudinary folder
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: "Image upload failed" });
          }

          imageUrl = result.secure_url;

          // ✅ Create new item with image URL
          const newItem = new CartItem({
            productId,
            name,
            price,
            weight,
            expiryDate,
            image: imageUrl, // ✅ Save image URL in DB
          });

          await newItem.save();
          res.status(201).json({ message: "Item added successfully", newItem });
        }
      ).end(req.file.buffer);
    } else {
      // ✅ If no image, save item without image URL
      const newItem = new CartItem({
        productId,
        name,
        price,
        weight,
        expiryDate,
        image: imageUrl,
      });

      await newItem.save();
      res.status(201).json({ message: "Item added successfully (No Image)", newItem });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all items
router.get("/", async (req, res) => {
  try {
    const items = await CartItem.find();
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Remove item by ID
router.delete("/remove/:id", async (req, res) => {
  try {
    await CartItem.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Item removed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
