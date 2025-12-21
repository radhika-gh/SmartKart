# Design Document

## Overview

This design integrates **two RDM6300 RFID readers** with the existing HX711 weight sensor system to enable automatic product addition and removal in the SmartKart shopping cart. The solution uses a **toggle-based approach**: 

- **If product is NOT in cart** → Scan adds it (from either reader)
- **If product IS in cart** → Scan removes it (from either reader)

Both readers serve the same purpose - they're just positioned at different locations for convenience. The system maintains cart state in the backend database to determine whether a scan should add or remove.

The solution consists of three main components:

1. **RFID Service** (Raspberry Pi) - Reads tags from two readers and implements 3-second cooldown to prevent duplicate scans
2. **Weight Service** (Raspberry Pi) - Already implemented, continues monitoring weight for verification
3. **Backend Integration** (Node.js) - Implements toggle logic based on current cart state

**Key Innovation**: The backend checks if the scanned product is already in the cart. If yes → remove it. If no → add it. This allows users to scan products at any reader location for both adding and removing.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Raspberry Pi                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              RFID Service (NEW)                       │  │
│  │                                                        │  │
│  │  ┌──────────────┐         ┌──────────────┐          │  │
│  │  │  Reader 1    │         │  Reader 2    │          │  │
│  │  │  /dev/serial0│         │  /dev/ttyUSB0│          │  │
│  │  │  (GPIO UART) │         │  (USB UART)  │          │  │
│  │  └──────┬───────┘         └──────┬───────┘          │  │
│  │         │                        │                   │  │
│  │         └────────┬───────────────┘                   │  │
│  │                  │                                    │  │
│  │         ┌────────▼────────┐                          │  │
│  │         │  Tag Processor  │                          │  │
│  │         │  - Cooldown     │                          │  │
│  │         │  - Deduplication│                          │  │
│  │         └────────┬────────┘                          │  │
│  │                  │                                    │  │
│  │                  │ Socket.IO                          │  │
│  │                  │ (rfid_scan)                        │  │
│  └──────────────────┼──────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────┼──────────────────────────────────┐  │
│  │  Weight Service  │                                   │  │
│  │  (EXISTING)      │                                   │  │
│  │                  │                                   │  │
│  │  - HX711 Read    │                                   │  │
│  │  - Socket Emit   │                                   │  │
│  └──────────────────┼──────────────────────────────────┘  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      │ Socket.IO
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Backend Server                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Socket.IO Event Handlers                    │  │
│  │                                                        │  │
│  │  rfid_scan handler ──┐                                │  │
│  │                      │                                │  │
│  │                      ▼                                │  │
│  │              ┌───────────────┐                        │  │
│  │              │ Product Lookup│                        │  │
│  │              └───────┬───────┘                        │  │
│  │                      │                                │  │
│  │                      ▼                                │  │
│  │              ┌───────────────┐                        │  │
│  │              │ Check if in   │                        │  │
│  │              │ Cart Already  │                        │  │
│  │              └───────┬───────┘                        │  │
│  │                      │                                │  │
│  │         ┌────────────┴────────────┐                  │  │
│  │         │                         │                  │  │
│  │         ▼                         ▼                  │  │
│  │   ┌──────────┐            ┌──────────┐              │  │
│  │   │   ADD    │            │  REMOVE  │              │  │
│  │   │ Product  │            │ Product  │              │  │
│  │   └────┬─────┘            └────┬─────┘              │  │
│  │        │                       │                    │  │
│  │        └───────────┬───────────┘                    │  │
│  │                    │                                │  │
│  │                    ▼                                │  │
│  │            ┌───────────────┐                        │  │
│  │            │ Emit updateCart│                       │  │
│  │            └───────────────┘                        │  │
│  │                                                      │  │
│  │  weight_update handler (EXISTING - Enhanced)        │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              MongoDB Cart Collection                   │ │
│  │                                                        │ │
│  │  - items[]                                             │ │
│  │  - totalWeight (expected)                              │ │
│  │  - measuredWeight (from load cell)                     │ │
│  │  - weightDiscrepancy                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Product Addition Flow (Product NOT in Cart)
1. User scans product with RFID tag at **either reader**
2. RDM6300 sends 14 bytes via serial (continuously while tag is near)
3. RFID Service extracts Tag_ID and checks cooldown cache
4. If not in cooldown (>3s since last scan), emit `rfid_scan` event
5. Backend looks up product by Tag_ID
6. Backend checks if product is in cart → **NOT FOUND**
7. Backend **ADDS** product to cart, updates expected weight
8. Backend emits `updateCart` to frontend with action='add'
9. Weight Service detects weight increase
10. Backend verifies measured vs expected weight

