import React, { useState } from "react";
import "../styles/CartInput.css"


const CartInput = ({ onCartSubmit }) => {
  const [cartId, setCartId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cartId.trim()) {
      alert("Please enter a valid Cart ID!");
      return;
    }
    onCartSubmit(cartId);
    setCartId(""); // Clear input after submission
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
