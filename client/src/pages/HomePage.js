import React, { useState } from "react";
import "../styles/homepage.css"; // Importing the CSS file

const HomePage = () => {
    const [cartId, setCartId] = useState("");

    const handleClaimCart = () => {
        if (cartId.trim() === "") {
            alert("Please enter a Cart ID.");
            return;
        }
        console.log("Cart claimed with ID:", cartId);
        // Navigate to cart page (implement routing logic)
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
                <button onClick={handleClaimCart}>Claim Cart</button>
            </div>
        </div>
    );
};

export default HomePage;
