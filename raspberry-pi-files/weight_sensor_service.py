#!/usr/bin/env python3

import os
import time
import socketio
from datetime import datetime, timezone
from weight_sensor import get_weight, initialize_hx711, REAL_HARDWARE
from lcd_display import get_lcd, display_price, cleanup as lcd_cleanup

# Configuration from environment variables
BACKEND_URL = os.getenv('BACKEND_URL', 'http://172.16.37.181:8001')
CART_ID = os.getenv('CART_ID', '1234')
WEIGHT_UPDATE_INTERVAL = float(os.getenv('WEIGHT_UPDATE_INTERVAL', '1.0'))

# Global variable to track current cart price
current_cart_price = 0.0

# Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    """Called when connected to backend"""
    print(f"[Weight Service] Connected to backend at {BACKEND_URL}")
    print(f"[Weight Service] Monitoring cart: {CART_ID}")
    print(f"[Weight Service] Update interval: {WEIGHT_UPDATE_INTERVAL}s")
    print(f"[Weight Service] Hardware mode: {'REAL' if REAL_HARDWARE else 'SIMULATION'}")
    
    # Display connection status on LCD
    lcd = get_lcd()
    lcd.display_message("SmartKart", "Connected")
    time.sleep(1)
    
    # Display initial price
    display_price(current_cart_price, "OK")

@sio.event
def disconnect():
    """Called when disconnected from backend"""
    print("[Weight Service] Disconnected from backend")
    
    # Display disconnection status on LCD
    lcd = get_lcd()
    lcd.display_message("SmartKart", "Disconnected")

@sio.event
def connect_error(data):
    """Called when connection error occurs"""
    print(f"[Weight Service] Connection error: {data}")

@sio.on('updateCart')
def on_cart_update(data):
    """Called when cart is updated (item added/removed)"""
    global current_cart_price
    
    try:
        # Check if this update is for our cart
        if data.get('cartId') == CART_ID:
            new_price = data.get('totalPrice', 0)
            current_cart_price = new_price
            
            action = data.get('action', '')
            product = data.get('affectedProduct', '')
            
            print(f"[Weight Service] Cart updated: ₹{new_price:.2f} ({action} {product})")
            
            # Update LCD with new price
            status = "OK" if sio.connected else "Offline"
            display_price(current_cart_price, status)
    except Exception as e:
        print(f"[Weight Service] Error processing cart update: {e}")

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
    print("[Weight Service] LCD will display cart price (updated on item add/remove)")
    
    while True:
        try:
            # Read current weight
            weight = get_weight()
            
            # Send weight update to backend if connected
            if sio.connected:
                send_weight_update(CART_ID, weight)
            else:
                print("[Weight Service] Not connected to backend, skipping update")
                # Update LCD to show offline status
                display_price(current_cart_price, "Offline")
            
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
    global current_cart_price
    
    print("=" * 60)
    print("SmartKart Weight Sensor Service")
    print("=" * 60)
    
    # Initialize LCD
    lcd = get_lcd()
    lcd.display_message("SmartKart", "Starting...")
    
    # Initialize hardware if available
    if REAL_HARDWARE:
        try:
            initialize_hx711()
            lcd.display_message("SmartKart", "HX711 Ready")
            time.sleep(1)
        except Exception as e:
            print(f"[Weight Service] Failed to initialize HX711: {e}")
            lcd.display_message("Error", "HX711 Failed")
            time.sleep(2)
            return
    else:
        print("[Weight Service] Running in SIMULATION mode")
        lcd.display_message("SmartKart", "Simulation")
        time.sleep(1)
    
    # Try to connect to backend (but continue even if it fails)
    try:
        print(f"[Weight Service] Connecting to backend at {BACKEND_URL}...")
        lcd.display_message("Connecting...", "Please wait")
        sio.connect(BACKEND_URL)
        print("[Weight Service] Connected to backend successfully")
    except Exception as e:
        print(f"[Weight Service] Failed to connect to backend: {e}")
        print("[Weight Service] Continuing in offline mode...")
        lcd.display_message("SmartKart", "Offline Mode")
        time.sleep(2)
        # Display initial price (0.00) even in offline mode
        display_price(current_cart_price, "Offline")
    
    # Run main loop (works with or without backend connection)
    try:
        main_loop()
    finally:
        if sio.connected:
            sio.disconnect()
        lcd.display_message("SmartKart", "Stopped")
        time.sleep(1)
        lcd_cleanup()
        print("[Weight Service] Service stopped")

if __name__ == '__main__':
    main()
