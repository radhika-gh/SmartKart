#!/usr/bin/env python3

import serial
import time
import socketio
from datetime import datetime

# Configuration
BACKEND_URL = "http://192.168.1.100:8001"
CART_ID = "1234"

# Serial port configuration
READER_1_PORT = "/dev/ttyUSB0"  # USB UART (swapped - now the good reader)
READER_2_PORT = "/dev/serial0"  # GPIO UART (swapped - now the problematic reader)
BAUD_RATE = 9600
SERIAL_TIMEOUT = 0.1  # 100ms timeout for non-blocking reads

# RFID reader settings
COOLDOWN_SECONDS = 3
PACKET_SIZE = 14  # RDM6300 sends 14 bytes per read

# Socket.IO client with automatic reconnection
sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=0,  # Infinite retry attempts
    reconnection_delay=5,      # 5-second delay between retries
    reconnection_delay_max=5   # Keep delay constant at 5 seconds
)


def initialize_reader(port, reader_name):
    """
    Initialize a single RFID reader on the specified serial port.
    
    Args:
        port (str): Serial port path (e.g., '/dev/serial0')
        reader_name (str): Human-readable name for logging (e.g., 'Reader 1')
    
    Returns:
        serial.Serial: Initialized serial connection or None if failed
    """
    try:
        ser = serial.Serial(
            port=port,
            baudrate=BAUD_RATE,
            timeout=SERIAL_TIMEOUT,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE
        )
        print(f"[RFID Service] ✓ {reader_name} initialized on {port}")
        return ser
    except serial.SerialException as e:
        print(f"[RFID Service] ✗ Failed to initialize {reader_name} on {port}: {e}")
        return None
    except Exception as e:
        print(f"[RFID Service] ✗ Unexpected error initializing {reader_name}: {e}")
        return None


def initialize_readers():
    """
    Initialize both RFID readers (Reader_1 and Reader_2).
    
    Returns:
        tuple: (reader1, reader2) - Serial connections or None for failed readers
    """
    print("[RFID Service] Initializing RFID readers...")
    
    reader1 = initialize_reader(READER_1_PORT, "Reader 1 (GPIO UART)")
    reader2 = initialize_reader(READER_2_PORT, "Reader 2 (USB UART)")
    
    # Check if at least one reader initialized successfully
    if reader1 is None and reader2 is None:
        print("[RFID Service] ✗ CRITICAL: Both readers failed to initialize")
        return None, None
    
    if reader1 is None:
        print(f"[RFID Service] ⚠ Warning: Reader 1 unavailable, continuing with Reader 2 only")
    
    if reader2 is None:
        print(f"[RFID Service] ⚠ Warning: Reader 2 unavailable, continuing with Reader 1 only")
    
    print("[RFID Service] Reader initialization complete")
    return reader1, reader2


def is_in_cooldown(tag_id, cache, cooldown=COOLDOWN_SECONDS):
    """
    Check if a tag is currently in the cooldown period.
    
    The cooldown mechanism prevents duplicate processing of the same tag
    when it's held near the reader for an extended period. RDM6300 readers
    continuously output tag data while a tag is in range, which could result
    in 30+ reads per second. The cooldown ensures only one action per tag
    within the specified time window.
    
    Args:
        tag_id (str): The 10-character RFID tag ID to check
        cache (dict): Dictionary mapping tag IDs to their last scan timestamps
        cooldown (int): Cooldown period in seconds (default: COOLDOWN_SECONDS)
    
    Returns:
        bool: True if tag is in cooldown period, False if ready to process
    """
    if tag_id not in cache:
        return False
    
    last_scan_time = cache[tag_id]
    current_time = time.time()
    time_since_last_scan = current_time - last_scan_time
    
    return time_since_last_scan < cooldown


def update_cache(tag_id, cache):
    """
    Update the cache with a new tag scan timestamp.
    
    This function records the current time for a tag ID, marking when it was
    last successfully processed. This timestamp is used by is_in_cooldown()
    to prevent duplicate processing.
    
    Args:
        tag_id (str): The 10-character RFID tag ID to update
        cache (dict): Dictionary mapping tag IDs to their last scan timestamps
    
    Returns:
        None
    """
    cache[tag_id] = time.time()


def cleanup_cache(cache, cooldown=COOLDOWN_SECONDS):
    """
    Remove expired entries from the cooldown cache.
    
    This function prevents the cache from growing indefinitely by removing
    tag entries that are older than the cooldown period. Since these entries
    are no longer relevant for cooldown checks, removing them saves memory.
    
    This should be called periodically (e.g., every 100 iterations of the
    main loop) to maintain cache efficiency.
    
    Args:
        cache (dict): Dictionary mapping tag IDs to their last scan timestamps
        cooldown (int): Cooldown period in seconds (default: COOLDOWN_SECONDS)
    
    Returns:
        int: Number of expired entries removed from cache
    """
    current_time = time.time()
    expired_tags = []
    
    # Find all tags that have expired
    for tag_id, timestamp in cache.items():
        if current_time - timestamp > cooldown:
            expired_tags.append(tag_id)
    
    # Remove expired tags
    for tag_id in expired_tags:
        del cache[tag_id]
    
    return len(expired_tags)


