import socketio
import time
import random

# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:8001"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

def send_rfid_scan():
    cart_id = "5678"  # Simulating a fixed cart
    product_id = random.choice(["1234"])  # Simulate scanning different products
    print(f"Sending RFID Scan: {product_id}")

    sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id})

sio.connect(BACKEND_URL)

# Simulate scanning RFID every 3 seconds
while True:
    send_rfid_scan()
    time.sleep(3)
