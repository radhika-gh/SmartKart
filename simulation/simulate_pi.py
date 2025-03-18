import socketio
import time

# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:8001"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

def send_rfid_scans():
    cart_id = "5678"  # Simulating a fixed cart
    products = ["1234", "xyz", "pqr"]  # List of products to scan once

    for product_id in products:
        print(f"Sending RFID Scan: {product_id}")
        sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id})
        time.sleep(3)  # Wait for 3 seconds before sending the next product

sio.connect(BACKEND_URL)

# Send each product once
send_rfid_scans()

# Close the connection after all scans are sent
print("All products scanned. Disconnecting.")
sio.disconnect()
