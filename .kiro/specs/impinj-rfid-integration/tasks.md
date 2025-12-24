# Implementation Plan

- [x] 1. Set up RFID backend infrastructure
  - Install llrpjs package in backend directory
  - Create backend/services directory if it doesn't exist
  - _Requirements: 1.1, 1.3_

- [x] 2. Implement RFID Reader Service core functionality
- [x] 2.1 Create rfidReaderService.js with LLRP connection logic
  - Implement startRFIDReader function that accepts readerHost, cartId, and io parameters
  - Set up LLRPClient from llrpjs with reader host configuration
  - Implement connection, disconnect, and error event handlers with logging
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3_

- [x] 2.2 Implement tag debounce mechanism
  - Create recentTags Map to track EPC timestamps
  - Implement shouldProcessTag function with 3000ms cooldown logic
  - Add timestamp update when tag passes debounce check
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.3 Implement product lookup function
  - Create getProductById function that queries CartItem model by productId
  - Return product object with productId, name, price, weight, expiryDate, image, tags
  - Throw error if product not found
  - _Requirements: 2.3, 2.5_

- [x] 2.4 Implement cart update logic
  - Create addTagToCart function with debounce check
  - Query Cart model by cartId with error handling for missing cart
  - Check if productId exists in cart.items array
  - Increment quantity if item exists, otherwise push new item with quantity 1
  - Recalculate totalPrice and totalWeight using reduce
  - Set cart.active to true
  - Save cart to database
  - Emit rfidUpdate Socket.IO event with epc, cartId, cart, and timestamp
  - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 7.1, 7.2, 7.4_

- [x] 2.5 Implement RO_ACCESS_REPORT handler
  - Add event listener for RO_ACCESS_REPORT messages
  - Extract tagReportData and normalize to array
  - Loop through tag reports and extract EPC from each
  - Call addTagToCart for each valid EPC
  - Wrap in try-catch with error logging
  - _Requirements: 2.1, 2.2, 7.3_

- [x] 3. Create RFID initialization module
- [x] 3.1 Create initRFID.js file
  - Implement initializeRFID function that accepts io parameter
  - Check RFID_ENABLED environment variable and exit if not "true"
  - Read RFID_READER_HOST and RFID_CART_ID from environment with defaults
  - Call startRFIDReader with configuration object
  - Add logging for enabled/disabled status
  - Export initializeRFID function
  - _Requirements: 5.1, 5.2, 8.1_

- [x] 4. Create RFID API routes
- [x] 4.1 Create rfidRoutes.js file
  - Set up Express router
  - Import Cart and CartItem models
  - _Requirements: 6.2, 6.3_

- [x] 4.2 Implement GET /api/rfid/status endpoint
  - Return JSON with connected status, readerHost, and cartId from environment variables
  - _Requirements: 7.1_

- [x] 4.3 Implement GET /api/rfid/recent-tags endpoint
  - Create in-memory array to store last 50 tag reads (shared with rfidReaderService)
  - Return array of recent tag objects with epc, timestamp, cartId
  - _Requirements: 7.1_

- [x] 4.4 Implement POST /api/rfid/test-tag endpoint
  - Accept epc and cartId in request body
  - Call addTagToCart function directly for testing without hardware
  - Return success status and updated cart
  - _Requirements: 2.4_

- [x] 4.5 Export router and add to backend/index.js
  - Add single line to backend/index.js: app.use("/api/rfid", require("./routes/rfidRoutes"))
  - _Requirements: 6.2, 6.3_

- [x] 5. Create RFID Monitor frontend page
- [x] 5.1 Create RFIDMonitorPage.js component
  - Set up React component with useState for connection status, recent tags, and cart data
  - Import socket.io-client and establish connection
  - _Requirements: 6.4_

- [x] 5.2 Implement Socket.IO listener for rfidUpdate events
  - Add socket.on("rfidUpdate") listener in useEffect
  - Update state with new tag data (epc, timestamp, cart)
  - Append to recent tags list (keep last 20)
  - _Requirements: 2.1, 6.4_

- [x] 5.3 Implement connection status display
  - Fetch /api/rfid/status on component mount
  - Display reader IP, cart ID, and connection status
  - Show green/red indicator based on connection
  - _Requirements: 1.2, 7.1_

- [x] 5.4 Implement real-time tag read display
  - Create scrollable list of recent tag reads
  - Display EPC, timestamp, and product name for each read
  - Auto-scroll to newest tag
  - _Requirements: 2.1, 7.1_

- [x] 5.5 Implement cart contents display
  - Show current cart items with name, quantity, price
  - Display totalPrice and totalWeight
  - Update in real-time when rfidUpdate event received
  - _Requirements: 4.4, 4.5, 7.2_

- [x] 5.6 Implement test tag interface
  - Create form with EPC input field and submit button
  - POST to /api/rfid/test-tag on submit
  - Display success/error message
  - _Requirements: 2.4_

- [x] 5.7 Create rfid-monitor.css stylesheet
  - Style connection status indicator
  - Style tag read list with alternating row colors
  - Style cart display as card layout
  - Style test interface form
  - Make layout responsive
  - _Requirements: 6.4_

