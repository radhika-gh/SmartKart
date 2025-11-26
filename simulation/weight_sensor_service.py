#!/usr/bin/env python3
"""
Weight Sensor Service for SmartKart System

This service reads weight measurements from an HX711 load cell amplifier
connected to a Raspberry Pi and sends the data to the backend via Socket.IO.

The service automatically detects if it's running on real hardware or in
simulation mode and adjusts behavior accordingly.
"""

import os
import time
import socketio
from datetime import datetime
from weight_sensor import get_weight, initialize_hx711, REAL_HARDWARE

# Configuration from environment variables with defaults
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001')
CART_ID = os.getenv('CART_ID', '1234')
WEIGHT_UPDATE_INTERVAL = float(os.getenv('WEIGHT_UPDATE_INTERVAL', '1.0'))  # seconds

# Create Socket.IO client
sio = socketio.Client()

# Connection event handlers
@sio.event
def connect():
    """Called when connection to backend is established"""
    print(f"[Weight Service] Connected to backend at {BACKEND_URL}")
    print(f"[Weight Service] Monitoring cart: {CART_ID}")
    print(f"[Weight Service] Update interval: {WEIGHT_UPDATE_INTERVAL}s")
    print(f"[Weight Service] Hardware mode: {'REAL' if REAL_HARDWARE else 'SIMULATION'}")

@sio.event
def disconnect():
    """Called when connection to backend is lost"""
    print("[Weight Service] Disconnected from backend")

@sio.event
def connect_error(data):
    """Called when connection attempt fails"""
    print(f"[Weight Service] Connection error: {data}")

def send_weight_update(cart_id, measured_weight):
    """
    Emit weight_update event to backend via Socket.IO
    
    Args:
        cart_id (str): The cart identifier
        measured_weight (float): Weight measurement in kilograms
    """
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        payload = {
            'cartId': cart_id,
            'measuredWeight': round(measured_weight, 3),  # Round to 3 decimal places
            'timestamp': timestamp
        }
        
        sio.emit('weight_update', payload)
        print(f"[Weight Service] Sent update: {measured_weight:.3f}kg for cart {cart_id}")
        
    except Exception as e:
        print(f"[Weight Service] Error sending weight update: {e}")

def main_loop():
    """
    Main service loop that continuously reads weight and sends updates
    """
    print("[Weight Service] Starting main loop...")
    
    while True:
        try:
            # Read current weight
            weight = get_weight()
            
            # Send update to backend
            if sio.connected:
                send_weight_update(CART_ID, weight)
            else:
                print("[Weight Service] Not connected to backend, skipping update")
            
            # Wait for next update interval
            time.sleep(WEIGHT_UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n[Weight Service] Shutting down...")
            break
        except Exception as e:
            print(f"[Weight Service] Error in main loop: {e}")
            time.sleep(WEIGHT_UPDATE_INTERVAL)  # Continue after error

def main():
    """
    Main entry point for the weight sensor service
    """
    print("=" * 60)
    print("SmartKart Weight Sensor Service")
    print("=" * 60)
    
    # Initialize HX711 if running on real hardware
    if REAL_HARDWARE:
        try:
            initialize_hx711()
        except Exception as e:
            print(f"[Weight Service] Failed to initialize HX711: {e}")
            print("[Weight Service] Exiting...")
            return
    else:
        print("[Weight Service] Running in SIMULATION mode")
    
    # Connect to backend
    try:
        print(f"[Weight Service] Connecting to backend at {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
    except Exception as e:
        print(f"[Weight Service] Failed to connect to backend: {e}")
        print("[Weight Service] Exiting...")
        return
    
    # Start main loop
    try:
        main_loop()
    finally:
        # Cleanup on exit
        if sio.connected:
            sio.disconnect()
        print("[Weight Service] Service stopped")

if __name__ == '__main__':
    main()
