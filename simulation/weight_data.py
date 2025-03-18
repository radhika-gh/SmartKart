import socketio

BACKEND_URL = "http://localhost:5000"
sio = socketio.Client()

sio.connect(BACKEND_URL)

def send_weight_data(cart_id, weight):
    print(f"Sending weight data: {weight} kg")
    sio.emit("weight_update", {"cartId": cart_id, "weight": weight})

sio.disconnect()
