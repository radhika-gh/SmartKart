#!/usr/bin/env python3
"""
HX711 Calibration Script
Run this to calibrate your weight sensor
"""

import time
import weight_sensor

def get_raw_reading(samples=10):
    """Get average raw reading"""
    readings = []
    for i in range(samples):
        raw_data = weight_sensor.hx.get_raw_data()
        if raw_data:
            if isinstance(raw_data, list):
                readings.extend(raw_data)
            else:
                readings.append(raw_data)
        time.sleep(0.1)
    
    if readings:
        return sum(readings) / len(readings)
    return 0

def main():
    print("=" * 60)
    print("HX711 Weight Sensor Calibration")
    print("=" * 60)
    
    if not weight_sensor.REAL_HARDWARE:
        print("Error: Real hardware not detected!")
        return
    
    # Initialize
    weight_sensor.initialize_hx711()
    
    # Step 1: Tare (zero)
    input("\nStep 1: Remove ALL weight from the sensor and press Enter...")
    print("Reading zero offset (this may take a few seconds)...")
    zero_offset = get_raw_reading(20)
    print(f"Zero offset: {zero_offset:.2f}")
    
    # Step 2: Calibrate with known weight
    known_weight = float(input("\nStep 2: Enter the weight you'll place on the sensor (in kg): "))
    input(f"Now place {known_weight}kg on the sensor and press Enter...")
    print("Reading with weight (this may take a few seconds)...")
    weight_reading = get_raw_reading(20)
    print(f"Reading with weight: {weight_reading:.2f}")
    
    # Calculate calibration factor
    scale_factor = (weight_reading - zero_offset) / known_weight
    print("\n" + "=" * 60)
    print("CALIBRATION RESULTS")
    print("=" * 60)
    print(f"Zero Offset: {zero_offset:.2f}")
    print(f"Scale Factor: {scale_factor:.2f}")
    print("\nUpdate your weight_sensor.py with these values:")
    print(f"  ZERO_OFFSET = {zero_offset:.2f}")
    print(f"  SCALE_FACTOR = {scale_factor:.2f}")
    print("\nThen use: weight_kg = (raw_reading - ZERO_OFFSET) / SCALE_FACTOR")
    print("=" * 60)

if __name__ == '__main__':
    main()
