import React, { useState } from "react";
import axios from "../api/api";

const CartInput = ({ onCartSubmit }) => {
  const [cartId, setCartId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cartId) return alert("Please enter a Cart ID!");

    try {
      const response = await axios.get(`/cart/${cartId}`);
      console.log("Cart Data:", response.data);
      onCartSubmit(response.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
      alert("Invalid Cart ID or Cart not found");
    }
  };

  return (
    <div className="cart-input-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Cart ID"
          value={cartId}
          onChange={(e) => setCartId(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default CartInput;
