#!/usr/bin/env python3

import random

# Try importing Raspberry Pi-specific libraries
try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True
except ImportError:
    REAL_HARDWARE = False

# GPIO pin configuration
DT_PIN = 5
SCK_PIN = 6

# Calibration values (run calibrate_sensor.py to get these)
ZERO_OFFSET = -121613.47
SCALE_FACTOR = 131979.86 / 9320  # Adjusted: was reading 2016kg instead of 0.216kg
# SCALE_FACTOR ≈ 14.16

# Global HX711 instance
hx = None

def initialize_hx711():
    """Initialize the HX711 load cell amplifier"""
    global hx
    if not REAL_HARDWARE:
        print("[Weight Sensor] Running in simulation mode")
        return
    
    try:
        print(f"[Weight Sensor] Initializing HX711 on GPIO pins DT={DT_PIN}, SCK={SCK_PIN}")
        GPIO.setwarnings(False)
        hx = HX711(dout_pin=DT_PIN, pd_sck_pin=SCK_PIN)
        hx.reset()
        print("[Weight Sensor] HX711 initialized successfully")
    except Exception as e:
        print(f"[Weight Sensor] Error initializing HX711: {e}")
        raise

def get_weight():
    """Get current weight reading in kilograms"""
    if REAL_HARDWARE:
        if hx is None:
            raise RuntimeError("HX711 not initialized. Call initialize_hx711() first.")
        
        try:
            # Get raw data from HX711 (no arguments)
            raw_data = hx.get_raw_data()
            
            if raw_data:
                # Calculate average if it's a list, otherwise use the value
                if isinstance(raw_data, list):
                    raw_value = sum(raw_data) / len(raw_data)
                else:
                    raw_value = raw_data
                
                # Apply calibration
                if SCALE_FACTOR != 0:
                    weight_kg = (raw_value - ZERO_OFFSET) / SCALE_FACTOR
                    return max(0.0, weight_kg)  # Don't return negative weights
                else:
                    # No calibration yet, return raw value divided by 1000
                    return raw_value / 1000.0
            else:
                return 0.0
                
        except Exception as e:
            print(f"[Weight Sensor] Error reading weight: {e}")
            return 0.0
    else:
        # Simulation mode - return random weight between 0.3 and 0.4 kg
        return round(random.uniform(0.3, 0.4), 3)
