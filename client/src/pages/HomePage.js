import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/homepage.css";
import { useNavigate } from "react-router-dom";

const images = [
  `${process.env.PUBLIC_URL}/images/image1.jpg`,
  `${process.env.PUBLIC_URL}/images/image2.jpg`,
  `${process.env.PUBLIC_URL}/images/image3.jpg`,
];

const HomePage = () => {
  const [cartId, setCartId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Slideshow Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cart Claim Logic
  const handleCartSubmit = async () => {
    try {
      const response = await axios.post(
        "http://localhost:8001/api/shop/claim",
        { cartId },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Cart Claimed:", response.data);
      alert("✅ Cart Claimed Successfully!");
      navigate(`/cart/${cartId}`);
    } catch (error) {
      console.error(
        "Error fetching cart:",
        error?.response?.data || error.message
      );
      alert(error.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <div className="homepage">
      {/* ---------- Hero Section ---------- */}
      <section className="hero-section">
        {/* Left Column */}
        <div className="hero-left">
          <h1>Welcome to SmartKart</h1>
          <p>Enter your cart ID to start shopping.</p>
          <div className="input-container">
            <input
              type="text"
              placeholder="Enter Cart ID"
              value={cartId}
              onChange={(e) => setCartId(e.target.value)}
            />
            <button onClick={handleCartSubmit}>Claim</button>
          </div>
        </div>

        {/* Right Column (Slideshow) */}
        <div className="hero-right">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`slide-${index}`}
              className={`slide-image ${
                index === currentIndex ? "active" : ""
              }`}
            />
          ))}
        </div>
      </section>

      {/* ---------- Popular Section ---------- */}
      <section className="popular-section">
        <h2>Popular right now</h2>
        <div className="popular-items">
          {/* Replace these sample images with your actual items */}
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop1.jpg`}
              alt="Avocado"
            />
            <p>Avocado</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop2.jpg`}
              alt="Beetroot"
            />
            <p>Beetroot</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop3.jpg`}
              alt="Broccoli"
            />
            <p>Broccoli</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop4.jpg`}
              alt="Cabbage"
            />
            <p>Cabbage</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop5.jpg`}
              alt="Cabbage"
            />
            <p>Cabbage</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop6.jpg`}
              alt="Cabbage"
            />
            <p>Cabbage</p>
          </div>
          <div className="item-card">
            <img
              src={`${process.env.PUBLIC_URL}/images/pop7.jpg`}
              alt="Cabbage"
            />
            <p>Cabbage</p>
          </div>
          {/* ...Add as many as you want */}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
