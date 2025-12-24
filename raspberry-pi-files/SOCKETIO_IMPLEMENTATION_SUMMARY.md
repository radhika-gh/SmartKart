# Socket.IO Implementation Summary - Task 2.5

## Task Requirements
- ✅ Initialize Socket.IO client connection to backend
- ✅ Implement connection, disconnection, and error handlers
- ✅ Add automatic reconnection logic with 5-second retry interval
- ✅ Create function to emit rfid_scan events with cartId, tagId, and timestamp

## Implementation Details

### 1. Socket.IO Client Initialization (Lines 23-28)
```python
sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=0,  # Infinite retry attempts
    reconnection_delay=5,      # 5-second delay between retries
    reconnection_delay_max=5   # Keep delay constant at 5 seconds
)
```

**Features:**
- Automatic reconnection enabled
- Infinite retry attempts (reconnection_attempts=0)
- 5-second delay between reconnection attempts
- Constant delay (no exponential backoff)

### 2. Connection Event Handler (Lines 273-283)
```python
@sio.event
def connect():
    """
    Socket.IO connection event handler.
    
    Called when the RFID service successfully connects to the backend server.
    Logs connection status and cart ID for monitoring.
    """
    print(f"[RFID Service] ✓ Connected to backend at {BACKEND_URL}")
    print(f"[RFID Service] Cart ID: {CART_ID}")
```

**Features:**
- Logs successful connection with backend URL
- Displays cart ID for verification
- Uses clear visual indicators (✓)

### 3. Disconnection Event Handler (Lines 285-296)
```python
@sio.event
def disconnect():
    """
    Socket.IO disconnection event handler.
    
    Called when the connection to the backend is lost. The client will
    automatically attempt to reconnect every 5 seconds due to the
    reconnection configuration.
    """
    print("[RFID Service] ✗ Disconnected from backend")
    print("[RFID Service] Will attempt reconnection every 5 seconds...")
```

**Features:**
- Logs disconnection event
- Informs user about automatic reconnection
- Clear visual indicators (✗)

### 4. Connection Error Event Handler (Lines 298-315)
```python
@sio.event
def connect_error(data):
    """
    Socket.IO connection error event handler.
    
    Called when a connection attempt fails. This could be due to:
    - Backend server not running
    - Network connectivity issues
    - Invalid backend URL
    
    The client will automatically retry connection every 5 seconds.
    
    Args:
        data: Error information from Socket.IO client
    """
    print(f"[RFID Service] ✗ Connection error: {data}")
    print("[RFID Service] Retrying in 5 seconds...")
```

**Features:**
- Logs connection errors with details
- Documents common error scenarios
- Informs user about retry behavior

### 5. emit_rfid_scan Function (Lines 317-343)
```python
def emit_rfid_scan(cart_id, tag_id):
    """
    Emit an RFID scan event to the backend server.
    
    This function sends the scanned tag information to the backend via Socket.IO.
    The backend will use this data to look up the product and update the cart.
    
    Args:
        cart_id (str): The 4-digit cart identifier
        tag_id (str): The 10-character RFID tag ID
    
    Returns:
        bool: True if emission successful, False if not connected or error occurred
    """
    if not sio.connected:
        print(f"[RFID Service] Cannot emit scan - not connected to backend")
        return False
    
    try:
        sio.emit('rfid_scan', {
            'cartId': cart_id,
            'tagId': tag_id,
            'timestamp': datetime.now().isoformat()
        })
        return True
    except Exception as e:
        print(f"[RFID Service] Error emitting rfid_scan event: {e}")
        return False
```

**Features:**
- Checks connection status before emitting
- Sends all required fields: cartId, tagId, timestamp
- Returns success/failure status
- Handles exceptions gracefully
- Provides clear error messages

### 6. Integration in Main Loop (Lines 370-385)
The emit_rfid_scan function is called from the main polling loop:

```python
# Poll Reader 1 (GPIO UART)
if reader1 is not None:
    tag1 = read_tag(reader1)
    if tag1 is not None:
        if not is_in_cooldown(tag1, tag_cache):
            if emit_rfid_scan(CART_ID, tag1):
                print(f"[Reader 1] ✓ Scanned: {tag1}")
            else:
                print(f"[Reader 1] ⚠ Scanned: {tag1} (not connected to backend)")
            update_cache(tag1, tag_cache)
```

**Features:**
- Integrates seamlessly with existing cooldown logic
- Provides feedback on emission success/failure
- Continues operation even when disconnected
- Visual indicators for different states (✓, ⚠)

## Requirements Mapping

### Requirement 1.1
> WHEN THE RFID_Service detects a Tag_ID from the RDM6300 reader, THE RFID_Service SHALL emit the Tag_ID to the Backend_System via Socket.IO within 500 milliseconds

**Implementation:** emit_rfid_scan() function sends rfid_scan event immediately when tag is detected and not in cooldown.

### Requirement 4.5
> WHEN THE RFID_Service or Weight_Service loses connection to Backend_System, THE RFID_Service or Weight_Service SHALL attempt reconnection every 5 seconds

**Implementation:** Socket.IO client configured with:
- reconnection=True
- reconnection_delay=5
- reconnection_delay_max=5
- reconnection_attempts=0 (infinite retries)

## Testing Recommendations

1. **Connection Test:**
   - Start backend server
   - Start RFID service
   - Verify "Connected to backend" message appears

2. **Disconnection Test:**
   - Stop backend server while RFID service running
   - Verify "Disconnected from backend" message
   - Verify "Will attempt reconnection every 5 seconds" message

3. **Reconnection Test:**
   - With RFID service running and backend stopped
   - Restart backend server
   - Verify automatic reconnection within 5 seconds
   - Verify "Connected to backend" message appears

4. **Emission Test:**
   - With both services connected
   - Scan an RFID tag
   - Verify rfid_scan event is emitted to backend
   - Check backend logs for received event

5. **Offline Operation Test:**
   - Start RFID service without backend running
   - Scan RFID tags
   - Verify tags are detected but marked as "not connected to backend"
   - Start backend
   - Verify automatic reconnection
   - Scan tags again and verify they are sent to backend

## Conclusion

All requirements for Task 2.5 have been successfully implemented:
- ✅ Socket.IO client initialized with proper configuration
- ✅ Connection, disconnection, and error handlers implemented
- ✅ Automatic reconnection with 5-second retry interval
- ✅ emit_rfid_scan function sends cartId, tagId, and timestamp
- ✅ Graceful handling of connection failures
- ✅ Clear logging and user feedback
- ✅ Integration with existing RFID service logic
