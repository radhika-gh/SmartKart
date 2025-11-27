#!/usr/bin/env python3

import os
import time
import socketio
from datetime import datetime, timezone
from weight_sensor import get_weight, initialize_hx711, REAL_HARDWARE

# Configuration from environment variables
BACKEND_URL = os.getenv('BACKEND_URL', 'http://172.16.37.181:8001')
CART_ID = os.getenv('CART_ID', '1234')
WEIGHT_UPDATE_INTERVAL = float(os.getenv('WEIGHT_UPDATE_INTERVAL', '1.0'))

# Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    """Called when connected to backend"""
    print(f"[Weight Service] Connected to backend at {BACKEND_URL}")
    print(f"[Weight Service] Monitoring cart: {CART_ID}")
    print(f"[Weight Service] Update interval: {WEIGHT_UPDATE_INTERVAL}s")
    print(f"[Weight Service] Hardware mode: {'REAL' if REAL_HARDWARE else 'SIMULATION'}")

@sio.event
def disconnect():
    """Called when disconnected from backend"""
    print("[Weight Service] Disconnected from backend")

@sio.event
def connect_error(data):
    """Called when connection error occurs"""
    print(f"[Weight Service] Connection error: {data}")

def send_weight_update(cart_id, measured_weight):
    """Send weight update to backend via Socket.IO"""
    try:
        timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        payload = {
            'cartId': cart_id,
            'measuredWeight': round(measured_weight, 3),
            'timestamp': timestamp
        }
        sio.emit('weight_update', payload)
        print(f"[Weight Service] Sent update: {measured_weight:.3f}kg for cart {cart_id}")
    except Exception as e:
        print(f"[Weight Service] Error sending weight update: {e}")

def main_loop():
    """Main loop that reads weight and sends updates"""
    print("[Weight Service] Starting main loop...")
    while True:
        try:
            # Read current weight
            weight = get_weight()
            
            # Send update if connected
            if sio.connected:
                send_weight_update(CART_ID, weight)
            else:
                print("[Weight Service] Not connected to backend, skipping update")
            
            # Wait before next reading
            time.sleep(WEIGHT_UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n[Weight Service] Shutting down...")
            break
        except Exception as e:
            print(f"[Weight Service] Error in main loop: {e}")
            time.sleep(WEIGHT_UPDATE_INTERVAL)

def main():
    """Main entry point"""
    print("=" * 60)
    print("SmartKart Weight Sensor Service")
    print("=" * 60)
    
    # Initialize hardware if available
    if REAL_HARDWARE:
        try:
            initialize_hx711()
        except Exception as e:
            print(f"[Weight Service] Failed to initialize HX711: {e}")
            return
    else:
        print("[Weight Service] Running in SIMULATION mode")
    
    # Connect to backend
    try:
        print(f"[Weight Service] Connecting to backend at {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
    except Exception as e:
        print(f"[Weight Service] Failed to connect to backend: {e}")
        return
    
    # Run main loop
    try:
        main_loop()
    finally:
        if sio.connected:
            sio.disconnect()
        print("[Weight Service] Service stopped")

if __name__ == '__main__':
    main()
