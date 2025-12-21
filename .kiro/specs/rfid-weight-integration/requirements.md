# Requirements Document

## Introduction

This feature integrates **two RDM6300 RFID readers** with load cell weight monitoring to enable automatic product addition and removal detection in a smart shopping cart system. The system uses a **toggle-based approach**: scanning a product once adds it to the cart, scanning it again removes it. The system must coordinate between two RFID readers, HX711 load cell, and the backend cart management system to provide real-time product tracking with weight verification.

## Glossary

- **RFID_Service**: The Raspberry Pi service that reads RFID tags from two RDM6300 readers via serial communication
- **Reader_1**: The GPIO UART RFID reader connected to /dev/serial0
- **Reader_2**: The USB UART RFID reader connected to /dev/ttyUSB0
- **Weight_Service**: The existing Raspberry Pi service that monitors load cell weight and sends updates via Socket.IO
- **Backend_System**: The Node.js Express server that manages cart state and product inventory
- **Cart_State**: The current state of products and weights stored in the MongoDB database
- **Product_Event**: An addition or removal of a product detected by RFID scanning
- **Weight_Verification**: The process of comparing measured weight against expected cart weight
- **Tag_ID**: The 10-character RFID tag identifier extracted from RDM6300 data
- **Discrepancy_Threshold**: The 0.5kg tolerance for weight differences before flagging an issue

## Requirements

### Requirement 1

**User Story:** As a shopper, I want the system to automatically detect when I place a product in the cart, so that I don't have to manually scan items.

#### Acceptance Criteria

1. WHEN THE RFID_Service detects a Tag_ID from the RDM6300 reader, THE RFID_Service SHALL emit the Tag_ID to the Backend_System via Socket.IO within 500 milliseconds
2. WHEN THE Backend_System receives a Tag_ID, THE Backend_System SHALL query the product database to retrieve product details including weight
3. WHEN THE Backend_System identifies a valid product for the Tag_ID, THE Backend_System SHALL add the product to the Cart_State
4. WHEN THE Backend_System adds a product to Cart_State, THE Backend_System SHALL update the expected total weight by adding the product weight
5. WHEN THE Backend_System updates Cart_State, THE Backend_System SHALL emit a cart update event to connected frontend clients within 200 milliseconds

### Requirement 2

**User Story:** As a shopper, I want the system to verify that the physical weight matches the scanned products, so that I can be confident the cart is accurate.

#### Acceptance Criteria

1. WHEN THE Weight_Service sends a weight update, THE Backend_System SHALL compare the measured weight against the expected Cart_State total weight
2. IF THE measured weight differs from expected weight by more than Discrepancy_Threshold, THEN THE Backend_System SHALL set the weightDiscrepancy flag to true
3. WHEN THE Backend_System detects a weight discrepancy, THE Backend_System SHALL emit a discrepancy alert to frontend clients with measured and expected values
4. WHILE THE weightDiscrepancy flag is true, THE Backend_System SHALL continue monitoring weight updates until the discrepancy resolves
5. WHEN THE measured weight returns within Discrepancy_Threshold of expected weight, THE Backend_System SHALL clear the weightDiscrepancy flag

### Requirement 3

**User Story:** As a shopper, I want to scan a product again to remove it from my cart, so that I can easily change my mind about purchases.

#### Acceptance Criteria

1. WHEN THE RFID_Service detects a Tag_ID for a product already in Cart_State, THE Backend_System SHALL remove the product from Cart_State
2. WHEN THE Backend_System removes a product, THE Backend_System SHALL update the expected total weight by subtracting the product weight
3. WHEN THE Backend_System removes a product, THE Backend_System SHALL emit a cart update event to frontend clients indicating the removal within 200 milliseconds
4. WHEN THE Weight_Service detects a weight decrease after removal, THE Backend_System SHALL verify the measured weight matches the new expected weight
5. IF THE measured weight does not match expected weight after removal within Discrepancy_Threshold, THEN THE Backend_System SHALL set the weightDiscrepancy flag to true

### Requirement 4

**User Story:** As a system administrator, I want the RFID service to read from two readers simultaneously, so that the cart system can detect products from multiple entry points.

#### Acceptance Criteria

1. WHEN THE RFID_Service starts, THE RFID_Service SHALL initialize Reader_1 on /dev/serial0 at 9600 baud rate
2. WHEN THE RFID_Service starts, THE RFID_Service SHALL initialize Reader_2 on /dev/ttyUSB0 at 9600 baud rate
3. WHILE THE RFID_Service is running, THE RFID_Service SHALL poll both Reader_1 and Reader_2 continuously without blocking
4. WHEN THE RFID_Service encounters a serial read error on either reader, THE RFID_Service SHALL log the error and continue reading from the other reader
5. WHEN THE RFID_Service or Weight_Service loses connection to Backend_System, THE RFID_Service or Weight_Service SHALL attempt reconnection every 5 seconds

### Requirement 5

**User Story:** As a developer, I want the system to handle rapid repeated RFID reads from both readers, so that a single product scan doesn't result in multiple additions or removals.

#### Acceptance Criteria

1. WHEN THE RFID_Service detects a Tag_ID from either Reader_1 or Reader_2, THE RFID_Service SHALL store the Tag_ID with a timestamp in a local cache
2. WHEN THE RFID_Service detects the same Tag_ID again from either reader, THE RFID_Service SHALL check if the cached timestamp is within 3 seconds
3. IF THE cached timestamp for a Tag_ID is within 3 seconds, THEN THE RFID_Service SHALL ignore the read and not emit to Backend_System
4. WHEN THE 3-second cooldown period expires for a Tag_ID, THE RFID_Service SHALL allow the tag to be processed again
5. WHEN THE RFID_Service successfully emits a Tag_ID to Backend_System, THE RFID_Service SHALL log the event with reader number and timestamp for debugging

### Requirement 6

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that the shopping experience remains smooth even with unexpected scenarios.

#### Acceptance Criteria

1. IF THE Backend_System cannot find a product matching the Tag_ID, THEN THE Backend_System SHALL log an unknown tag event and emit a notification to frontend clients
2. WHEN THE Weight_Service sends a weight update of 0.0kg, THE Backend_System SHALL treat it as an empty cart and clear Cart_State if no products are present
3. WHEN THE RFID_Service or Weight_Service restarts, THE RFID_Service or Weight_Service SHALL resume operation without requiring Backend_System restart
4. WHEN THE Backend_System processes a Product_Event, THE Backend_System SHALL complete the database update before processing the next event to prevent race conditions
5. WHEN THE RFID_Service detects a Tag_ID from Reader_1 and Reader_2 simultaneously, THE RFID_Service SHALL process only the first detected read and apply cooldown to prevent duplicate processing
