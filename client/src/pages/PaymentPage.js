import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/payment.css";

const BACKEND_URL = "http://localhost:8001";

const PaymentPage = () => {
  const { cartId } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Card"); // Default payment method

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/shop/${cartId}`);
        setCart(response.data);
      } catch (error) {
        console.error("Error fetching cart:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, [cartId]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/transactions/checkout`, {
        cartId,
        paymentMethod,
      });

      alert("✅ Payment Successful!");
      navigate("/"); // Redirect to Home Page
    } catch (error) {
      console.error("Payment failed:", error);
      alert("❌ Payment failed. Try again!");
    }
    setProcessing(false);
  };

  if (loading) return <p>Loading payment details...</p>;
  if (!cart) return <p>Cart not found.</p>;

  return (
    <div className="payment-container">
      <h1>Payment</h1>
      <h2>Cart ID: {cart.cartId}</h2>
      <p><strong>Total Price:</strong> ₹{cart.totalPrice}</p>

      <div className="payment-method">
        <label>Select Payment Method:</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="Card">Credit/Debit Card</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
        </select>
      </div>

      <button className="pay-button" onClick={handlePayment} disabled={processing}>
        {processing ? "Processing..." : "Pay Now"}
      </button>
    </div>
  );
};

export default PaymentPage;
