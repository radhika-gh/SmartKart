import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/homepage.css";
import { useNavigate } from "react-router-dom";

const imagesChanging = [
  `${process.env.PUBLIC_URL}/images/image1.jpg`,
  `${process.env.PUBLIC_URL}/images/image2.jpg`,
  `${process.env.PUBLIC_URL}/images/image3.jpg`,
];

const HomePage = () => {
  const [cartId, setCartId] = useState("");
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % imagesChanging.length);
    }, 3000); 

    return () => clearInterval(interval);
  }, []);

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
        error.response ? error.response.data : error.message
      );
      alert(error.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <div className="background-container">
      {/* Four Quadrants */}
      <div className="quadrant top-left">
        {imagesChanging.map((img, index) => (
          <img
            key={index}
            src={img}
            className={`bg-image ${index === currentIndex ? "active" : ""}`}
            alt={`top-left-${index}`}
          />
        ))}
      </div>

      <div className="quadrant top-right">
        <img
          src={`${process.env.PUBLIC_URL}/images/image4.jpg`}
          className="bg-image active"
          alt="top-right"
        />
      </div>

      <div className="quadrant bottom-left">
        <img
          src={`${process.env.PUBLIC_URL}/images/image5.jpg`}
          className="bg-image active"
          alt="bottom-left"
        />
      </div>

      <div className="quadrant bottom-right">
        {imagesChanging.map((img, index) => (
          <img
            key={index}
            src={img}
            className={`bg-image ${index === currentIndex ? "active" : ""}`}
            alt={`bottom-right-${index}`}
          />
        ))}
      </div>

      {/* Input Box Section */}
      <div className="container">
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
    </div>
  );
};

export default HomePage;
