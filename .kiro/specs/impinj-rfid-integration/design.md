# Design Document

## Overview

The Impinj R420 RFID integration adds direct hardware communication to the SmartKart system via the LLRP protocol as a completely separate, standalone feature. This design creates:

1. **New Backend Service** - A separate RFID reader service module that operates independently
2. **New Frontend Page** - A dedicated RFID monitoring/testing page accessible via a new route
3. **Zero Modifications** - No changes to existing code, routes, pages, or functionality

The RFID service will be a self-contained module that can be enabled/disabled without affecting the current simulation-based workflow. The new frontend page will provide a dedicated interface for viewing RFID activity, testing tag reads, and monitoring cart updates from the R420 reader.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    R420[Impinj R420 Reader] -->|LLRP/TCP| RFID[RFID Reader Service]
    HX711[HX711 Load Cell] -->|GPIO| RaspberryPi[Raspberry Pi Weight Service]
    RaspberryPi -->|Socket.IO weight_update| SocketIO[Socket.IO Server]
    RFID -->|Query Product| CartItem[(CartItem Collection)]
    RFID -->|Update Cart| Cart[(Cart Collection)]
    RFID -->|Emit Event| SocketIO
    SocketIO -->|rfidUpdate| RFIDPage[RFID Monitor Page]
    SocketIO -->|weightUpdate| RFIDPage
    
    subgraph "Existing System (Untouched)"
        SimPi[Simulated Pi] -->|Socket.IO| SocketIO
        SocketIO -->|updateCart| ExistingPages[HomePage/CartPage/PaymentPage]
        Express[Express API] -->|HTTP| Cart
    end
    
    subgraph "New RFID + Weight System (Isolated)"
        RFID
        RaspberryPi
        HX711
        RFIDPage
        RFIDRoutes[/api/rfid/* Routes]
        RFIDRoutes -->|HTTP| Cart
    end
    
    style RFID fill:#e1f5ff
    style R420 fill:#ffe1e1
    style RFIDPage fill:#e1ffe1
    style RaspberryPi fill:#fff4e1
    style HX711 fill:#ffe1e1
```

### Component Interaction Flow

**RFID Flow:**
1. **R420 Reader** detects RFID tag → sends RO_ACCESS_REPORT via LLRP
2. **RFID Reader Service** receives report → extracts EPC → applies debounce
3. **RFID Reader Service** queries CartItem collection for product details
4. **RFID Reader Service** updates Cart document (add/increment quantity, calculates totalWeight)
5. **RFID Reader Service** emits dedicated Socket.IO event (`rfidUpdate`) for new RFID page only
6. **RFID Monitor Page** receives rfidUpdate event → displays real-time tag reads and cart status

**Weight Sensing Flow:**
1. **HX711 Load Cell** measures cart weight → sends analog signal to Raspberry Pi GPIO
2. **Raspberry Pi Weight Service** reads HX711 via GPIO → converts to weight in kg
3. **Raspberry Pi Weight Service** emits Socket.IO event (`weight_update`) with cartId and measuredWeight
4. **Backend Socket.IO Server** receives weight_update → updates Cart document with measuredWeight
5. **Backend** compares measuredWeight vs totalWeight → sets weightDiscrepancy flag if difference > 0.5kg
6. **Backend** emits `weightUpdate` event to frontend
7. **RFID Monitor Page** receives weightUpdate → displays measured weight and discrepancy alert

### Isolation Strategy

The new RFID system will be completely isolated:
- **New Socket.IO Event**: `rfidUpdate` (separate from existing `updateCart`)
- **New API Routes**: `/api/rfid/*` (separate from existing `/api/shop/*` and `/api/admin/*`)
- **New Frontend Route**: `/rfid-monitor` (separate from existing pages)
- **New Service Module**: `backend/services/rfidReaderService.js` (standalone file)
- **Optional Initialization**: RFID service only starts if `RFID_ENABLED=true` in .env
- **Zero Modifications**: No changes to existing files (index.js, routes, pages, components)

## Components and Interfaces

### 1. RFID Reader Service Module (`backend/services/rfidReaderService.js`)

**Purpose:** Encapsulates all LLRP communication, tag processing, and cart updates.

**Key Functions:**

```javascript
// Initialize and connect to R420 reader
function startRFIDReader({ readerHost, cartId, io })

// Process incoming tag reports from reader
async function handleTagReport(tagReportData, cartId, io)

// Add tag to cart with debouncing
async function addTagToCart(epc, cartId, io)

// Query product catalog by EPC/productId
async function getProductById(productId)
```

**Dependencies:**
- `llrpjs` - LLRP client library
- `mongoose` models: Cart, CartItem
- Socket.IO instance for event emission

**Configuration Parameters:**
- `readerHost` (string): IP address of R420 reader (e.g., "192.168.0.143")
- `cartId` (string): Associated cart identifier (e.g., "1234")
- `io` (Socket.IO instance): For emitting rfidUpdate events (NOT updateCart)

### 2. New API Routes (`backend/routes/rfidRoutes.js`)

**Purpose:** Provide HTTP endpoints for RFID monitoring page.

**Endpoints:**

```javascript
// Get RFID service status
GET /api/rfid/status
Response: { connected: true, readerHost: "192.168.0.143", cartId: "1234" }

// Get recent tag reads (last 50)
GET /api/rfid/recent-tags
Response: [{ epc: "CHS321", timestamp: "2025-11-24T10:30:00Z", cartId: "1234" }]

// Manually trigger test tag read (for testing without hardware)
POST /api/rfid/test-tag
Body: { epc: "CHS321", cartId: "1234" }
Response: { success: true, cart: {...} }
```

### 3. New Frontend Page (`client/src/pages/RFIDMonitorPage.js`)

**Purpose:** Dedicated page for viewing RFID activity in real-time.

**Features:**
- Display reader connection status
- Show live tag reads as they happen
- Display current cart contents for RFID-enabled cart
- Test interface for simulating tag reads
- Log of recent RFID events

**Route:** `/rfid-monitor`

**Socket.IO Listener:**
```javascript
socket.on("rfidUpdate", (data) => {
  // Update UI with new tag read
  // data: { epc, cartId, cart, timestamp }
});
```

### 2. Raspberry Pi Weight Sensor Service (`simulation/weight_sensor_service.py`)

**Purpose:** Read weight measurements from HX711 load cell and send to backend via Socket.IO.

**Key Functions:**

```python
def initialize_hx711():
    """Initialize HX711 with GPIO pins and perform zero calibration"""
    
def get_weight():
    """Read current weight from HX711 or return simulated value"""
    
def send_weight_update(cart_id, weight):
    """Emit weight_update event to backend via Socket.IO"""
    
def main_loop():
    """Continuously read weight every 1 second and send updates"""
```

**Hardware Configuration:**
- **DT_PIN (Data)**: GPIO 5
- **SCK_PIN (Clock)**: GPIO 6
- **Calibration**: Zero calibration on startup, optional scale factor calibration
- **Sampling Rate**: 1 reading per second (adjustable)

**Fallback Mode:**
- If `RPi.GPIO` and `hx711` libraries not available → simulation mode
- Simulation mode generates synthetic weight data for testing without hardware

**Socket.IO Events Emitted:**
```python
{
  "event": "weight_update",
  "data": {
    "cartId": "1234",
    "measuredWeight": 2.45,  # in kilograms
    "timestamp": "2025-11-26T10:30:00Z"
  }
}
```

**Dependencies:**
- `python-socketio[client]` - Socket.IO client library
- `hx711` - HX711 load cell library (Raspberry Pi only)
- `RPi.GPIO` - GPIO control library (Raspberry Pi only)

**Deployment:**
- Runs as standalone Python process on Raspberry Pi
- Auto-starts on boot via systemd service (optional)
- Connects to backend Socket.IO server at configured URL

### 3. Backend Weight Update Handler

**Purpose:** Receive weight measurements from Raspberry Pi and update cart documents.

**Implementation in `backend/index.js`:**

```javascript
io.on("connection", (socket) => {
  // Existing handlers...
  
  socket.on("weight_update", async (data) => {
    try {
      const { cartId, measuredWeight, timestamp } = data;
      
      const cart = await Cart.findOne({ cartId });
      if (!cart) {
        console.warn(`[Weight] Cart ${cartId} not found`);
        return;
      }
      
      // Update measured weight
      cart.measuredWeight = measuredWeight;
      
      // Calculate discrepancy
      const expectedWeight = cart.totalWeight || 0;
      const weightDiff = Math.abs(measuredWeight - expectedWeight);
      cart.weightDiscrepancy = weightDiff > 0.5; // Flag if > 500g difference
      
      await cart.save();
      
      // Emit to frontend
      io.emit("weightUpdate", {
        cartId,
        measuredWeight,
        expectedWeight,
        discrepancy: cart.weightDiscrepancy,
        timestamp
      });
      
      console.log(`[Weight] Cart ${cartId}: measured=${measuredWeight}kg, expected=${expectedWeight}kg`);
    } catch (err) {
      console.error("[Weight] Error processing weight update:", err.message);
    }
  });
});
```

### 4. Tag Debounce Manager

**Purpose:** Prevent duplicate cart additions when tags remain in reader field.

**Implementation:**
```javascript
const recentTags = new Map(); // epc -> lastSeenTimestamp
const TAG_COOLDOWN_MS = 3000;

function shouldProcessTag(epc) {
  const now = Date.now();
  if (recentTags.has(epc) && now - recentTags.get(epc) < TAG_COOLDOWN_MS) {
    return false; // Skip duplicate
  }
  recentTags.set(epc, now);
  return true;
}
```

**Rationale:** RFID readers continuously report tags in their field. Without debouncing, a single item could be added dozens of times per second.

### 3. Product Lookup Service

**Purpose:** Retrieve product details from CartItem collection using EPC as productId.

**Interface:**
```javascript
async function getProductById(productId) {
  const product = await CartItem.findOne({ productId });
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  return {
    productId: product.productId,
    name: product.name,
    price: product.price,
    weight: product.weight,
    expiryDate: product.expiryDate,
    image: product.image,
    tags: product.tags
  };
}
```

**Error Handling:** If product not found, log warning and skip cart update (don't crash service).

### 4. Cart Update Logic

**Purpose:** Add items to cart or increment quantity if already present.

**Algorithm:**
```javascript
async function addTagToCart(epc, cartId, io) {
  // 1. Debounce check
  if (!shouldProcessTag(epc)) return;
  
  // 2. Find cart
  const cart = await Cart.findOne({ cartId });
  if (!cart) {
    console.warn(`Cart ${cartId} not found`);
    return;
  }
  
  // 3. Get product details
  const product = await getProductById(epc);
  
  // 4. Check if item exists in cart
  const existingItem = cart.items.find(item => item.productId === epc);
  
  if (existingItem) {
    // Increment quantity
    existingItem.quantity += 1;
  } else {
    // Add new item
    cart.items.push({
      productId: product.productId,
      name: product.name,
      price: product.price,
      weight: product.weight,
      expiryDate: product.expiryDate,
      quantity: 1,
      image: product.image || ""
    });
  }
  
  // 5. Recalculate totals
  cart.totalPrice = cart.items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0);
  cart.totalWeight = cart.items.reduce((sum, item) => 
    sum + (item.weight * item.quantity), 0);
  
  cart.active = true;
  
  // 6. Save to database
  await cart.save();
  
  // 7. Emit Socket.IO event for RFID monitor page only
  io.emit("rfidUpdate", {
    epc: epc,
    cartId: cartId,
    cart: cart,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[RFID] Cart ${cartId} updated: ${cart.items.length} items, ₹${cart.totalPrice}`);
}
```

### 5. Integration Point (New Initialization File)

**Strategy:** Create a separate initialization file that existing code can optionally call.

**New File: `backend/initRFID.js`**
```javascript
const { startRFIDReader } = require("./services/rfidReaderService");

function initializeRFID(io) {
  // Only start if explicitly enabled
  if (process.env.RFID_ENABLED !== "true") {
    console.log("[RFID] Service disabled (set RFID_ENABLED=true to enable)");
    return;
  }
  
  const rfidConfig = {
    readerHost: process.env.RFID_READER_HOST || "192.168.0.143",
    cartId: process.env.RFID_CART_ID || "1234",
    io: io
  };
  
  startRFIDReader(rfidConfig);
  console.log("[RFID] Service initialized");
}

module.exports = { initializeRFID };
```

**Optional Addition to `backend/index.js` (at the very end, after all existing code):**
```javascript
// ... all existing code remains unchanged ...

// ✅ OPTIONAL: Uncomment to enable RFID integration
// const { initializeRFID } = require("./initRFID");
// initializeRFID(io);
```

**Alternative:** Keep RFID completely separate by running it as a standalone process (separate Node.js script).

## Data Models

### Existing Models (Minimal Changes Required)

**Cart Model** (`backend/models/Cart.js`):
- Already supports items array with quantity field
- Already calculates totalPrice and totalWeight (expected weight from RFID items)
- Already has active flag for cart state
- **New fields to add:**
  - `measuredWeight` (Number): Actual weight from HX711 load cell in kg
  - `weightDiscrepancy` (Boolean): Flag indicating if measured vs expected weight differs by > 0.5kg
  - `lastWeightUpdate` (Date): Timestamp of last weight measurement

**Updated Cart Schema:**
```javascript
{
  cartId: String,
  items: [{ productId, name, price, weight, quantity, ... }],
  totalPrice: Number,
  totalWeight: Number,  // Expected weight (sum of RFID item weights)
  measuredWeight: Number,  // NEW: Actual weight from load cell
  weightDiscrepancy: Boolean,  // NEW: Alert flag
  lastWeightUpdate: Date,  // NEW: Weight measurement timestamp
  active: Boolean,
  createdAt: Date
}
```

**CartItem Model** (`backend/models/CartItem.js`):
- Serves as product catalog
- productId field will match EPC from RFID tags
- Contains all product metadata (name, price, weight, image, tags)

**Transaction Model** (`backend/models/Transaction.js`):
- No changes needed
- Existing payment flows remain unchanged

### EPC to ProductId Mapping

**Assumption:** EPC values on RFID tags are pre-programmed to match productId values in the CartItem collection.

**Example:**
- RFID Tag EPC: `"CHS321"`
- CartItem document: `{ productId: "CHS321", name: "Cheese", price: 100, ... }`

**Alternative Approach (Future Enhancement):** Create a separate EPCMapping collection if EPCs and productIds need to be decoupled.

## Error Handling

### Connection Errors

**Scenario:** R420 reader is offline or unreachable.

**Handling:**
```javascript
reader.on("error", (err) => {
  console.error("[RFID] Reader error:", err.message);
  // Service continues running, will reconnect if reader comes back online
});

reader.on("disconnect", () => {
  console.log("[RFID] Disconnected from reader");
  // llrpjs handles automatic reconnection attempts
});
```

**Rationale:** Don't crash the entire backend if RFID hardware fails. Other features (manual cart management, payments) should continue working.

### Product Not Found

**Scenario:** EPC doesn't match any productId in CartItem collection.

**Handling:**
```javascript
try {
  const product = await getProductById(epc);
} catch (err) {
  console.warn(`[RFID] Product not found for EPC: ${epc}`);
  return; // Skip this tag, don't add to cart
}
```

**Rationale:** Unknown tags shouldn't break the system. Log for debugging but continue processing other tags.

### Cart Not Found

**Scenario:** Configured cartId doesn't exist in database.

**Handling:**
```javascript
const cart = await Cart.findOne({ cartId });
if (!cart) {
  console.warn(`[RFID] Cart ${cartId} not found in database`);
  return;
}
```

**Rationale:** Cart must be pre-created via `/api/admin/addCart` endpoint. RFID service doesn't auto-create carts.

### Database Errors

**Scenario:** MongoDB connection issues or save failures.

**Handling:**
```javascript
try {
  await cart.save();
  io.emit("updateCart", cart);
} catch (err) {
  console.error(`[RFID] Failed to save cart ${cartId}:`, err.message);
  // Don't crash, log error and continue
}
```

### Tag Report Processing Errors

**Scenario:** Malformed LLRP messages or unexpected data structures.

**Handling:**
```javascript
reader.on("RO_ACCESS_REPORT", async (msg) => {
  try {
    let tagReportDataList = msg.getTagReportData();
    if (!Array.isArray(tagReportDataList)) {
      tagReportDataList = [tagReportDataList];
    }
    
    for (const tagReportData of tagReportDataList) {
      const epcParam = tagReportData.getEPCParameter();
      if (!epcParam) {
        console.warn("[RFID] Tag report missing EPC parameter");
        continue;
      }
      
      const epc = epcParam.getEPC();
      await addTagToCart(epc, cartId, io);
    }
  } catch (err) {
    console.error("[RFID] Error processing tag report:", err.message);
    // Continue processing next reports
  }
});
```

## Testing Strategy

### Unit Testing

**Test Files:**
- `backend/services/__tests__/rfidReaderService.test.js`
- `backend/services/__tests__/tagDebounce.test.js`

**Key Test Cases:**

1. **Debounce Logic:**
   - Tag seen twice within 3 seconds → second read ignored
   - Tag seen after 3 seconds → both reads processed
   - Multiple different tags → all processed

2. **Product Lookup:**
   - Valid productId → returns product details
   - Invalid productId → throws error
   - Missing fields → handles gracefully

3. **Cart Update Logic:**
   - New item → added with quantity 1
   - Existing item → quantity incremented
   - TotalPrice calculation → correct sum
   - TotalWeight calculation → correct sum

**Mocking Strategy:**
- Mock `llrpjs` LLRPClient to simulate tag reports
- Mock Mongoose models with in-memory data
- Mock Socket.IO emit function to verify events

### Integration Testing

**Test Scenarios:**

1. **End-to-End Tag Processing:**
   - Simulate RO_ACCESS_REPORT → verify cart updated in test database
   - Verify Socket.IO event emitted with correct cart data

2. **Multiple Readers:**
   - Start two RFID services with different cartIds
   - Verify tags update correct carts independently

3. **Coexistence with Simulation:**
   - Send simulated RFID scan via Socket.IO
   - Send real RFID tag via LLRP
   - Verify both update carts correctly

### Manual Testing Checklist

1. **Hardware Setup:**
   - [ ] R420 reader powered on and connected to network
   - [ ] Reader configured with ROSpec via Impinj web UI
   - [ ] RFID tags programmed with valid productIds

2. **Service Startup:**
   - [ ] Backend starts without errors
   - [ ] RFID service logs "Connected to reader: <IP>"
   - [ ] MongoDB connection successful

3. **Tag Reading:**
   - [ ] Place tagged item near antenna
   - [ ] Verify console log: "Tag seen: <EPC> for cart <cartId>"
   - [ ] Verify cart updated in database
   - [ ] Verify frontend receives updateCart event

4. **Debouncing:**
   - [ ] Hold tag near antenna for 5 seconds
   - [ ] Verify item added only once (not multiple times)

5. **Error Scenarios:**
   - [ ] Disconnect reader → verify service logs error but doesn't crash
   - [ ] Scan unknown tag → verify warning logged, cart unchanged
   - [ ] Use non-existent cartId → verify warning logged

### Performance Testing

**Metrics to Monitor:**
- Tag read latency (time from tag detection to cart update)
- Database write throughput (carts updated per second)
- Memory usage of debounce Map (should not grow unbounded)

**Expected Performance:**
- Tag processing: < 500ms from detection to cart save
- Support for 10+ simultaneous readers without degradation
- Debounce Map cleanup: implement periodic cleanup of old entries (> 1 hour old)

## Configuration and Deployment

### Environment Variables

Add to `backend/.env`:
```
# RFID Reader Configuration
RFID_READER_HOST=192.168.0.143
RFID_CART_ID=1234
RFID_ENABLED=true
```

Add to `simulation/.env` (or Raspberry Pi configuration):
```
# Backend Connection
BACKEND_URL=http://192.168.0.100:8001

# Cart Configuration
CART_ID=1234

# HX711 GPIO Configuration
HX711_DT_PIN=5
HX711_SCK_PIN=6

# Weight Sensor Settings
WEIGHT_UPDATE_INTERVAL=1000  # milliseconds
WEIGHT_CALIBRATION_FACTOR=1.0  # adjust based on load cell calibration
```

### Multi-Reader Configuration (Future Enhancement)

For multiple readers, create `backend/config/rfidReaders.json`:
```json
{
  "readers": [
    {
      "readerHost": "192.168.0.143",
      "cartId": "1234",
      "enabled": true
    },
    {
      "readerHost": "192.168.0.144",
      "cartId": "5678",
      "enabled": true
    }
  ]
}
```

### R420 Reader Configuration

**Prerequisites:**
1. Access Impinj R420 web interface (http://<reader-ip>)
2. Configure ROSpec with:
   - Trigger: Continuous reading
   - Antenna: All antennas enabled
   - Report format: EPC only (minimal data for performance)
   - Report trigger: On tag read (immediate)

**Note:** The RFID service assumes ROSpecs are pre-configured. Programmatic ROSpec management via LLRP can be added in future iterations if needed.

### Deployment Steps

**Backend:**
1. Install dependencies: `npm install llrpjs` (in backend directory)
2. Create new files (no modifications to existing files):
   - `backend/services/rfidReaderService.js`
   - `backend/routes/rfidRoutes.js`
   - `backend/initRFID.js`
3. Configure environment variables in `backend/.env`:
   ```
   RFID_ENABLED=true
   RFID_READER_HOST=192.168.0.143
   RFID_CART_ID=1234
   ```
4. Optionally add 2 lines to end of `backend/index.js` to enable RFID (or run as separate process)
5. Ensure CartItem collection has products with matching productIds
6. Create cart via `/api/admin/addCart` with matching cartId

**Frontend:**
1. Create new files (no modifications to existing files):
   - `client/src/pages/RFIDMonitorPage.js`
   - `client/src/styles/rfid-monitor.css`
2. Add one route to `client/src/App.js`:
   ```javascript
   <Route path="/rfid-monitor" element={<RFIDMonitorPage />} />
   ```

**Raspberry Pi Weight Sensor:**
1. Install Python dependencies on Raspberry Pi:
   ```bash
   pip install python-socketio[client] hx711 RPi.GPIO
   ```
2. Connect HX711 load cell to Raspberry Pi:
   - HX711 VCC → Pi 5V
   - HX711 GND → Pi GND
   - HX711 DT → Pi GPIO 5
   - HX711 SCK → Pi GPIO 6
3. Create `simulation/weight_sensor_service.py` with weight reading logic
4. Configure environment variables (BACKEND_URL, CART_ID, GPIO pins)
5. Test weight sensor:
   ```bash
   python simulation/weight_sensor_service.py
   ```
6. (Optional) Set up systemd service for auto-start on boot:
   ```bash
   sudo cp weight-sensor.service /etc/systemd/system/
   sudo systemctl enable weight-sensor
   sudo systemctl start weight-sensor
   ```

**Testing:**
1. Start backend: `npm start`
2. Start frontend: `npm start`
3. Start Raspberry Pi weight sensor: `python simulation/weight_sensor_service.py`
4. Navigate to `http://localhost:3000/rfid-monitor`
5. Verify RFID connection status displayed
6. Verify weight measurements appearing in real-time
7. Test with tagged items and observe weight changes
8. Check for weight discrepancy alerts when expected vs measured weight differs

## Security Considerations

1. **Network Security:**
   - R420 reader should be on isolated VLAN or private network
   - LLRP port (5084) should not be exposed to public internet

2. **Input Validation:**
   - Validate EPC format before database queries
   - Sanitize EPC strings to prevent injection attacks

3. **Rate Limiting:**
   - Debounce mechanism prevents tag flooding
   - Consider additional rate limiting if needed (e.g., max 100 tags/minute per reader)

4. **Access Control:**
   - RFID service runs with same database permissions as Express app
   - No additional authentication needed (reader is trusted hardware)

## Transition Strategy: Simulation to Real Hardware

### Current State (Simulation)
- `simulation/simulate_pi.py` - Sends fake RFID scans via Socket.IO
- `simulation/weight_sensor.py` - Returns hardcoded weight value (0.33 kg)
- Both run on development machine, not actual Raspberry Pi

### Target State (Production Hardware)
- **RFID**: Impinj R420 reader connected via LLRP (replaces simulated RFID scans)
- **Weight**: HX711 load cell on Raspberry Pi (replaces hardcoded weight)

### Migration Path

**Phase 1: Keep Simulation Alongside New Hardware (Current)**
- Existing simulation code remains untouched
- New RFID service runs independently
- New weight sensor service runs on Raspberry Pi
- Both systems can coexist for testing

**Phase 2: Gradual Hardware Adoption**
- Test RFID reader with real tags while simulation still available
- Test weight sensor with real load cell while simulation still available
- Compare results between simulation and hardware

**Phase 3: Hardware-Only Mode**
- Disable simulation by not running `simulate_pi.py`
- Production carts use only R420 + HX711
- Simulation scripts kept for development/testing purposes

### Weight Sensor Architecture

**Automatic Hardware Detection:**
```python
# simulation/weight_sensor.py (updated)
try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True
except ImportError:
    REAL_HARDWARE = False  # Fallback to simulation

def get_weight():
    if REAL_HARDWARE:
        return hx.get_weight(5)  # Real HX711 reading
    else:
        return 0.33  # Simulated weight
```

**Benefits:**
- Same code runs on both development machine and Raspberry Pi
- No code changes needed when deploying to hardware
- Developers can test without physical hardware

### Raspberry Pi Setup Checklist

**Hardware Requirements:**
- Raspberry Pi 3/4/5 (any model with GPIO)
- HX711 load cell amplifier module
- Load cell (strain gauge) rated for expected cart weight (e.g., 50kg capacity)
- Power supply for Raspberry Pi
- Network connection (WiFi or Ethernet)

**Software Requirements:**
- Raspberry Pi OS (Raspbian)
- Python 3.7+
- GPIO access enabled (`sudo raspi-config` → Interface Options → Enable GPIO)

**Wiring Diagram:**
```
Load Cell → HX711 → Raspberry Pi
  Red    → E+
  Black  → E-
  White  → A-
  Green  → A+
           VCC → Pi Pin 2 (5V)
           GND → Pi Pin 6 (GND)
           DT  → Pi Pin 29 (GPIO 5)
           SCK → Pi Pin 31 (GPIO 6)
```

**Calibration Process:**
1. Run weight sensor with no load → zero calibration
2. Place known weight (e.g., 1kg) on load cell
3. Adjust `WEIGHT_CALIBRATION_FACTOR` until reading matches known weight
4. Save calibration factor to configuration

## Future Enhancements

1. **Item Removal Detection:**
   - Implement "remove mode" toggle
   - When enabled, tag reads decrement quantity instead of increment

2. **Programmatic ROSpec Management:**
   - Add LLRP commands to configure reader on startup
   - Eliminate manual web UI configuration requirement

3. **Multi-Reader Support:**
   - Load reader configurations from JSON file
   - Support dynamic reader addition/removal without restart

4. **Advanced Debouncing:**
   - Implement sliding window debounce
   - Different cooldown periods for add vs. remove operations

5. **Tag Event History:**
   - Log all tag reads to separate collection for analytics
   - Track item dwell time in cart

6. **Reader Health Monitoring:**
   - Periodic health checks via LLRP GET_READER_CAPABILITIES
   - Alert if reader becomes unresponsive

7. **EPC Mapping Layer:**
   - Decouple EPC from productId
   - Support multiple EPCs mapping to same product
