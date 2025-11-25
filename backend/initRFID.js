const { startRFIDReader } = require("./services/rfidReaderService");

/**
 * Initialize RFID service with environment-based configuration
 * @param {Object} io - Socket.IO instance for event emission
 */
function initializeRFID(io) {
  // Check if RFID is enabled via environment variable
  if (process.env.RFID_ENABLED !== "true") {
    console.log("[RFID] Service disabled (set RFID_ENABLED=true to enable)");
    return;
  }

  // Read configuration from environment variables with defaults
  const rfidConfig = {
    readerHost: process.env.RFID_READER_HOST || "192.168.0.143",
    cartId: process.env.RFID_CART_ID || "1234",
    io: io
  };

  // Start the RFID reader service
  startRFIDReader(rfidConfig);
  console.log("[RFID] Service initialized");
}

module.exports = { initializeRFID };
