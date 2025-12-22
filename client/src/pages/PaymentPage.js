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
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [showCashModal, setShowCashModal] = useState(false);

  // For the "payment completed" UI and countdown
  const [cashPaymentCompleted, setCashPaymentCompleted] = useState(false);
  const [countdown, setCountdown] = useState(5);

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
    if (paymentMethod === "Cash") {
      setProcessing(true);
      setShowCashModal(true);

      // Start polling every 5 seconds to check for admin approval.
      const pollInterval = setInterval(async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/shop/${cartId}`);
          const updatedCart = response.data;

          // If admin has verified cash (cart is inactive), show success + countdown
          if (!updatedCart.active) {
            clearInterval(pollInterval);
            setCashPaymentCompleted(true);

            // Start a 5-second countdown before redirect
            let redirectInterval = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(redirectInterval);
                  setShowCashModal(false);
                  navigate("/");
                }
                return prev - 1;
              });
            }, 1000);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);

      return;
    }

    // Razorpay Payment Flow:
    try {
      if (!window.Razorpay) {
        alert("Razorpay SDK failed to load. Check your network connection.");
        return;
      }
      
      const razorpayKey = process.env.REACT_APP_RAZORPAY_ID_KEY;
      console.log("🔑 Razorpay Key:", razorpayKey); // Debug log
      
      if (!razorpayKey) {
        alert("❌ Razorpay key not configured. Please restart the app.");
        return;
      }
      
      const { data } = await axios.post(
        `${BACKEND_URL}/api/transactions/create-order`,
        { cartId }
      );
      const options = {
        key: razorpayKey,
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
        <p>
          <strong>Total Price:</strong> ₹{cart.totalPrice}
        </p>

        <div className="payment-method">
          <label>Select Payment Method:</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="Razorpay">💳 Razorpay</option>
            <option value="Cash">💵 Cash</option>
          </select>
        </div>

        <button
          className="pay-button"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>
      </div>

      {showCashModal && (
        <div className="modal-overlay">
          <div className="modal">
            {/* If cashPaymentCompleted is true, show success + countdown */}
            {cashPaymentCompleted ? (
              <>
                <h2>Payment Completed!</h2>
                <p>Redirecting in {countdown}...</p>
              </>
            ) : (
              <>
                <h2>Cash Payment Processing</h2>
                <p>
                  Please proceed to your nearest counter. Your cash payment is
                  awaiting admin approval.
                </p>
                <div className="spinner"></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
