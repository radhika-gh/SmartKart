import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/cart.css"; // ✅ Importing the stylish CSS
import ShoppingChecklist from "../components/ShoppingChecklist";

const BACKEND_URL = "http://localhost:8001";
const socket = io(BACKEND_URL);

const CartPage = () => {
  const { cartId } = useParams();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [isChecklistVisible, setChecklistVisible] = useState(false);
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

    // ✅ Listen for real-time cart updates (ignore duplicates)
    socket.on("updateCart", (updatedCart) => {
      if (updatedCart.cartId !== cartId) return;

      setCart((prev) => {
        if (!prev) return updatedCart;

        const prevKey = prev.items
          .map((i) => `${i.productId}:${i.quantity}`)
          .sort()
          .join(",");
        const newKey = updatedCart.items
          .map((i) => `${i.productId}:${i.quantity}`)
          .sort()
          .join(",");

        return prevKey === newKey ? prev : updatedCart;
      });
    });

    return () => {
      socket.off("updateCart"); // Cleanup listener
    };
  }, [cartId]);

  useEffect(() => {
    console.log("🚀 Updated Cart Data:", cart);
  }, [cart]);

  // Memoize a key representing the current items/quantities in cart
  const itemsKey = React.useMemo(() => {
    if (!cart) return "";
    return cart.items
      .map((i) => `${i.productId}:${i.quantity}`)
      .sort()
      .join(",");
  }, [cart]);

  useEffect(() => {
    if (!cart || !itemsKey) return;

    const fetchRecommendations = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/recommendations`, {
          params: { cartId: cart.cartId, limit: 4 },
        });
        setRecommended((prev) => {
          const prevIds = prev.map((r) => r.productId).join(",");
          const newIds = (response.data.recommendations || [])
            .map((r) => r.productId)
            .join(",");
          return prevIds === newIds ? prev : response.data.recommendations;
        });
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      }
    };

    fetchRecommendations();
  }, [itemsKey, cart]);

  // ✅ Handle Checkout (Navigate to Payment Page)
  const handleCheckout = () => {
    navigate(`/payment/${cartId}`);
  };

  const toggleChecklist = () => {
    setChecklistVisible(!isChecklistVisible);
  };

  if (loading) return <p>Loading cart...</p>;
  if (!cart) return <p>No cart found.</p>;

  return (
    <div className="cart-container">
      <div className="cart-items">
        <h1>Shopping Cart</h1>
        {/* Cart Items List */}
        <div className="cart-item-list">
          {cart.items.map((item) => {
            const isExpired = new Date(item.expiryDate) < new Date();
            return (
              <div
                key={item.productId}
                className={`cart-item-card ${isExpired ? "expired-row" : ""}`}
              >
                <div className="item-image-wrapper">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="product-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/image1.jpg";
                    }}
                  />
                </div>
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  {isExpired && <span className="expired-tag"> (Expired)</span>}
                  {/* Category / sub-text could be displayed here if available */}
                </div>
                <div className="item-qty">Qty: {item.quantity}</div>
                <div className="item-price">₹{item.price * item.quantity}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💰 Total Bill & Checkout Section */}
      <div className="cart-summary">
        <h2>Order Summary</h2>
        <p className="summary-row">
          <span>Subtotal ({cart.items.length} items)</span>
          <span>₹{cart.totalPrice}</span>
        </p>
        {/* Tax row intentionally omitted as per requirements */}
        <p className="summary-total">
          <span>Total</span>
          <span>₹{cart.totalPrice}</span>
        </p>
        <button
          onClick={handleCheckout}
          disabled={cart.items.length === 0}
          className={`checkout-btn ${
            cart.items.length === 0 ? "disabled" : ""
          }`}
        >
          Buy Now - ₹{cart.totalPrice}
        </button>

        {/* 🔮 Recommendations */}
        {recommended.length > 0 && (
          <div className="recommendations-container">
            <h3 style={{ marginTop: "30px" }}>You might also like</h3>
            <div className="recommendations-list">
              {recommended.map((rec) => (
                <div key={rec.productId} className="recommendation-card">
                  <img
                    src={rec.image || "https://via.placeholder.com/100"}
                    alt={rec.name}
                    className="recommendation-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/image1.jpg";
                    }}
                  />
                  <span className="recommendation-name">{rec.name}</span>
                  <span className="recommendation-price">₹{rec.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Checklist Toggle Button */}
      <button className="checklist-toggle-btn" onClick={toggleChecklist}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </button>

      {/* Shopping Checklist Panel */}
      <ShoppingChecklist
        isVisible={isChecklistVisible}
        onClose={toggleChecklist}
      />
    </div>
  );
};

export default CartPage;
