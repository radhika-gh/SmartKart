import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "../styles/rfid-monitor.css";

const BACKEND_URL = "http://localhost:8001";

const RFIDMonitorPage = () => {
  // State management for connection status, recent tags, and cart data
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    readerHost: "",
    cartId: ""
  });
  const [recentTags, setRecentTags] = useState([]);
  const [cart, setCart] = useState(null);
  const [testEpc, setTestEpc] = useState("");
  const [testMessage, setTestMessage] = useState({ type: "", text: "" });
  
  // State management for weight data
  const [weightData, setWeightData] = useState({
    measuredWeight: null,
    expectedWeight: null,
    discrepancy: false,
    timestamp: null
  });
  
  const socketRef = useRef(null);
  const tagListRef = useRef(null);

  // Establish Socket.IO connection and fetch initial status
  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io(BACKEND_URL);

    // Fetch RFID connection status on component mount
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/rfid/status`);
        setConnectionStatus(response.data);
      } catch (error) {
        console.error("Error fetching RFID status:", error);
        setConnectionStatus({
          connected: false,
          readerHost: "N/A",
          cartId: "N/A"
        });
      }
    };

    fetchStatus();

    // Listen for rfidUpdate events
    socketRef.current.on("rfidUpdate", (data) => {
      console.log("RFID Update received:", data);
      
      // Update recent tags list (keep last 20)
      setRecentTags((prevTags) => {
        const newTag = {
          epc: data.epc,
          timestamp: data.timestamp,
          cartId: data.cartId,
          productName: data.cart?.items?.find(item => item.productId === data.epc)?.name || "Unknown Product"
        };
        
        const updatedTags = [newTag, ...prevTags].slice(0, 20);
        return updatedTags;
      });

      // Update cart data
      setCart(data.cart);
    });

    // Listen for weightUpdate events
    socketRef.current.on("weightUpdate", (data) => {
      console.log("Weight Update received:", data);
      
      // Update weight data state
      setWeightData({
        measuredWeight: data.measuredWeight,
        expectedWeight: data.expectedWeight,
        discrepancy: data.discrepancy,
        timestamp: data.timestamp
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off("rfidUpdate");
        socketRef.current.off("weightUpdate");
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-scroll to newest tag
  useEffect(() => {
    if (tagListRef.current && recentTags.length > 0) {
      tagListRef.current.scrollTop = 0;
    }
  }, [recentTags]);

  // Handle test tag submission
  const handleTestTag = async (e) => {
    e.preventDefault();
    
    if (!testEpc.trim()) {
      setTestMessage({ type: "error", text: "Please enter an EPC" });
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/rfid/test-tag`, {
        epc: testEpc,
        cartId: connectionStatus.cartId
      });
      
      setTestMessage({ type: "success", text: `Tag ${testEpc} processed successfully!` });
      setTestEpc("");
      
      // Clear message after 3 seconds
      setTimeout(() => setTestMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Error testing tag:", error);
      setTestMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Failed to process test tag" 
      });
      
      setTimeout(() => setTestMessage({ type: "", text: "" }), 3000);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="rfid-monitor-container">
      <header className="rfid-header">
        <h1>RFID Monitor</h1>
        <p>Real-time RFID tag detection and cart monitoring</p>
      </header>

      {/* Connection Status Display */}
      <div className="status-section">
        <div className="status-card">
          <div className="status-header">
            <h2>Connection Status</h2>
            <div className={`status-indicator ${connectionStatus.connected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="status-details">
            <div className="status-item">
              <span className="status-label">Reader IP:</span>
              <span className="status-value">{connectionStatus.readerHost}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Cart ID:</span>
              <span className="status-value">{connectionStatus.cartId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Discrepancy Alert Banner */}
      {weightData.discrepancy && (
        <div className="weight-alert-banner">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <strong>Weight Discrepancy Detected!</strong>
              <p>The measured weight does not match the expected weight from scanned items.</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight Status Display */}
      <div className="weight-section">
        <div className="weight-card">
          <div className="weight-header">
            <h2>Weight Status</h2>
            <div className={`weight-indicator ${weightData.discrepancy ? 'discrepancy' : 'normal'}`}>
              <span className="weight-indicator-dot"></span>
              <span className="weight-indicator-text">
                {weightData.discrepancy ? 'Discrepancy' : 'Normal'}
              </span>
            </div>
          </div>
          <div className="weight-comparison">
            <div className="weight-item">
              <span className="weight-label">Measured Weight</span>
              <span className="weight-value measured">
                {weightData.measuredWeight !== null 
                  ? `${weightData.measuredWeight.toFixed(2)} kg` 
                  : 'N/A'}
              </span>
            </div>
            <div className="weight-divider">vs</div>
            <div className="weight-item">
              <span className="weight-label">Expected Weight</span>
              <span className="weight-value expected">
                {weightData.expectedWeight !== null 
                  ? `${weightData.expectedWeight.toFixed(2)} kg` 
                  : 'N/A'}
              </span>
            </div>
          </div>
          <div className="weight-difference">
            <span className="difference-label">Weight Difference:</span>
            <span className={`difference-value ${weightData.discrepancy ? 'alert' : 'normal'}`}>
              {weightData.measuredWeight !== null && weightData.expectedWeight !== null
                ? `${Math.abs(weightData.measuredWeight - weightData.expectedWeight).toFixed(3)} kg (${(Math.abs(weightData.measuredWeight - weightData.expectedWeight) * 1000).toFixed(0)} g)`
                : 'N/A'}
            </span>
          </div>
          {weightData.timestamp && (
            <div className="weight-timestamp">
              Last updated: {formatTimestamp(weightData.timestamp)}
            </div>
          )}
        </div>
      </div>

      <div className="monitor-content">
        {/* Real-time Tag Read Display */}
        <div className="tags-section">
          <div className="section-card">
            <h2>Recent Tag Reads</h2>
            <div className="tag-list" ref={tagListRef}>
              {recentTags.length === 0 ? (
                <div className="empty-state">
                  <p>No tags detected yet</p>
                  <p className="empty-state-hint">Tags will appear here as they are scanned</p>
                </div>
              ) : (
                recentTags.map((tag, index) => (
                  <div key={`${tag.epc}-${tag.timestamp}-${index}`} className="tag-item">
                    <div className="tag-info">
                      <span className="tag-epc">{tag.epc}</span>
                      <span className="tag-product">{tag.productName}</span>
                    </div>
                    <span className="tag-timestamp">{formatTimestamp(tag.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Tag Interface */}
          <div className="section-card test-section">
            <h2>Test Tag Interface</h2>
            <form onSubmit={handleTestTag} className="test-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter EPC (e.g., CHS321)"
                  value={testEpc}
                  onChange={(e) => setTestEpc(e.target.value)}
                  className="test-input"
                />
                <button type="submit" className="test-button">
                  Test Tag
                </button>
              </div>
              {testMessage.text && (
                <div className={`test-message ${testMessage.type}`}>
                  {testMessage.text}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Cart Contents Display */}
        <div className="cart-section">
          <div className="section-card">
            <h2>Cart Contents</h2>
            {cart && cart.items && cart.items.length > 0 ? (
              <>
                <div className="cart-items">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.name}</span>
                        <span className="cart-item-quantity">Qty: {item.quantity}</span>
                      </div>
                      <span className="cart-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div className="summary-row">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{cart.items.length}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Total Weight:</span>
                    <span className="summary-value">{cart.totalWeight?.toFixed(2) || 0} kg</span>
                  </div>
                  <div className="summary-row total">
                    <span className="summary-label">Total Price:</span>
                    <span className="summary-value">₹{cart.totalPrice?.toFixed(2) || 0}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Cart is empty</p>
                <p className="empty-state-hint">Items will appear here when tags are scanned</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDMonitorPage;
