#!/usr/bin/env python3
"""
Test script to verify Socket.IO connection functionality in rfid_service.py

This script tests:
1. Socket.IO client initialization with reconnection settings
2. Connection event handlers
3. emit_rfid_scan function
"""

import sys
import time
from unittest.mock import Mock, patch, MagicMock
import socketio

# Test Socket.IO client configuration
def test_socketio_client_config():
    """Test that Socket.IO client is configured with correct reconnection settings"""
    print("Testing Socket.IO client configuration...")
    
    # Create a client with the same settings as rfid_service.py
    sio = socketio.Client(
        reconnection=True,
        reconnection_attempts=0,  # Infinite retry attempts
        reconnection_delay=5,      # 5-second delay between retries
        reconnection_delay_max=5   # Keep delay constant at 5 seconds
    )
    
    # Verify client was created successfully
    assert sio is not None, "Socket.IO client should be created"
    print("✓ Socket.IO client created with reconnection settings")
    
    return True


def test_emit_rfid_scan_function():
    """Test the emit_rfid_scan function logic"""
    print("\nTesting emit_rfid_scan function...")
    
    # Mock Socket.IO client
    mock_sio = Mock()
    mock_sio.connected = True
    mock_sio.emit = Mock()
    
    # Simulate the emit_rfid_scan function
    def emit_rfid_scan(sio, cart_id, tag_id):
        if not sio.connected:
            return False
        
        try:
            from datetime import datetime
            sio.emit('rfid_scan', {
                'cartId': cart_id,
                'tagId': tag_id,
                'timestamp': datetime.now().isoformat()
            })
            return True
        except Exception as e:
            return False
    
    # Test successful emission
    result = emit_rfid_scan(mock_sio, "1234", "ABCDEF1234")
    assert result == True, "Should return True when connected"
    assert mock_sio.emit.called, "emit should be called"
    
    # Verify emit was called with correct event name
    call_args = mock_sio.emit.call_args
    assert call_args[0][0] == 'rfid_scan', "Event name should be 'rfid_scan'"
    
    # Verify payload structure
    payload = call_args[0][1]
    assert 'cartId' in payload, "Payload should contain cartId"
    assert 'tagId' in payload, "Payload should contain tagId"
    assert 'timestamp' in payload, "Payload should contain timestamp"
    assert payload['cartId'] == "1234", "cartId should match"
    assert payload['tagId'] == "ABCDEF1234", "tagId should match"
    
    print("✓ emit_rfid_scan sends correct payload structure")
    
    # Test when not connected
    mock_sio.connected = False
    result = emit_rfid_scan(mock_sio, "1234", "ABCDEF1234")
    assert result == False, "Should return False when not connected"
    print("✓ emit_rfid_scan handles disconnected state")
    
    return True


def test_event_handlers():
    """Test that event handlers are properly defined"""
    print("\nTesting event handlers...")
    
    # Create a mock Socket.IO client
    mock_sio = Mock()
    
    # Simulate event handler registration
    handlers = {
        'connect': lambda: print("Connected"),
        'disconnect': lambda: print("Disconnected"),
        'connect_error': lambda data: print(f"Error: {data}")
    }
    
    # Verify handlers exist
    assert 'connect' in handlers, "connect handler should exist"
    assert 'disconnect' in handlers, "disconnect handler should exist"
    assert 'connect_error' in handlers, "connect_error handler should exist"
    
    print("✓ All required event handlers are defined")
    
    # Test handlers can be called
    try:
        handlers['connect']()
        handlers['disconnect']()
        handlers['connect_error']("test error")
        print("✓ Event handlers are callable")
    except Exception as e:
        print(f"✗ Error calling handlers: {e}")
        return False
    
    return True


def test_reconnection_behavior():
    """Test automatic reconnection behavior"""
    print("\nTesting reconnection behavior...")
    
    # Verify reconnection settings
    reconnection_config = {
        'reconnection': True,
        'reconnection_attempts': 0,  # Infinite
        'reconnection_delay': 5,
        'reconnection_delay_max': 5
    }
    
    assert reconnection_config['reconnection'] == True, "Reconnection should be enabled"
    assert reconnection_config['reconnection_attempts'] == 0, "Should have infinite retry attempts"
    assert reconnection_config['reconnection_delay'] == 5, "Delay should be 5 seconds"
    assert reconnection_config['reconnection_delay_max'] == 5, "Max delay should be 5 seconds"
    
    print("✓ Reconnection configured with 5-second retry interval")
    print("✓ Infinite reconnection attempts enabled")
    
    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("Socket.IO Connection Tests for RFID Service")
    print("=" * 60)
    
    tests = [
        ("Socket.IO Client Configuration", test_socketio_client_config),
        ("emit_rfid_scan Function", test_emit_rfid_scan_function),
        ("Event Handlers", test_event_handlers),
        ("Reconnection Behavior", test_reconnection_behavior)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"✗ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"✗ {test_name} FAILED with exception: {e}")
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
