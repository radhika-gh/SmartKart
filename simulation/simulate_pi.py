import socketio
import time
import random

# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:5000"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

def send_rfid_scan():
    cart_id = "cart123"  # Simulating a fixed cart
    product_id = random.choice(["RFID_001", "RFID_002", "RFID_003"])  # Simulate scanning different products
    print(f"Sending RFID Scan: {product_id}")

    sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id})

sio.connect(BACKEND_URL)

# Simulate scanning RFID every 3 seconds
while True:
    send_rfid_scan()
    time.sleep(3)
