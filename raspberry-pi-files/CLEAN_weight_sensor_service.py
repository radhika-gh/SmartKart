#!/usr/bin/env python3

import time
import socketio
from datetime import datetime
from weight_sensor import get_weight, initialize_hx711, REAL_HARDWARE

BACKEND_URL = "http://192.168.1.100:8001"
CART_ID = "1234"
WEIGHT_UPDATE_INTERVAL = 1.0

sio = socketio.Client()

@sio.event
def connect():
    print(f"[Weight Service] Connected to {BACKEND_URL}")
    print(f"[Weight Service] Cart: {CART_ID}")
    print(f"[Weight Service] Mode: {'REAL' if REAL_HARDWARE else 'SIMULATION'}")

@sio.event
def disconnect():
    print("[Weight Service] Disconnected")

@sio.event
def connect_error(data):
    print(f"[Weight Service] Connection error: {data}")

def send_weight_update(cart_id, measured_weight):
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        payload = {
            'cartId': cart_id,
            'measuredWeight': round(measured_weight, 3),
            'timestamp': timestamp
        }
        sio.emit('weight_update', payload)
        print(f"[Weight Service] Sent: {measured_weight:.3f}kg")
    except Exception as e:
        print(f"[Weight Service] Error: {e}")

def main_loop():
    print("[Weight Service] Starting...")
    while True:
        try:
            weight = get_weight()
            if sio.connected:
                send_weight_update(CART_ID, weight)
            else:
                print("[Weight Service] Not connected")
            time.sleep(WEIGHT_UPDATE_INTERVAL)
        except KeyboardInterrupt:
            print("\n[Weight Service] Shutting down...")
            break
        except Exception as e:
            print(f"[Weight Service] Error: {e}")
            time.sleep(WEIGHT_UPDATE_INTERVAL)

def main():
    print("=" * 60)
    print("SmartKart Weight Sensor Service")
    print("=" * 60)
    
    if REAL_HARDWARE:
        try:
            initialize_hx711()
        except Exception as e:
            print(f"[Weight Service] Failed to initialize: {e}")
            return
    else:
        print("[Weight Service] SIMULATION mode")
    
    try:
        print(f"[Weight Service] Connecting to {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
    except Exception as e:
        print(f"[Weight Service] Failed to connect: {e}")
        return
    
    try:
        main_loop()
    finally:
        if sio.connected:
            sio.disconnect()
        print("[Weight Service] Stopped")

if __name__ == '__main__':
    main()
