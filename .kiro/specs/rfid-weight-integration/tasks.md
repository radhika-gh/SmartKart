# Implementation Plan

- [ ] 1. Update database schema to support RFID tags





  - Add `rfidTag` field to Item model with unique index
  - Create database migration script to add field to existing products
  - _Requirements: 1.2, 1.3_

- [ ] 2. Create RFID service for Raspberry Pi
- [x] 2.1 Implement dual reader initialization





  - Write function to initialize Reader_1 on /dev/serial0
  - Write function to initialize Reader_2 on /dev/ttyUSB0
  - Add error handling for serial port connection failures
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 2.2 Implement RFID tag parsing





  - Write function to read 14-byte packets from RDM6300
  - Extract 10-character tag ID from packet format [STX][10-char][2-char checksum][ETX]
  - Add validation for malformed data
  - _Requirements: 1.1, 5.1_

- [x] 2.3 Implement cooldown cache mechanism





  - Create tag cache dictionary with timestamp storage
  - Write function to check if tag is in cooldown period (3 seconds)
  - Write function to update cache with new tag scans
  - Write function to cleanup expired cache entries
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.4 Implement dual reader polling loop





  - Create main loop that polls both readers continuously
  - Process tags from both readers through shared cooldown cache
  - Add 50ms delay between poll cycles to prevent CPU overload
  - Log which reader detected each tag
  - _Requirements: 4.3, 5.5, 6.5_

- [x] 2.5 Implement Socket.IO connection for RFID service





  - Initialize Socket.IO client connection to backend
  - Implement connection, disconnection, and error handlers
  - Add automatic reconnection logic with 5-second retry interval
  - Create function to emit rfid_scan events with cartId, tagId, and timestamp
  - _Requirements: 1.1, 4.5_

- [ ]* 2.6 Add comprehensive logging and error handling
  - Log all tag scans with reader number and timestamp
  - Log cooldown cache hits (ignored duplicates)
  - Log serial port errors without crashing service
  - Add startup banner with configuration details
  - _Requirements: 4.4, 5.5_

- [x] 3. Implement backend RFID handler with toggle logic






- [x] 3.1 Create rfid_scan Socket.IO event handler

  - Add new socket event handler in backend/index.js
  - Extract cartId, tagId, and timestamp from event payload
  - Add error handling for missing or invalid data
  - _Requirements: 1.1, 1.2_

- [x] 3.2 Implement product lookup by RFID tag

  - Query Item collection using rfidTag field
  - Handle unknown tags by emitting unknownTag event to frontend
  - Log unknown tag attempts for monitoring
  - _Requirements: 1.2, 6.1_


- [x] 3.3 Implement toggle logic for add/remove

  - Check if product exists in cart items array
  - If NOT in cart: Add product with quantity 1, price, weight, image, and addedAt timestamp
  - If IN cart: Remove product from items array using splice
  - Log action taken (ADD or REMOVE) with product name
  - _Requirements: 1.3, 1.4, 3.1, 3.2_


- [x] 3.4 Update cart totals after add/remove

  - Recalculate totalPrice by summing all item prices × quantities
  - Recalculate totalWeight by summing all item weights × quantities
  - Save updated cart to database
  - _Requirements: 1.4, 3.2_



- [x] 3.5 Emit cart updates to frontend

  - Emit updateCart event with full cart object
  - Include action field ('add' or 'remove') for UI feedback
  - Include affectedProduct field with product name
  - _Requirements: 1.5, 3.3_

- [ ]* 3.6 Add error handling for edge cases
  - Handle cart not found scenario
  - Handle database save failures with rollback
  - Emit error events to frontend for user notification
  - Add race condition prevention with async/await
  - _Requirements: 6.3, 6.4_

- [ ] 4. Enhance weight verification integration
- [ ] 4.1 Verify weight discrepancy detection works with RFID
  - Test that weight updates trigger after RFID add/remove
  - Verify discrepancy flag is set when measured weight differs by >0.5kg
  - Verify discrepancy flag clears when weight returns to expected
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 3.5_

- [ ]* 4.2 Add weight verification logging
  - Log expected vs measured weight after each RFID event
  - Log discrepancy alerts with cart ID and weight difference
  - Log discrepancy resolutions
  - _Requirements: 2.1, 2.5_

- [ ] 5. Create RFID tag registration utility
- [ ] 5.1 Create script to register RFID tags to products
  - Write Node.js script that connects to MongoDB
  - Accept productId and rfidTag as command-line arguments
  - Update Item document with rfidTag field
  - Validate that tag is not already assigned to another product
  - _Requirements: 1.2, 1.3_

- [ ]* 5.2 Create bulk import script for multiple tags
  - Accept CSV file with productId,rfidTag mappings
  - Parse CSV and update multiple products in batch
  - Log successful and failed registrations
  - _Requirements: 1.2_

- [ ] 6. Create systemd service for RFID service
- [ ] 6.1 Create systemd service file for RFID service
  - Write .service file to run rfid_service.py on boot
  - Configure automatic restart on failure
  - Set working directory and environment variables
  - _Requirements: 4.5, 6.3_

- [ ] 6.2 Create startup script with configuration
  - Write start.sh script that sets BACKEND_URL and CART_ID
  - Add executable permissions
  - Test manual startup before enabling service
  - _Requirements: 4.1, 4.2_

- [ ]* 7. Integration testing and validation
- [ ]* 7.1 Test rapid scan prevention
  - Hold tag near reader for 5 seconds
  - Verify only one action occurs (not 50+)
  - Check logs for cooldown cache hits
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 7.2 Test toggle functionality
  - Scan product not in cart → verify ADD
  - Wait 3+ seconds
  - Scan same product → verify REMOVE
  - Repeat cycle multiple times
  - _Requirements: 1.3, 1.4, 3.1, 3.2_

- [ ]* 7.3 Test dual reader functionality
  - Scan product at reader 1 → verify ADD
  - Scan same product at reader 2 → verify REMOVE
  - Verify both readers share cooldown cache
  - _Requirements: 4.3, 6.5_

- [ ]* 7.4 Test unknown tag handling
  - Scan unregistered RFID tag
  - Verify unknownTag event emitted to frontend
  - Verify cart state unchanged
  - _Requirements: 6.1_

- [ ]* 7.5 Test weight verification integration
  - Add product via RFID
  - Verify weight update triggers
  - Manually adjust weight sensor
  - Verify discrepancy alert appears
  - Return weight to normal
  - Verify alert clears
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 7.6 Test service restart and reconnection
  - Stop RFID service
  - Verify weight service continues independently
  - Restart RFID service
  - Verify automatic reconnection to backend
  - Test scans work immediately after reconnection
  - _Requirements: 4.5, 6.3_
