#!/usr/bin/env python3
"""
Test script for LCD display
Tests all LCD functionality before integration
"""

import time
from lcd_display import LCDDisplay

def main():
    print("=" * 60)
    print("LCD Display Test")
    print("=" * 60)
    print("\nInitializing LCD...")
    
    lcd = LCDDisplay()
    
    if not lcd.initialized:
        print("ERROR: LCD failed to initialize")
        return
    
    try:
        # Test 1: Welcome message
        print("\nTest 1: Welcome message")
        lcd.display_message("SmartKart LCD", "Test Mode")
        time.sleep(3)
        
        # Test 2: Weight display with different values
        print("\nTest 2: Weight display")
        test_weights = [0.0, 1.234, 5.678, 12.345, 25.5, 99.999]
        for weight in test_weights:
            print(f"  Displaying: {weight}kg")
            lcd.display_weight(weight, "OK")
            time.sleep(2)
        
        # Test 3: Status messages
        print("\nTest 3: Status messages")
        statuses = [
            ("Connected", "Ready"),
            ("Scanning...", "RFID Active"),
            ("Adding Item", "Please wait"),
            ("Offline", "Check Network"),
            ("Error", "Sensor Fault")
        ]
        for line1, line2 in statuses:
            print(f"  Displaying: {line1} | {line2}")
            lcd.display_message(line1, line2)
            time.sleep(2)
        
        # Test 4: Rapid updates (simulating real usage)
        print("\nTest 4: Rapid weight updates")
        for i in range(20):
            weight = i * 0.5
            lcd.display_weight(weight, "Updating")
            time.sleep(0.5)
        
        # Test 5: Clear display
        print("\nTest 5: Clear display")
        lcd.clear()
        time.sleep(2)
        
        # Final message
        lcd.display_message("Test Complete", "Success!")
        time.sleep(3)
        
        print("\n" + "=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\nERROR during test: {e}")
    finally:
        print("\nCleaning up...")
        lcd.cleanup()
        print("Done!")

if __name__ == '__main__':
    main()