def read_tag(serial_connection, buffer_dict, reader_id):
    """
    Read and parse RFID tag from RDM6300 reader with buffering.
    
    RDM6300 packet format (14 bytes):
    - Byte 0: STX (Start of Text) = 0x02
    - Bytes 1-10: 10-character ASCII tag ID
    - Bytes 11-12: 2-character ASCII checksum
    - Byte 13: ETX (End of Text) = 0x03
    
    Args:
        serial_connection (serial.Serial): Active serial connection to RFID reader
        buffer_dict (dict): Dictionary to store partial data between reads
        reader_id (str): Unique identifier for this reader ('reader1' or 'reader2')
    
    Returns:
        str: 10-character tag ID if valid packet received, None otherwise
    """
    if serial_connection is None:
        return None
    
    try:
        # Initialize buffer for this reader if it doesn't exist
        if reader_id not in buffer_dict:
            buffer_dict[reader_id] = b''
        
        # Check if any new data is available
        if serial_connection.in_waiting > 0:
            # Read new data and append to buffer
            new_data = serial_connection.read(serial_connection.in_waiting)
            buffer_dict[reader_id] += new_data
        
        # Get current buffer
        data = buffer_dict[reader_id]
        
        # If buffer is empty, nothing to process
        if len(data) == 0:
            return None
        
        # Search for STX (0x02) - start of valid packet
        stx_index = data.find(0x02)
        
        # If no STX found, clear buffer (all garbage)
        if stx_index == -1:
            buffer_dict[reader_id] = b''
            return None
        
        # If STX found but not at start, remove garbage before it
        if stx_index > 0:
            buffer_dict[reader_id] = data[stx_index:]
            data = buffer_dict[reader_id]
        
        # Check if we have enough data for a complete packet
        if len(data) < PACKET_SIZE:
            # Keep buffer, wait for more data
            # But limit buffer size to prevent memory issues
            if len(buffer_dict[reader_id]) > 50:
                # If buffer is too large and still incomplete, it's corrupted
                buffer_dict[reader_id] = b''
            return None
        
        # We have at least 14 bytes starting with STX
        # Check if byte 13 is ETX
        if data[13] == 0x03:
            # Valid packet structure found
            packet = data[0:PACKET_SIZE]
            
            # Extract 10-character tag ID (bytes 1-10)
            try:
                tag_id = packet[1:11].decode('ascii')
            except UnicodeDecodeError:
                # Invalid data, remove this packet and continue
                buffer_dict[reader_id] = data[PACKET_SIZE:]
                return None
            
            # Validate tag ID contains only valid hexadecimal characters
            if not all(c in '0123456789ABCDEFabcdef' for c in tag_id):
                # Invalid tag ID, remove this packet and continue
                buffer_dict[reader_id] = data[PACKET_SIZE:]
                return None
            
            # Extract 2-character checksum (bytes 11-12)
            try:
                checksum_str = packet[11:13].decode('ascii')
            except UnicodeDecodeError:
                # Invalid checksum, remove this packet and continue
                buffer_dict[reader_id] = data[PACKET_SIZE:]
                return None
            
            # Validate checksum format (should be hex characters)
            if not all(c in '0123456789ABCDEFabcdef' for c in checksum_str):
                # Invalid checksum format, remove this packet and continue
                buffer_dict[reader_id] = data[PACKET_SIZE:]
                return None
            
            # Verify checksum (XOR of tag ID bytes)
            try:
                # Convert tag ID from hex string to bytes
                tag_bytes = bytes.fromhex(tag_id)
                
                # Calculate XOR checksum
                calculated_checksum = 0
                for byte in tag_bytes:
                    calculated_checksum ^= byte
                
                # Convert received checksum from hex string to int
                received_checksum = int(checksum_str, 16)
                
                # Verify checksum matches
                if calculated_checksum != received_checksum:
                    # Checksum mismatch, remove this packet and continue
                    buffer_dict[reader_id] = data[PACKET_SIZE:]
                    return None
            except ValueError:
                # Error in checksum calculation, remove this packet and continue
                buffer_dict[reader_id] = data[PACKET_SIZE:]
                return None
            
            # Valid packet found - remove it from buffer and return tag ID
            buffer_dict[reader_id] = data[PACKET_SIZE:]
            return tag_id.upper()
        else:
            # STX found but ETX not in right position
            # This might be a partial packet or corrupted data
            # Remove the STX and look for the next one
            buffer_dict[reader_id] = data[1:]
            return None
        
    except serial.SerialException as e:
        # Serial port error - log but don't crash
        print(f"[RFID Service] Serial read error: {e}")
        return None
    except Exception as e:
        # Unexpected error - log but don't crash
        print(f"[RFID Service] Unexpected error reading tag: {e}")
        return None


