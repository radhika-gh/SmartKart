import random

try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True
except ImportError:
    REAL_HARDWARE = False

DT_PIN = 5
SCK_PIN = 6
hx = None

def initialize_hx711():
    global hx
    if not REAL_HARDWARE:
        print("[Weight Sensor] Running in simulation mode")
        return
    
    try:
        print(f"[Weight Sensor] Initializing HX711 on pins DT={DT_PIN}, SCK={SCK_PIN}")
        GPIO.setwarnings(False)
        hx = HX711(dout_pin=DT_PIN, pd_sck_pin=SCK_PIN)
        hx.reset()
        print("[Weight Sensor] HX711 initialized successfully")
    except Exception as e:
        print(f"[Weight Sensor] Error: {e}")
        raise

def get_weight():
    if REAL_HARDWARE:
        if hx is None:
            raise RuntimeError("HX711 not initialized")
        try:
            # Try different method names that might exist
            if hasattr(hx, 'get_weight'):
                weight = hx.get_weight(5)
            elif hasattr(hx, 'read'):
                weight = hx.read()
            elif hasattr(hx, 'read_average'):
                weight = hx.read_average(5)
            elif hasattr(hx, 'get_value'):
                weight = hx.get_value(5)
            else:
                weight = 0.0
            
            # Convert to kg (assuming raw value or grams)
            return weight / 1000.0 if weight > 100 else weight
        except Exception as e:
            print(f"[Weight Sensor] Error reading: {e}")
            return 0.0
    else:
        return 0.33
