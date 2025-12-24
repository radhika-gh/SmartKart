# Requirements Document

## Introduction

This feature integrates an Impinj R420 RFID reader directly into the SmartKart system using the LLRP (Low Level Reader Protocol) over TCP. The integration will replace or complement the current simulated Raspberry Pi RFID scanning approach with direct hardware communication, enabling real-time product detection as items are placed in or removed from shopping carts.

## Glossary

- **RFID_Reader_Service**: The Node.js service that communicates with the Impinj R420 reader via LLRP protocol
- **R420**: Impinj R420 fixed RFID reader hardware device
- **LLRP**: Low Level Reader Protocol, a standard TCP-based protocol for RFID reader communication
- **EPC**: Electronic Product Code, the unique identifier stored on RFID tags
- **RO_ACCESS_REPORT**: LLRP message type containing tag read data from the reader
- **Cart_System**: The existing MongoDB-based cart management system
- **Tag_Debounce**: Mechanism to prevent duplicate item additions when a tag remains in the reader's field
- **Product_Catalog**: The CartItem collection containing product information (name, price, weight, etc.)
- **Weight_Sensor_Service**: The Raspberry Pi service that reads weight data from the HX711 load cell and sends it to the backend
- **HX711**: Load cell amplifier module connected to the Raspberry Pi GPIO pins for weight measurement
- **Weight_Update**: Socket.IO event sent from Raspberry Pi containing current cart weight measurement

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to connect the Impinj R420 reader to the backend service, so that the system can receive real-time RFID tag reads.

#### Acceptance Criteria

1. WHEN the RFID_Reader_Service starts, THE RFID_Reader_Service SHALL establish a TCP connection to the R420 using the LLRP protocol
2. WHEN the R420 connection is established, THE RFID_Reader_Service SHALL log the connection status with the reader's IP address
3. IF the R420 connection fails, THEN THE RFID_Reader_Service SHALL log the error details and continue running without crashing
4. WHEN the R420 disconnects, THE RFID_Reader_Service SHALL log the disconnection event

### Requirement 2

**User Story:** As a shopper, I want items to be automatically added to my cart when I place RFID-tagged products in the cart, so that I don't have to manually scan each item.

#### Acceptance Criteria

1. WHEN the R420 detects an RFID tag, THE RFID_Reader_Service SHALL receive an RO_ACCESS_REPORT message containing the EPC
2. WHEN an RO_ACCESS_REPORT is received, THE RFID_Reader_Service SHALL extract the EPC from the message
3. WHEN an EPC is extracted, THE RFID_Reader_Service SHALL query the Product_Catalog using the EPC as the productId
4. IF the productId exists in the Product_Catalog, THEN THE RFID_Reader_Service SHALL add the product to the associated Cart_System document
5. IF the productId does not exist in the Product_Catalog, THEN THE RFID_Reader_Service SHALL log a warning and skip the addition

### Requirement 3

**User Story:** As a shopper, I want the system to prevent duplicate additions when I hold an item near the reader, so that my cart quantity remains accurate.

#### Acceptance Criteria

1. WHEN an EPC is detected, THE RFID_Reader_Service SHALL check if the same EPC was seen within the Tag_Debounce cooldown period
2. WHERE the Tag_Debounce cooldown period is 3000 milliseconds, THE RFID_Reader_Service SHALL ignore repeated EPC reads within this timeframe
3. WHEN the Tag_Debounce cooldown expires, THE RFID_Reader_Service SHALL allow the next read of the same EPC to trigger cart updates
4. WHEN an EPC passes the Tag_Debounce check, THE RFID_Reader_Service SHALL update the timestamp for that EPC

### Requirement 4

**User Story:** As a shopper, I want the system to update item quantities when I add multiple units of the same product, so that my cart reflects the correct count.

#### Acceptance Criteria

1. WHEN a product is added to the cart, THE RFID_Reader_Service SHALL check if the productId already exists in the cart items array
2. IF the productId exists in the cart, THEN THE RFID_Reader_Service SHALL increment the quantity field by 1
3. IF the productId does not exist in the cart, THEN THE RFID_Reader_Service SHALL add a new item entry with quantity set to 1
4. WHEN cart items are modified, THE RFID_Reader_Service SHALL recalculate the totalPrice as the sum of all item prices multiplied by their quantities
5. WHEN cart items are modified, THE RFID_Reader_Service SHALL recalculate the totalWeight as the sum of all item weights multiplied by their quantities

