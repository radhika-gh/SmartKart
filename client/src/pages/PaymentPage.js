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
  const [paymentMethod, setPaymentMethod] = useState("Razorpay"); // ✅ Fixing the missing state

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
    try {
      // ✅ Load Razorpay dynamically if not available
      if (!window.Razorpay) {
        alert("Razorpay SDK failed to load. Check your network connection.");
        return;
      }
  
      // ✅ Create order in backend
      const { data } = await axios.post(`${BACKEND_URL}/api/transactions/create-order`, { cartId });
  
      // ✅ Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_ID_KEY, // ✅ Use environment variable
        amount: data.amount,
        currency: data.currency,
        name: "SmartKart",
        description: "Complete Your Payment",
        order_id: data.orderId,
        handler: async function (response) {
          try {
            await axios.post(`${BACKEND_URL}/api/transactions/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              cartId,
              paymentMethod: "Razorpay",
            });
            
        
  
            alert("✅ Payment Successful!");
            navigate("/");
          } catch (error) {
            console.error("Verification failed:", error);
            alert("❌ Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: "Radhika Rani",
          email: "radhika@example.com",
          contact: "9876543210",
        },
        theme: {
          color: "#28a745",
        },
      };
  
      // ✅ Open Razorpay Checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("❌ Payment failed. Try again!");
    }
  };
  

  if (loading) return <p>Loading payment details...</p>;
  if (!cart) return <p>Cart not found.</p>;

  return (
    <div className="payment-container">
      <div className="payment-box">
        <h1>Complete Your Payment</h1>
        <h2>Cart ID: {cart.cartId}</h2>
        <p><strong>Total Price:</strong> ₹{cart.totalPrice}</p>

        <div className="payment-method">
          <label>Select Payment Method:</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="Razorpay">💳 Razorpay</option>
            <option value="UPI">📲 UPI</option>
            <option value="Cash">💵 Cash</option>
          </select>
        </div>

        <button className="pay-button" onClick={handlePayment} disabled={processing}>
          {processing ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
