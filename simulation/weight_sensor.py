import time
from hx711 import HX711  # Import HX711 library

# Define GPIO pins
DT_PIN = 5  # GPIO5 for Data
SCK_PIN = 6  # GPIO6 for Clock

# Initialize HX711
hx = HX711(dout_pin=DT_PIN, pd_sck_pin=SCK_PIN)
hx.zero()  # Reset weight measurement to zero

# Function to read weight
def get_weight():
    weight = hx.get_weight(5)  # Read average of 5 samples
    return round(weight, 2)  # Return weight rounded to 2 decimal places

# Test the weight sensor
if __name__ == "__main__":
    while True:
        weight = get_weight()
        print(f"Weight: {weight} kg")
        time.sleep(2)  # Read weight every 2 seconds