### Requirement 5

**User Story:** As a system administrator, I want to configure which reader is associated with which cart, so that multiple carts can operate simultaneously in the store.

#### Acceptance Criteria

1. WHEN the RFID_Reader_Service initializes, THE RFID_Reader_Service SHALL accept a readerHost parameter specifying the R420 IP address
2. WHEN the RFID_Reader_Service initializes, THE RFID_Reader_Service SHALL accept a cartId parameter specifying the associated cart
3. THE RFID_Reader_Service SHALL support multiple concurrent reader instances with different readerHost and cartId combinations
4. WHEN a tag is read, THE RFID_Reader_Service SHALL update only the cart specified by the configured cartId

### Requirement 6

**User Story:** As a developer, I want the RFID integration to work alongside the existing Socket.IO simulation, so that we can test both approaches without breaking current functionality.

#### Acceptance Criteria

1. THE RFID_Reader_Service SHALL be implemented as a separate module that does not modify existing Socket.IO code
2. THE RFID_Reader_Service SHALL use the same Cart and CartItem models as the existing system
3. THE RFID_Reader_Service SHALL maintain compatibility with existing cart API endpoints
4. WHEN the RFID_Reader_Service updates a cart, THE Cart_System SHALL emit the same updateCart event via Socket.IO for frontend synchronization

### Requirement 7

**User Story:** As a system administrator, I want the system to log RFID activity for debugging and monitoring, so that I can troubleshoot issues with tag reads.

#### Acceptance Criteria

1. WHEN an EPC is detected, THE RFID_Reader_Service SHALL log the EPC value and associated cartId
2. WHEN a cart is updated, THE RFID_Reader_Service SHALL log the new totalPrice and totalWeight values
3. WHEN an error occurs during tag processing, THE RFID_Reader_Service SHALL log the error message without crashing the service
4. WHEN a cart is not found in the database, THE RFID_Reader_Service SHALL log a warning with the cartId

### Requirement 8

**User Story:** As a developer, I want the system to handle R420 reader configuration gracefully, so that the service can start even if the reader is not yet configured with ROSpecs.

#### Acceptance Criteria

1. WHEN the RFID_Reader_Service connects to the R420, THE RFID_Reader_Service SHALL assume the reader has pre-configured ROSpecs via the Impinj web interface
2. THE RFID_Reader_Service SHALL document the assumption that ROSpecs are configured externally
3. IF ROSpecs are not configured, THEN THE RFID_Reader_Service SHALL provide guidance in documentation for manual ROSpec configuration
4. THE RFID_Reader_Service SHALL support future extension to programmatically configure ROSpecs via LLRP commands

### Requirement 9

**User Story:** As a shopper, I want the system to track the actual weight of items in my cart using a load cell, so that weight discrepancies can be detected for security purposes.

#### Acceptance Criteria

1. WHEN the Weight_Sensor_Service starts on the Raspberry Pi, THE Weight_Sensor_Service SHALL initialize the HX711 load cell amplifier using GPIO pins
2. WHEN the HX711 is initialized, THE Weight_Sensor_Service SHALL perform a zero calibration to establish the baseline weight
3. WHILE the Weight_Sensor_Service is running, THE Weight_Sensor_Service SHALL read weight measurements from the HX711 at intervals of 1000 milliseconds
4. WHEN a weight measurement is obtained, THE Weight_Sensor_Service SHALL send a Weight_Update event to the backend via Socket.IO containing the cartId and measured weight in kilograms
5. IF the HX711 hardware is not detected, THEN THE Weight_Sensor_Service SHALL operate in simulation mode generating synthetic weight data

### Requirement 10

**User Story:** As a store manager, I want the backend to receive and store actual weight measurements from the cart, so that I can compare expected weight (from RFID items) with actual weight for theft detection.

#### Acceptance Criteria

1. WHEN the backend receives a Weight_Update event, THE Cart_System SHALL extract the cartId and measured weight from the event data
2. WHEN a measured weight is received, THE Cart_System SHALL update the corresponding cart document with a measuredWeight field
3. WHEN both totalWeight and measuredWeight are available, THE Cart_System SHALL calculate the weight difference as an absolute value
4. IF the weight difference exceeds 0.5 kilograms, THEN THE Cart_System SHALL set a weightDiscrepancy flag to true on the cart document
5. WHEN the cart is updated with weight data, THE Cart_System SHALL emit a Socket.IO event to notify connected clients of the weight status
