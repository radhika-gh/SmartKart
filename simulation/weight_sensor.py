import random

# Try importing Raspberry Pi-specific libraries
try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True  # If import works, we are on Raspberry Pi
except ImportError:
    REAL_HARDWARE = False  # If import fails, we are in simulation mode

# GPIO pin configuration constants
DT_PIN = 5  # GPIO5 for Data
SCK_PIN = 6  # GPIO6 for Clock

# Global HX711 instance
hx = None

def initialize_hx711():
    """
    Initialize HX711 load cell amplifier with zero calibration.
    Only called when REAL_HARDWARE is True.
    """
    global hx
    if not REAL_HARDWARE:
        print("[Weight Sensor] Running in simulation mode - HX711 not initialized")
        return
    
    try:
        print(f"[Weight Sensor] Initializing HX711 on GPIO pins DT={DT_PIN}, SCK={SCK_PIN}")
        hx = HX711(dout_pin=DT_PIN, pd_sck_pin=SCK_PIN)
        
        # Perform zero calibration
        print("[Weight Sensor] Performing zero calibration...")
        hx.zero()
        print("[Weight Sensor] HX711 initialized and calibrated successfully")
    except Exception as e:
        print(f"[Weight Sensor] Error initializing HX711: {e}")
        raise

def get_weight():
    """
    Returns weight from the load cell if Raspberry Pi is detected, 
    otherwise generates fake weight data for simulation.
    
    Returns:
        float: Weight in kilograms
    """
    if REAL_HARDWARE:
        if hx is None:
            raise RuntimeError("HX711 not initialized. Call initialize_hx711() first.")
        try:
            # Read average of 5 samples for stability
            weight = hx.get_weight(5)
            return weight
        except Exception as e:
            print(f"[Weight Sensor] Error reading weight: {e}")
            return 0.0
    else:
        # Simulation mode: return fake weight data
        weight = 0.33
        return weight