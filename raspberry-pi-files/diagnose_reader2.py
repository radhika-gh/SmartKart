#!/usr/bin/env python3
"""
Diagnostic script for Reader 2 (USB UART)
Tests serial connection and reads raw data
"""

import serial
import time
import sys

READER_2_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600

print("=" * 60)
print("Reader 2 Diagnostic Tool")
print("=" * 60)
print(f"Port: {READER_2_PORT}")
print(f"Baud Rate: {BAUD_RATE}")
print("=" * 60)

# Test 1: Check if port exists
print("\n[Test 1] Checking if port exists...")
try:
    import os
    if os.path.exists(READER_2_PORT):
        print(f"✓ Port {READER_2_PORT} exists")
        # Check permissions
        import stat
        st = os.stat(READER_2_PORT)
        print(f"  Permissions: {oct(st.st_mode)[-3:]}")
        print(f"  Owner: UID {st.st_uid}, GID {st.st_gid}")
    else:
        print(f"✗ Port {READER_2_PORT} does NOT exist")
        print("\nTroubleshooting:")
        print("1. Check if USB device is connected: lsusb")
        print("2. Check available serial ports: ls -la /dev/tty*")
        print("3. Check kernel messages: dmesg | grep tty")
        sys.exit(1)
except Exception as e:
    print(f"✗ Error checking port: {e}")
    sys.exit(1)

# Test 2: Try to open serial connection
print("\n[Test 2] Attempting to open serial connection...")
try:
    ser = serial.Serial(
        port=READER_2_PORT,
        baudrate=BAUD_RATE,
        timeout=1,
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE
    )
    print(f"✓ Successfully opened {READER_2_PORT}")
    print(f"  Is open: {ser.is_open}")
    print(f"  Baudrate: {ser.baudrate}")
    print(f"  Timeout: {ser.timeout}s")
except serial.SerialException as e:
    print(f"✗ Failed to open port: {e}")
    print("\nTroubleshooting:")
    print("1. Check if another process is using the port: sudo lsof /dev/ttyUSB0")
    print("2. Check permissions: ls -la /dev/ttyUSB0")
    print("3. Add user to dialout group: sudo usermod -a -G dialout $USER")
    print("4. Try with sudo: sudo python3 diagnose_reader2.py")
    sys.exit(1)
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    sys.exit(1)

# Test 3: Check if data is available
print("\n[Test 3] Checking for incoming data...")
print("Waiting 5 seconds for data... (scan a tag now)")
print("Press Ctrl+C to stop")

try:
    start_time = time.time()
    bytes_received = 0
    packets_received = 0
    
    while time.time() - start_time < 5:
        if ser.in_waiting > 0:
            # Read available bytes
            data = ser.read(ser.in_waiting)
            bytes_received += len(data)
            
            print(f"\n[{time.time() - start_time:.1f}s] Received {len(data)} bytes:")
            print(f"  Raw bytes: {data.hex()}")
            print(f"  ASCII: {data}")
            
            # Check if it looks like RDM6300 packet
            if len(data) == 14 and data[0] == 0x02 and data[13] == 0x03:
                packets_received += 1
                tag_id = data[1:11].decode('ascii', errors='ignore')
                print(f"  ✓ Valid RDM6300 packet detected!")
                print(f"  Tag ID: {tag_id}")
            elif 0x02 in data:
                print(f"  ⚠ Partial packet detected (contains STX)")
            
        time.sleep(0.1)
    
    print(f"\n[Test 3] Results:")
    print(f"  Total bytes received: {bytes_received}")
    print(f"  Valid packets: {packets_received}")
    
    if bytes_received == 0:
        print("\n✗ NO DATA RECEIVED")
        print("\nTroubleshooting:")
        print("1. Check physical connections:")
        print("   - Reader TX → USB adapter RX")
        print("   - Reader RX → USB adapter TX")
        print("   - Reader GND → USB adapter GND")
        print("   - Reader VCC → 5V power")
        print("2. Check if reader has power (LED should be on)")
        print("3. Try scanning a tag closer to the reader")
        print("4. Check if reader is working by testing with Reader 1's port")
        print("5. Try different baud rate: 9600, 19200, 115200")
    elif packets_received == 0:
        print("\n⚠ Data received but no valid packets")
        print("\nTroubleshooting:")
        print("1. Wrong baud rate - try 19200 or 115200")
        print("2. Wrong reader type - not RDM6300?")
        print("3. Electrical noise - check connections")
    else:
        print("\n✓ Reader 2 is working correctly!")
        
except KeyboardInterrupt:
    print("\n\nStopped by user")
except Exception as e:
    print(f"\n✗ Error during test: {e}")
finally:
    ser.close()
    print("\nSerial port closed")

print("\n" + "=" * 60)
print("Diagnostic complete")
print("=" * 60)
