# LCD Display Setup Guide

## Overview
This guide explains how to set up and configure the 16x2 LCD display for the SmartKart system to show real-time cart weight.

## Hardware Requirements
- 16x2 LCD Display (HD44780 compatible)
- Raspberry Pi (any model with GPIO)
- Jumper wires
- Optional: 10kΩ potentiometer for contrast adjustment
- Optional: 220Ω resistor for backlight

## Pin Connections

### LCD to Raspberry Pi Wiring

| LCD Pin | Function | RPi Pin | RPi GPIO | Notes |
|---------|----------|---------|----------|-------|
| 1 (VSS) | Ground | Pin 39 | GND | Ground |
| 2 (VDD) | Power | Pin 4 | 5V | 5V Power |
| 3 (V0) | Contrast | - | - | Connect to potentiometer |
| 4 (RS) | Register Select | Pin 3 | GPIO 2 | Data/Command select |
| 5 (RW) | Read/Write | Pin 39 | GND | Tie to ground (write only) |
| 6 (E) | Enable | Pin 5 | GPIO 3 | Enable signal |
| 7-10 (D0-D3) | Data | - | - | Not used (4-bit mode) |
| 11 (D4) | Data | - | GPIO 17 | Data bit 4 |
| 12 (D5) | Data | - | GPIO 27 | Data bit 5 |
| 13 (D6) | Data | - | GPIO 22 | Data bit 6 |
| 14 (D7) | Data | - | GPIO 23 | Data bit 7 |
| 15 (A) | Backlight + | Pin 4 | 5V | Via 220Ω resistor |
| 16 (K) | Backlight - | Pin 39 | GND | Ground |

### Primary Pins (as specified)
- **Pin 3** (GPIO 2): RS - Register Select
- **Pin 4** (5V): Power supply
- **Pin 5** (GPIO 3): E - Enable signal
- **Pin 39** (GND): Ground

### Additional GPIO Pins for Data
- GPIO 17, 27, 22, 23 for 4-bit data transmission

## Software Installation

### 1. Install Required Python Package
```bash
# RPi.GPIO should already be installed on Raspberry Pi OS
# If not, install it:
sudo apt-get update
sudo apt-get install python3-rpi.gpio
```

### 2. Test LCD Display
```bash
cd raspberry-pi-files
python3 test_lcd.py
```

This will run through various tests:
- Welcome message
- Weight display with different values
- Status messages
- Rapid updates
- Display clearing

### 3. Verify Integration
The LCD is automatically integrated with the weight sensor service. When you run the service, it will:
- Display "SmartKart" and status on startup
- Show real-time weight updates
- Display connection status (Connected/Offline)
- Show error messages if issues occur

## Display Format

### Normal Operation
```
Line 1: Cart Weight
Line 2: XX.XXkg OK
```

### Status Messages
```
Line 1: SmartKart
Line 2: Connected
```

### Error States
```
Line 1: Error
Line 2: No Connection
```

## Configuration

### Adjusting Contrast
1. Connect a 10kΩ potentiometer between 5V and GND
2. Connect the wiper (middle pin) to LCD pin 3 (V0)
3. Turn the potentiometer until text is clearly visible

### Changing Pin Configuration
If you need to use different GPIO pins, edit `raspberry-pi-files/lcd_display.py`:

```python
# LCD Pin Configuration (BCM numbering)
LCD_RS = 2   # Change to your RS pin
LCD_E = 3    # Change to your Enable pin
LCD_D4 = 17  # Change to your D4 pin
LCD_D5 = 27  # Change to your D5 pin
LCD_D6 = 22  # Change to your D6 pin
LCD_D7 = 23  # Change to your D7 pin
```

## Troubleshooting

### No Display
1. Check power connections (5V and GND)
2. Adjust contrast potentiometer
3. Verify all pin connections
4. Check if backlight is on

### Garbled Text
1. Check data pin connections (D4-D7)
2. Verify RS and E pins are correct
3. Ensure proper ground connection
4. Try adjusting contrast

### Display Not Updating
1. Check if service is running: `sudo systemctl status weight-sensor`
2. View logs: `sudo journalctl -u weight-sensor -f`
3. Test LCD independently: `python3 test_lcd.py`

### GPIO Conflicts
If you get "GPIO already in use" errors:
```bash
# Clean up GPIO
python3 -c "import RPi.GPIO as GPIO; GPIO.cleanup()"
```

## Running with Weight Sensor Service

The LCD is automatically integrated. Just start the service:

```bash
# Start service
sudo systemctl start weight-sensor

# View logs with LCD output
sudo journalctl -u weight-sensor -f
```

## Simulation Mode

The LCD module supports simulation mode for testing without hardware:
- Automatically detects if RPi.GPIO is unavailable
- Prints LCD output to console instead
- Useful for development and testing

## API Reference

### LCDDisplay Class

```python
from lcd_display import LCDDisplay

lcd = LCDDisplay()

# Display weight
lcd.display_weight(weight=12.5, status="OK")

# Display custom message
lcd.display_message(line1="Hello", line2="World")

# Clear display
lcd.clear()

# Cleanup GPIO
lcd.cleanup()
```

### Convenience Functions

```python
from lcd_display import display_weight, display_message, cleanup

# Quick weight display
display_weight(15.3, "Ready")

# Quick message display
display_message("SmartKart", "Active")

# Cleanup
cleanup()
```

## Performance Notes

- Display updates take ~50ms
- Recommended update interval: 1 second
- No performance impact on weight sensor readings
- Runs in same thread as weight service

## Safety

- Always use proper resistors for backlight
- Don't exceed 5V on any LCD pin
- Ensure proper ground connections
- Use GPIO cleanup on shutdown

## Next Steps

1. Test LCD with `test_lcd.py`
2. Verify pin connections
3. Adjust contrast if needed
4. Start weight sensor service
5. Monitor real-time weight display

For issues or questions, check the troubleshooting section or review the service logs.