@sio.event
def connect():
    """
    Socket.IO connection event handler.
    
    Called when the RFID service successfully connects to the backend server.
    Logs connection status and cart ID for monitoring.
    """
    print(f"[RFID Service] ✓ Connected to backend at {BACKEND_URL}")
    print(f"[RFID Service] Cart ID: {CART_ID}")


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


def main():
    print("=" * 60)
    print("SmartKart RFID Service - Dual Reader")
    print("=" * 60)
    print(f"Reader 1: {READER_1_PORT} (USB UART - SWAPPED)")
    print(f"Reader 2: {READER_2_PORT} (GPIO UART - SWAPPED)")
    print(f"Baud Rate: {BAUD_RATE}")
    print(f"Cooldown: {COOLDOWN_SECONDS}s")
    print("=" * 60)
    
    # Initialize readers
    reader1, reader2 = initialize_readers()
    
    if reader1 is None and reader2 is None:
        print("[RFID Service] Cannot start service without any working readers")
        return 1
    
    # Connect to backend with automatic reconnection
    try:
        print(f"[RFID Service] Connecting to backend at {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
        print("[RFID Service] Initial connection successful")
    except Exception as e:
        print(f"[RFID Service] Initial connection failed: {e}")
        print("[RFID Service] Service will continue and retry connection automatically every 5 seconds...")
    
    print("[RFID Service] Service started successfully")
    print("[RFID Service] Ready to scan RFID tags...")
    print("[RFID Service] Note: Cooldown handled by backend (5s)")
    
    # Initialize read buffers (separate for each reader)
    read_buffers = {}
    debug_counter = 0
    
    # Main polling loop - continuously poll both readers
    try:
        while True:
            debug_counter += 1
            
            # Poll Reader 1 (GPIO UART)
            if reader1 is not None:
                tag1 = read_tag(reader1, read_buffers, 'reader1')
                if tag1 is not None:
                    # Emit to backend immediately - backend handles cooldown
                    if emit_rfid_scan(CART_ID, tag1):
                        print(f"[Reader 1] ✓ Scanned: {tag1}")
                    else:
                        print(f"[Reader 1] ⚠ Scanned: {tag1} (not connected to backend)")
            
            # Small delay between reader polls to prevent interference
            time.sleep(0.01)
            
            # Poll Reader 2 (USB UART)
            if reader2 is not None:
                # Force clear any stale data in serial buffer if it's been sitting too long
                if reader2.in_waiting > 100:
                    print(f"[Debug] Reader 2 buffer overflow detected, clearing {reader2.in_waiting} bytes")
                    reader2.reset_input_buffer()
                    read_buffers['reader2'] = b''
                
                tag2 = read_tag(reader2, read_buffers, 'reader2')
                if tag2 is not None:
                    # Emit to backend immediately - backend handles cooldown
                    if emit_rfid_scan(CART_ID, tag2):
                        print(f"[Reader 2] ✓ Scanned: {tag2}")
                    else:
                        print(f"[Reader 2] ⚠ Scanned: {tag2} (not connected to backend)")
            
            # Debug: Show Reader 2 status every 200 iterations
            if debug_counter % 200 == 0 and reader2 is not None:
                r2_waiting = reader2.in_waiting
                r2_buffer_size = len(read_buffers.get('reader2', b''))
                if r2_waiting > 0 or r2_buffer_size > 0:
                    print(f"[Debug] Reader 2: serial_waiting={r2_waiting}, buffer={r2_buffer_size} bytes")
                    # Show buffer content for debugging
                    if r2_buffer_size > 0:
                        print(f"[Debug] Reader 2 buffer content: {read_buffers['reader2'].hex()}")
            
            # 40ms delay between poll cycles (reduced from 50ms since we added 10ms above)
            time.sleep(0.04)
            
    except KeyboardInterrupt:
        print("\n[RFID Service] Shutting down...")
    finally:
        # Cleanup
        if reader1:
            reader1.close()
            print("[RFID Service] Reader 1 closed")
        if reader2:
            reader2.close()
            print("[RFID Service] Reader 2 closed")
        if sio.connected:
            sio.disconnect()
        print("[RFID Service] Stopped")
    
    return 0


if __name__ == '__main__':
    exit(main())
