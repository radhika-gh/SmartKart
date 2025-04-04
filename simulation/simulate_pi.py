import socketio
import time
from weight_sensor import get_weight
# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:8001"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

def send_data():
    cart_id = "front"  # Simulating a fixed cart
    product_id= "fer100" # List of products to scan once
    weight = get_weight()
    print(f"Sending RFID Scan: {product_id}")
    sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id, "weight":weight})
    time.sleep(3)  # Wait for 3 seconds before sending the next product

sio.connect(BACKEND_URL)

# Send each product once
send_data()
# Close the connection after all scans are sent
print("All products scanned. Disconnecting.")
sio.disconnect()
#test for push