import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom"; // ✅ Import useParams

const BACKEND_URL = "http://localhost:8001";
const socket = io(BACKEND_URL);

const CartPage = () => {
  const { cartId } = useParams(); // ✅ Extract cartId from URL
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

  // ✅ Handle Checkout (Navigate to Payment Page)
  const handleCheckout = () => {
    navigate(`/payment/${cartId}`);
  };

  if (loading) return <p>Loading cart...</p>;
  if (!cart) return <p>No cart found.</p>;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "20px" }}>
      {/* 🛒 Cart Items Section */}
      <div style={{ width: "60%" }}>
        <h1>Shopping Cart</h1>
        <h2>Cart ID: {cart.cartId}</h2>

        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price * item.quantity}</td>
                <td>{item.weight * item.quantity} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 💰 Total Bill & Checkout Section */}
      <div style={{ width: "30%", border: "1px solid #ddd", padding: "15px", textAlign: "center" }}>
        <h2>Total Bill</h2>
        <p><strong>Price:</strong> ₹{cart.totalPrice}</p>
        <p><strong>Weight:</strong> {cart.totalWeight} kg</p>
        <button onClick={handleCheckout} style={{ padding: "10px", fontSize: "16px", cursor: "pointer" }}>
          Buy Now
        </button>
      </div>
    </div>
  );
};

export default CartPage;