#### Product Removal Flow (Product IS in Cart)
1. User scans same product at **either reader** (doesn't matter which)
2. RDM6300 sends 14 bytes via serial (continuously while tag is near)
3. RFID Service extracts Tag_ID and checks cooldown cache
4. If not in cooldown (>3s since last scan), emit `rfid_scan` event
5. Backend looks up product by Tag_ID
6. Backend checks if product is in cart → **FOUND**
7. Backend **REMOVES** product from cart, updates expected weight
8. Backend emits `updateCart` to frontend with action='remove'
9. Weight Service detects weight decrease
10. Backend verifies measured vs expected weight

#### Continuous Read Handling (THE KEY PROBLEM)
The challenge: Each reader continuously outputs tag data while the tag is in range. A 3-second scan = 30+ reads.

**Solution - 3-Second Cooldown**:
1. First read of tag "ABC123" → Process it (add or remove based on cart state)
2. Store "ABC123" with timestamp in cache
3. Next 29 reads of "ABC123" within 3 seconds → **IGNORE ALL**
4. After 3 seconds → Cache entry expires
5. Next read of "ABC123" → Process it again (toggle action)

This means:
- Hold tag near reader for 2 seconds → Only 1 action (add OR remove)
- Wait 3+ seconds → Scan again → Opposite action (remove OR add)
- Both readers share the same cache, so scanning at reader 1 then immediately at reader 2 won't cause duplicates

## Components and Interfaces

### 1. RFID Service (New Python Service)

**File**: `raspberry-pi-files/rfid_service.py`

**Responsibilities**:
- Read RFID tags from **two RDM6300 readers** simultaneously
- Parse 14-byte data packets and extract Tag_ID
- Implement duplicate detection with 3-second cooldown cache
- Emit RFID scan events to backend via Socket.IO
- Handle connection errors and reconnection

**Key Functions**:

```python
def initialize_readers():
    """Initialize both serial connections"""
    # Reader 1: /dev/serial0 (GPIO UART)
    # Reader 2: /dev/ttyUSB0 (USB UART)
    # Baud: 9600, Timeout: 0.1 seconds
    
def read_tag(serial_connection):
    """Extract Tag_ID from 14-byte RDM6300 packet"""
    # Format: [STX][10-char Tag ID][2-char checksum][ETX]
    # Return: 10-character Tag_ID string or None
    
def is_in_cooldown(tag_id, cache, cooldown=3):
    """Check if tag was scanned within cooldown period"""
    # Return: True if in cooldown, False if ready
    
def update_cache(tag_id, cache):
    """Add/update tag in cache with current timestamp"""
    
def cleanup_cache(cache, cooldown=3):
    """Remove expired entries from cache"""
    # Run periodically to prevent memory growth
    
def emit_rfid_scan(sio, cart_id, tag_id):
    """Emit rfid_scan event to backend"""
    # Payload: { cartId, tagId, timestamp }
    
def main_loop(reader1, reader2, sio, cart_id):
    """Main loop that polls both readers"""
    # 1. Read from reader1
    # 2. Read from reader2
    # 3. Process any valid tags
    # 4. Check cooldown
    # 5. Emit if not in cooldown
    # 6. Update cache
    # 7. Cleanup cache periodically
```

**Cache Structure**:
```python
tag_cache = {
    "1234567890": 1703001234.56,  # tag_id: timestamp
    "0987654321": 1703001240.12
}
```

**Dual Reader Polling Logic**:
```python
while True:
    # Poll reader 1
    tag1 = read_tag(rfid1)
    if tag1 and not is_in_cooldown(tag1, tag_cache):
        emit_rfid_scan(sio, CART_ID, tag1)
        update_cache(tag1, tag_cache)
        print(f"[Reader 1] Scanned: {tag1}")
    
    # Poll reader 2  
    tag2 = read_tag(rfid2)
    if tag2 and not is_in_cooldown(tag2, tag_cache):
        emit_rfid_scan(sio, CART_ID, tag2)
        update_cache(tag2, tag_cache)
        print(f"[Reader 2] Scanned: {tag2}")
    
    # Cleanup old cache entries periodically
    if iteration_count % 100 == 0:
        cleanup_cache(tag_cache)
    
    time.sleep(0.05)  # 50ms delay between polls
```

**Important**: Both readers share the **same cache**. This prevents:
- Scanning at reader 1, then immediately at reader 2 causing duplicate action
- The cooldown applies globally to the tag, not per-reader

**Socket.IO Events**:
- **Emit**: `rfid_scan` - When valid, non-cooldown tag detected
- **Listen**: `connect`, `disconnect`, `connect_error`

### 2. Backend RFID Handler (New Socket Handler)

**File**: `backend/index.js` (modify existing socket handlers)

**New Socket Event Handler with Toggle Logic**:

```javascript
io.on("connection", (socket) => {
  // ... existing handlers ...
  
  socket.on("rfid_scan", async (data) => {
    try {
      const { cartId, tagId, timestamp } = data;
      
      // 1. Find cart
      const cart = await Cart.findOne({ cartId });
      if (!cart) {
        console.warn(`[RFID] Cart ${cartId} not found`);
        socket.emit("error", { message: "Cart not found" });
        return;
      }
      
      // 2. Look up product by RFID tag
      const product = await Item.findOne({ rfidTag: tagId });
      if (!product) {
        console.warn(`[RFID] Unknown tag: ${tagId}`);
        io.emit("unknownTag", { cartId, tagId, timestamp });
        return;
      }
      
      // 3. Check if product is already in cart (TOGGLE LOGIC)
      const existingItemIndex = cart.items.findIndex(item => 
        item.productId === product.productId
      );
      
      if (existingItemIndex !== -1) {
        // ===== REMOVE LOGIC =====
        const removedItem = cart.items[existingItemIndex];
        
        // Remove the item from cart
        cart.items.splice(existingItemIndex, 1);
        
        console.log(`[RFID] 🗑️  REMOVED ${product.name} from cart ${cartId}`);
        
      } else {
        // ===== ADD LOGIC =====
        cart.items.push({
          productId: product.productId,
          name: product.name,
          price: product.price,
          weight: product.weight,
          expiryDate: product.expiryDate,
          quantity: 1,
          image: product.image || "https://via.placeholder.com/150",
          addedAt: new Date()
        });
        
        console.log(`[RFID] ✅ ADDED ${product.name} to cart ${cartId}`);
      }
      
      // 4. Update totals
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity, 
        0
      );
      cart.totalWeight = cart.items.reduce(
        (sum, item) => sum + item.weight * item.quantity, 
        0
      );
      
      await cart.save();
      
      // 5. Emit update to frontend
      io.emit("updateCart", {
        ...cart.toObject(),
        action: existingItemIndex !== -1 ? 'remove' : 'add',
        affectedProduct: product.name
      });
      
    } catch (err) {
      console.error("[RFID] Error processing scan:", err.message);
      socket.emit("error", { message: err.message });
    }
  });
});
```

**Key Changes from Original Design**:
1. **No 10-second duplicate check** - Cooldown handled in RFID service
2. **Toggle logic** - Check if product exists, then add OR remove
3. **Simplified** - No quantity increment, just add/remove
4. **Action feedback** - Emit which action was taken for UI feedback

### 3. Database Schema Updates

**File**: `backend/models/CartItem.js` (modify existing)

Add RFID tag field to Item model:

```javascript
const ItemSchema = new mongoose.Schema({
  // ... existing fields ...
  rfidTag: { 
    type: String, 
    unique: true, 
    sparse: true,  // Allow null values
    index: true     // Index for fast lookups
  }
});
```

**File**: `backend/models/Cart.js` (modify existing)

Add timestamp tracking for items:

```javascript
const CartSchema = new mongoose.Schema({
  cartId: { type: String, required: true, unique: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      weight: { type: Number, required: true },
      expiryDate: { type: Date },
      quantity: { type: Number, default: 1 },
      image: { type: String, required: false },
      addedAt: { type: Date, default: Date.now }  // NEW: Track when added
    },
  ],
  // ... rest of existing fields ...
});
```

### 4. Weight Service Integration

**File**: `raspberry-pi-files/CLEAN_weight_sensor_service.py` (no changes needed)

The existing weight service continues to operate independently. The backend's existing `weight_update` handler already:
- Compares measured vs expected weight
- Sets `weightDiscrepancy` flag
- Emits `weightUpdate` events

No modifications required to weight service.

## Data Models

### RFID Scan Event Payload
```javascript
{
  cartId: "1234",           // 4-digit cart identifier
  tagId: "1234567890",      // 10-character RFID tag
  timestamp: "2024-01-20T10:30:45.123Z"
}
```

### Weight Update Event Payload (Existing)
```javascript
{
  cartId: "1234",
  measuredWeight: 2.456,
  expectedWeight: 2.500,
  discrepancy: false,
  timestamp: "2024-01-20T10:30:46.789Z"
}
```

### Cart Update Event Payload (Existing)
```javascript
{
  cartId: "1234",
  items: [
    {
      productId: "PROD001",
      name: "Apple",
      price: 1.99,
      weight: 0.2,
      quantity: 2,
      image: "https://...",
      addedAt: "2024-01-20T10:30:45.123Z"
    }
  ],
  totalPrice: 3.98,
  totalWeight: 0.4,
  measuredWeight: 0.42,
  weightDiscrepancy: false
}
```

### Unknown Tag Event Payload (New)
```javascript
{
  cartId: "1234",
  tagId: "9999999999",
  timestamp: "2024-01-20T10:30:45.123Z"
}
```

## Error Handling

### RFID Service Error Scenarios

1. **Serial Port Connection Failure**
   - Log error with details
   - Retry connection every 5 seconds
   - Continue running (don't crash)

2. **Invalid RFID Data**
   - Log malformed data
   - Skip packet and continue reading
   - Don't emit to backend

3. **Socket.IO Disconnection**
   - Log disconnection
   - Attempt reconnection automatically
   - Queue scans locally (optional enhancement)

4. **Serial Read Timeout**
   - Normal operation, continue loop
   - No error logging needed

### Backend Error Scenarios

1. **Unknown RFID Tag**
   - Log unknown tag with timestamp
   - Emit `unknownTag` event to frontend
   - Don't modify cart state

2. **Cart Not Found**
   - Log warning
   - Emit error to scanning device
   - Don't crash handler

3. **Database Save Failure**
   - Log error with stack trace
   - Emit error to frontend
   - Rollback cart state if possible

4. **Duplicate Product Addition**
   - Check `addedAt` timestamp
   - Ignore if within 10-second window
   - Log as duplicate prevention

### Weight Discrepancy Handling

1. **Discrepancy Detected (>0.5kg difference)**
   - Set `weightDiscrepancy` flag
   - Emit alert to frontend with details
   - Continue monitoring weight updates
   - Don't block cart operations

2. **Discrepancy Resolved**
   - Clear `weightDiscrepancy` flag
   - Emit resolution to frontend
   - Log resolution event

## Testing Strategy

### Unit Tests

1. **RFID Service**
   - Test Tag_ID extraction from 14-byte packets
   - Test cache duplicate detection logic
   - Test cache cleanup for expired entries
   - Test serial data parsing edge cases

2. **Backend RFID Handler**
   - Test product lookup by RFID tag
   - Test cart update logic
   - Test duplicate prevention (10-second window)
   - Test unknown tag handling
   - Test error scenarios (cart not found, etc.)

### Integration Tests

1. **RFID + Backend**
   - Simulate RFID scan event
   - Verify cart updated correctly
   - Verify frontend receives updateCart event
   - Test rapid repeated scans (10+ within 1 second)

2. **RFID + Weight + Backend**
   - Add product via RFID
   - Verify weight update triggers verification
   - Test discrepancy detection
   - Test discrepancy resolution

3. **Product Removal Detection**
   - Remove product physically
   - Verify weight decrease detected
   - Verify cart updated after 3-second window
   - Test false positive prevention

### Manual Testing Scenarios

1. **Normal Addition**
   - Scan RFID tag once
   - Verify product appears in cart
   - Verify weight matches expected

2. **Rapid Repeated Scans**
   - Hold tag near reader for 3 seconds
   - Verify only one product added
   - Check logs for duplicate prevention

3. **Unknown Tag**
   - Scan unregistered RFID tag
   - Verify unknownTag event emitted
   - Verify cart unchanged

4. **Weight Discrepancy**
   - Add product via RFID
   - Manually adjust weight sensor
   - Verify discrepancy alert shown
   - Return weight to normal
   - Verify alert clears

5. **Service Restart**
   - Stop RFID service
   - Restart RFID service
   - Verify reconnection successful
   - Verify scans work immediately

6. **Network Interruption**
   - Disconnect Raspberry Pi from network
   - Scan RFID tags
   - Reconnect network
   - Verify service reconnects automatically

## Implementation Notes

### RFID Tag Database Population

Before the system can work, products must have RFID tags assigned in the database. The RFID tag number (10-character string from RDM6300) must be stored with each product.

**Database Schema Addition**:
```javascript
// In backend/models/CartItem.js
const ItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  weight: { type: Number, required: true },
  rfidTag: { 
    type: String, 
    unique: true,      // Each tag maps to one product
    sparse: true,      // Allow products without tags
    index: true        // Fast lookup by tag
  },
  // ... other fields
});
```

**Tag Registration Process**:

Option 1: **Manual Database Update**
```javascript
// Update product with RFID tag
await Item.updateOne(
  { productId: "PROD001" },
  { $set: { rfidTag: "1234567890" } }
);
```

Option 2: **Admin Interface** (Recommended)
Create an admin page where you can:
1. Scan an RFID tag (displays the 10-digit number)
2. Select a product from dropdown
3. Click "Link" to associate tag with product
4. Save to database

Option 3: **Bulk Import Script**
```javascript
// Import from CSV: productId,tagId
const tagMappings = [
  { productId: "PROD001", rfidTag: "1234567890" },
  { productId: "PROD002", rfidTag: "0987654321" },
  // ...
];

for (const mapping of tagMappings) {
  await Item.updateOne(
    { productId: mapping.productId },
    { $set: { rfidTag: mapping.rfidTag } }
  );
}
```

**Tag Lookup Flow**:
1. RFID reader scans tag → Gets "1234567890"
2. Backend receives tagId: "1234567890"
3. Backend queries: `Item.findOne({ rfidTag: "1234567890" })`
4. If found → Get product details (name, price, weight)
5. If not found → Emit "unknownTag" event to frontend

**Important Notes**:
- Each RFID tag must be unique (one tag = one product type)
- If you have multiple units of same product, they should share the same tag
- The 10-character tag ID from RDM6300 is what gets stored
- Tags should be registered before products can be scanned in the cart

### Cooldown Period Tuning

The 3-second cooldown is designed to:
- **Prevent continuous reads**: Block 30+ scans during a single tag presentation
- **Allow quick toggle**: User can scan to add, then immediately remove if needed (after 3s)
- **Balance usability**: Not too short (duplicates) or too long (frustrating waits)

**Tuning Guidelines**:
- If users report double-adds: Increase to 4-5 seconds
- If users report slow removal: Decrease to 2 seconds
- Monitor logs for "ignored duplicate" messages

**Configuration**:
```python
# In rfid_service.py
COOLDOWN_SECONDS = 3  # Adjust based on testing
```

### Product Removal Enhancement (Future)

Current design uses **toggle-based removal** - scan once to add, scan again to remove. This is simple and reliable.

**Future Enhancements**:
- **Directional detection**: Use reader 1 for "entry" and reader 2 for "exit" only
- **Quantity support**: Allow multiple units of same product (scan 3 times = 3 units)
- **Manual override**: UI button to remove items without scanning
- **Scan history**: Show last 10 scans with timestamps in admin panel

### Performance Considerations

- RFID cache cleanup runs on every scan (lightweight)
- Database queries use indexed fields (`rfidTag`, `cartId`)
- Socket.IO events are non-blocking
- Weight updates continue independently

### Security Considerations

- Validate all incoming Socket.IO data
- Sanitize Tag_ID before database queries
- Rate limit RFID scan events per cart
- Log all unknown tag attempts for monitoring