- [x] 6. Add RFID Monitor route to App.js
  - Import RFIDMonitorPage component
  - Add Route for /rfid-monitor path
  - _Requirements: 6.4_

- [x] 7. Configure environment variables
  - Add RFID_ENABLED, RFID_READER_HOST, RFID_CART_ID to backend/.env file
  - Document default values in comments
  - _Requirements: 5.1, 5.2, 8.1_

- [x] 8. Add optional RFID initialization to backend
  - Add commented lines at end of backend/index.js to optionally enable RFID
  - Include instructions in comments for enabling
  - _Requirements: 6.1, 8.1_

- [ ] 9. Create documentation
- [ ] 9.1 Document R420 reader configuration requirements
  - Create README-RFID.md with ROSpec configuration steps
  - Document network setup and IP configuration
  - Include troubleshooting section
  - _Requirements: 8.2, 8.3_

- [ ]* 9.2 Document EPC to productId mapping
  - Explain assumption that EPC matches productId
  - Provide examples of tag programming
  - Document how to add products to CartItem collection
  - _Requirements: 2.3_

- [ ]* 9.3 Create deployment guide
  - Step-by-step installation instructions
  - Environment variable configuration
  - Testing checklist
  - _Requirements: 8.1_

- [ ] 10. Update Cart model to support weight measurements
- [x] 10.1 Add weight-related fields to Cart schema
  - Add measuredWeight field (Number) for actual load cell weight
  - Add weightDiscrepancy field (Boolean) for alert flag
  - Add lastWeightUpdate field (Date) for timestamp tracking
  - _Requirements: 10.2_

- [ ] 11. Implement backend weight update handler
- [x] 11.1 Add Socket.IO listener for weight_update events
  - Create event handler in backend/index.js for weight_update
  - Extract cartId, measuredWeight, and timestamp from event data
  - Query Cart by cartId with error handling
  - Update cart.measuredWeight with received value
  - Calculate weight difference between measuredWeight and totalWeight
  - Set cart.weightDiscrepancy to true if difference exceeds 0.5kg
  - Update cart.lastWeightUpdate with current timestamp
  - Save cart to database
  - Emit weightUpdate event to frontend with all weight data
  - Add logging for weight updates and discrepancies
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 12. Create Raspberry Pi weight sensor service
- [x] 12.1 Update weight_sensor.py with HX711 initialization
  - Keep existing hardware detection logic (try/except for imports)
  - Add GPIO pin configuration constants (DT_PIN=5, SCK_PIN=6)
  - Implement initialize_hx711 function with zero calibration
  - Update get_weight function to read from HX711 when REAL_HARDWARE=True
  - Keep simulation fallback for development without hardware
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 12.2 Create weight_sensor_service.py main service file
  - Import socketio client library
  - Import get_weight function from weight_sensor.py
  - Read BACKEND_URL and CART_ID from environment variables or config
  - Establish Socket.IO connection to backend
  - Implement main loop that reads weight every 1 second
  - Emit weight_update event with cartId, measuredWeight, and timestamp
  - Add connection/disconnection event handlers with logging
  - Add error handling for weight reading failures
  - _Requirements: 9.3, 9.4_

- [ ]* 12.3 Create systemd service file for auto-start
  - Create weight-sensor.service file for systemd
  - Configure service to run weight_sensor_service.py on boot
  - Set working directory and environment variables
  - Configure restart policy for reliability
  - _Requirements: 9.1_

- [ ] 13. Update RFID Monitor page to display weight data
- [x] 13.1 Add Socket.IO listener for weightUpdate events
  - Add socket.on("weightUpdate") listener in RFIDMonitorPage.js
  - Update state with measuredWeight, expectedWeight, and discrepancy flag
  - Store timestamp of last weight update
  - _Requirements: 10.5_

- [x] 13.2 Add weight display section to UI
  - Create weight status card showing measured vs expected weight
  - Display weight difference in grams
  - Show visual indicator (green/red) based on weightDiscrepancy flag
  - Display last update timestamp
  - Add alert banner when weight discrepancy detected
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 13.3 Update rfid-monitor.css with weight display styles
  - Style weight status card
  - Style discrepancy alert banner (red background)
  - Style weight comparison display
  - Add responsive layout for weight section
  - _Requirements: 10.5_

- [ ]* 14. Create weight sensor documentation
- [ ]* 14.1 Document HX711 wiring and setup
  - Create wiring diagram for HX711 to Raspberry Pi
  - Document GPIO pin assignments
  - Provide hardware requirements list
  - Include load cell specifications
  - _Requirements: 9.1, 9.2_

- [ ]* 14.2 Document calibration procedure
  - Step-by-step zero calibration instructions
  - Scale factor calibration with known weights
  - Troubleshooting common calibration issues
  - _Requirements: 9.2_

- [ ]* 14.3 Create Raspberry Pi deployment guide
  - Python dependencies installation instructions
  - Environment variable configuration
  - Service installation and auto-start setup
  - Testing and verification steps
  - _Requirements: 9.1, 9.3_
