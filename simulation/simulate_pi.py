import socketio
import random

# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:8001"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

@sio.event
def disconnect():
    print("Disconnected from backend")

def send_rfid_scan():
    cart_id = "1001"  # Simulating a fixed cart
    product_id = random.choice(["1234", "xyz", "pqr"])  # Simulate scanning a random product
    print(f"Sending RFID Scan: {product_id}")

    sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id})

    # ✅ Close connection after sending the data
    sio.disconnect()

# Connect to the backend and send the scan once
sio.connect(BACKEND_URL)
send_rfid_scan()
