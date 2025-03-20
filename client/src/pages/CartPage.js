import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/cart.css"; // ✅ Importing the stylish CSS

const BACKEND_URL = "http://localhost:8001";
const socket = io(BACKEND_URL);

const CartPage = () => {
  const { cartId } = useParams();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Fetch cart details when the page loads
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/shop/${cartId}`);
        setCart(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching cart:", error);
        setLoading(false);
      }
    };

    fetchCart();

    // ✅ Listen for real-time cart updates
    socket.on("updateCart", (updatedCart) => {
      if (updatedCart.cartId === cartId) {
        setCart(updatedCart);
      }
    });

    return () => {
      socket.off("updateCart"); // Cleanup listener
    };
  }, [cartId]);

  useEffect(() => {
    console.log("🚀 Updated Cart Data:", cart);
  }, [cart]);

  // ✅ Handle Checkout (Navigate to Payment Page)
  const handleCheckout = () => {
    navigate(`/payment/${cartId}`);
  };

  if (loading) return <p>Loading cart...</p>;
  if (!cart) return <p>No cart found.</p>;

  return (
    <div className="cart-container">
      <div className="cart-items">
        <h1>Shopping Cart</h1>
        <h2>Cart ID: {cart.cartId}</h2>

        <table className="cart-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => {
              console.log("🖼️ Image URL:", item.image);

              const isExpired = new Date(item.expiryDate) < new Date();

              return (
                <tr
                  key={item.productId}
                  className={isExpired ? "expired-row" : ""}
                >
                  <td className="product-info">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="product-image"
                      style={{
                        width: "auto",
                        maxWidth: "100px",
                        height: "auto",
                        maxHeight: "100px",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/100";
                      }}
                    />
                    <span>{item.name}</span>
                  </td>
                  <td>{item.quantity}</td>
                  <td>₹{item.price * item.quantity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 💰 Total Bill & Checkout Section */}
      <div className="cart-summary">
        <h2>Total Bill</h2>
        <p>
          <strong>Price:</strong> ₹{cart.totalPrice}
        </p>
        <button
          onClick={handleCheckout}
          disabled={cart.items.length === 0}
          className={`checkout-btn ${
            cart.items.length === 0 ? "disabled" : ""
          }`}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default CartPage;
