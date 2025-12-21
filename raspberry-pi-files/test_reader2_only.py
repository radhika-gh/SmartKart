#!/usr/bin/env python3
"""
Test Reader 2 in isolation to check if it's a power/interference issue
"""

import serial
import time
import socketio
from datetime import datetime

BACKEND_URL = "http://192.168.1.100:8001"
CART_ID = "1234"
READER_2_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600
PACKET_SIZE = 14

sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=5, reconnection_delay_max=5)

@sio.event
def connect():
    print(f"✓ Connected to backend")

@sio.event
def disconnect():
    print("✗ Disconnected from backend")

print("=" * 60)
print("Reader 2 ONLY Test")
print("=" * 60)

# Initialize ONLY Reader 2
try:
    reader2 = serial.Serial(READER_2_PORT, BAUD_RATE, timeout=0.1)
    print(f"✓ Reader 2 initialized: {READER_2_PORT}")
except Exception as e:
    print(f"✗ Failed: {e}")
    exit(1)

# Connect to backend
try:
    sio.connect(BACKEND_URL)
except:
    print("Backend not connected, continuing anyway...")

print("\nScanning with Reader 2 only... Press Ctrl+C to stop\n")

buffer = b''
scan_count = 0

try:
    while True:
        # Read from Reader 2
        if reader2.in_waiting > 0:
            buffer += reader2.read(reader2.in_waiting)
        
        # Look for valid packet
        if len(buffer) == 0:
            time.sleep(0.05)
            continue
        
        stx_index = buffer.find(0x02)
        if stx_index == -1:
            buffer = b''
            continue
        
        if stx_index > 0:
            buffer = buffer[stx_index:]
        
        if len(buffer) < PACKET_SIZE:
            if len(buffer) > 50:
                buffer = b''
            time.sleep(0.05)
            continue
        
        if buffer[13] == 0x03:
            packet = buffer[0:PACKET_SIZE]
            try:
                tag_id = packet[1:11].decode('ascii').upper()
                if all(c in '0123456789ABCDEF' for c in tag_id):
                    scan_count += 1
                    print(f"[Scan #{scan_count}] Reader 2: {tag_id}")
                    
                    # Emit to backend
                    if sio.connected:
                        sio.emit('rfid_scan', {
                            'cartId': CART_ID,
                            'tagId': tag_id,
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    buffer = buffer[PACKET_SIZE:]
                else:
                    buffer = buffer[PACKET_SIZE:]
            except:
                buffer = buffer[PACKET_SIZE:]
        else:
            buffer = buffer[1:]
        
        time.sleep(0.05)

except KeyboardInterrupt:
    print(f"\n\nTotal scans: {scan_count}")
finally:
    reader2.close()
    if sio.connected:
        sio.disconnect()
    print("Stopped")
