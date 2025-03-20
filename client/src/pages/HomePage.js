import React, { useState } from "react";
import axios from "axios";
import "../styles/homepage.css";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const [cartId, setCartId] = useState("");
  const navigate = useNavigate();

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
            <button onClick={handleCartSubmit}>Claim Cart</button>
        </div>
    </div>
);
};

export default HomePage;
