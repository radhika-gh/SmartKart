import socketio
import time

# Backend URL (Replace with actual IP if needed)
BACKEND_URL = "http://localhost:8001"

# Create a WebSocket client
sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend as Fake Raspberry Pi")

def send_data():
    cart_id = input("Enter Cart ID (or press Enter for default 'swayam12345'): ").strip()
    if not cart_id:
        cart_id = "1234"
    
    product_id = input("Enter Product ID (or press Enter for default 'EGG987'): ").strip()
    if not product_id:
        product_id = "Log"
    
    weight_input = input("Enter weight in grams: ").strip()
    try:
        weight = float(weight_input)
    except ValueError:
        print("Invalid weight. Using default 0.0")
        weight = 0.0
    
    print(f"Sending RFID Scan: {product_id} with weight: {weight}g")
    sio.emit("rfid_scan", {"cartId": cart_id, "productId": product_id, "weight": weight})
    time.sleep(1)

sio.connect(BACKEND_URL)

# Send each product once
send_data()
# Close the connection after all scans are sent
print("All products scanned. Disconnecting.")
sio.disconnect()
#test for push