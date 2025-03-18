import random

# Try importing Raspberry Pi-specific libraries
try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True  # If import works, we are on Raspberry Pi
except ImportError:
    REAL_HARDWARE = False  # If import fails, we are in simulation mode

# Pin configuration for HX711 (Only used if REAL_HARDWARE = True)
DT_PIN = 5  # GPIO5 for Data
SCK_PIN = 6  # GPIO6 for Clock

if REAL_HARDWARE:
    hx = HX711(dout_pin=DT_PIN, pd_sck_pin=SCK_PIN)
    hx.zero()  # Reset weight measurement to zero

def get_weight():
    """ Returns weight from the load cell if Raspberry Pi is detected, otherwise generates fake weight data. """
    if REAL_HARDWARE:
        weight = hx.get_weight(5)  # Read average of 5 samples
    else:
        weight =  0.495 # Generate fake weight for simulation
    
    return weight
