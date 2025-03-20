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
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [paymentStatus, setPaymentStatus] = useState(null);

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

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!cart) {
      console.error("Cart details are not available.");
      return;
    }

    setProcessing(true);
    const isRazorpayLoaded = await loadRazorpay();
    if (!isRazorpayLoaded) {
      setPaymentStatus("Failed to load Razorpay SDK");
      setProcessing(false);
      return;
    }

    const razorpayConfig = {
      key: "YOUR_RAZORPAY_KEY_ID", // Replace with your actual key
      amount: cart.totalPrice * 100, // Razorpay expects amount in paise (multiply by 100 for INR)
      currency: "INR",
      name: "Your Company Name",
      description: `Payment for Cart ${cart.cartId}`,
      image: "/api/placeholder/100/100", // Company logo
      order_id: cart.cartId, // Replace with actual order ID from Razorpay API
      prefill: {
        name: "Customer Name",
        email: "customer@example.com",
        contact: "9876543210"
      },
      notes: {
        cartId: cart.cartId,
      },
      theme: {
        color: "#4f46e5" // Indigo color that matches our dark theme
      }
    };

    const razorpay = new window.Razorpay({
      ...razorpayConfig,
      handler: function (response) {
        // This function will be called when payment is successful
        handlePaymentSuccess(response);
      },
      modal: {
        ondismiss: function () {
          setProcessing(false);
          setPaymentStatus("Payment cancelled by user");
        }
      }
    });

    try {
      await axios.post(`${BACKEND_URL}/api/transactions/checkout`, {
        cartId,
        paymentMethod,
      });
      razorpay.open(); // Open Razorpay payment modal
    } catch (error) {
      console.error("Payment failed:", error);
      alert("❌ Payment failed. Try again!");
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = (response) => {
    setProcessing(false);
    setPaymentStatus("Payment successful");
    console.log("Payment successful", response);
    alert("✅ Payment Successful!");
    navigate("/");
  };

  if (loading) return <p>Loading payment details...</p>;
  if (!cart) return <p>Cart not found.</p>;

  return (
    <div className="payment-container">
      <div className="payment-box">
        <h1>Complete Your Payment</h1>
        <h2>Cart ID: {cart.cartId}</h2>
        <p><strong>Total Price:</strong> ₹{cart.totalPrice}</p>

        <button className="pay-button" onClick={handlePayment} disabled={processing}>
          {processing ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;