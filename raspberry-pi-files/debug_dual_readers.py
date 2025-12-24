#!/usr/bin/env python3
"""
Debug script to monitor both readers simultaneously
Shows exactly what's happening with each reader's buffer
"""

import serial
import time

READER_1_PORT = "/dev/serial0"
READER_2_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600
PACKET_SIZE = 14

print("=" * 60)
print("Dual Reader Debug Monitor")
print("=" * 60)

# Initialize both readers
try:
    reader1 = serial.Serial(READER_1_PORT, BAUD_RATE, timeout=0.1)
    print(f"✓ Reader 1 initialized: {READER_1_PORT}")
except Exception as e:
    print(f"✗ Reader 1 failed: {e}")
    reader1 = None

try:
    reader2 = serial.Serial(READER_2_PORT, BAUD_RATE, timeout=0.1)
    print(f"✓ Reader 2 initialized: {READER_2_PORT}")
except Exception as e:
    print(f"✗ Reader 2 failed: {e}")
    reader2 = None

if not reader1 and not reader2:
    print("No readers available!")
    exit(1)

print("\nMonitoring both readers... Press Ctrl+C to stop\n")

buffers = {'reader1': b'', 'reader2': b''}
scan_count = {'reader1': 0, 'reader2': 0}

try:
    iteration = 0
    while True:
        iteration += 1
        
        # Check Reader 1
        if reader1 and reader1.in_waiting > 0:
            new_data = reader1.read(reader1.in_waiting)
            buffers['reader1'] += new_data
            print(f"[{iteration}] Reader 1: +{len(new_data)} bytes, buffer={len(buffers['reader1'])} bytes")
            
            # Try to find packet
            data = buffers['reader1']
            for i in range(len(data) - PACKET_SIZE + 1):
                if data[i] == 0x02 and i + PACKET_SIZE <= len(data) and data[i + 13] == 0x03:
                    packet = data[i:i + PACKET_SIZE]
                    try:
                        tag_id = packet[1:11].decode('ascii')
                        if all(c in '0123456789ABCDEFabcdef' for c in tag_id):
                            scan_count['reader1'] += 1
                            print(f"  → Reader 1 SCAN #{scan_count['reader1']}: {tag_id.upper()}")
                            buffers['reader1'] = data[i + PACKET_SIZE:]
                            break
                    except:
                        pass
            
            # Limit buffer size
            if len(buffers['reader1']) > 200:
                old_size = len(buffers['reader1'])
                buffers['reader1'] = buffers['reader1'][-200:]
                print(f"  ⚠ Reader 1 buffer trimmed: {old_size} → {len(buffers['reader1'])}")
        
        # Check Reader 2
        if reader2 and reader2.in_waiting > 0:
            new_data = reader2.read(reader2.in_waiting)
            buffers['reader2'] += new_data
            print(f"[{iteration}] Reader 2: +{len(new_data)} bytes, buffer={len(buffers['reader2'])} bytes")
            
            # Try to find packet
            data = buffers['reader2']
            for i in range(len(data) - PACKET_SIZE + 1):
                if data[i] == 0x02 and i + PACKET_SIZE <= len(data) and data[i + 13] == 0x03:
                    packet = data[i:i + PACKET_SIZE]
                    try:
                        tag_id = packet[1:11].decode('ascii')
                        if all(c in '0123456789ABCDEFabcdef' for c in tag_id):
                            scan_count['reader2'] += 1
                            print(f"  → Reader 2 SCAN #{scan_count['reader2']}: {tag_id.upper()}")
                            buffers['reader2'] = data[i + PACKET_SIZE:]
                            break
                    except:
                        pass
            
            # Limit buffer size
            if len(buffers['reader2']) > 200:
                old_size = len(buffers['reader2'])
                buffers['reader2'] = buffers['reader2'][-200:]
                print(f"  ⚠ Reader 2 buffer trimmed: {old_size} → {len(buffers['reader2'])}")
        
        # Show status every 100 iterations
        if iteration % 100 == 0:
            print(f"\n[Status] Iteration {iteration}")
            print(f"  Reader 1: {scan_count['reader1']} scans, buffer={len(buffers['reader1'])} bytes")
            print(f"  Reader 2: {scan_count['reader2']} scans, buffer={len(buffers['reader2'])} bytes")
            print()
        
        time.sleep(0.05)

except KeyboardInterrupt:
    print("\n\nStopping...")
    print(f"\nFinal Stats:")
    print(f"  Reader 1: {scan_count['reader1']} total scans")
    print(f"  Reader 2: {scan_count['reader2']} total scans")

finally:
    if reader1:
        reader1.close()
    if reader2:
        reader2.close()
    print("Closed")
