# LCD Display Integration for SmartKart

## Quick Start

The LCD display shows real-time cart weight and system status on a 16x2 character display.

### What You'll See

**Normal Operation:**
```
Cart Weight
12.45kg OK
```

**During Startup:**
```
SmartKart
Starting...
```

**When Connected:**
```
SmartKart
Connected
```

## Files Overview

| File | Purpose |
|------|---------|
| `lcd_display.py` | Main LCD driver module |
| `test_lcd.py` | Test script for LCD functionality |
| `LCD_SETUP_GUIDE.md` | Detailed setup instructions |
| `LCD_WIRING_DIAGRAM.md` | Visual wiring diagrams |
| `install_lcd.sh` | Automated installation script |

## Installation

### Quick Install
```bash
cd raspberry-pi-files
chmod +x install_lcd.sh
./install_lcd.sh
```

### Manual Install
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install python3-rpi.gpio

# Test LCD
python3 test_lcd.py

# Restart service
sudo systemctl restart weight-sensor
```

## Hardware Setup

### Required Components
- 16x2 LCD Display (HD44780 compatible)
- 10kΩ potentiometer (for contrast)
- 220Ω resistor (for backlight)
- Jumper wires

### Pin Connections
- **Pin 3** (GPIO 2) → LCD RS
- **Pin 4** (5V) → LCD VDD & Backlight
- **Pin 5** (GPIO 3) → LCD Enable
- **Pin 39** (GND) → LCD Ground
- Additional data pins: GPIO 17, 27, 22, 23

See `LCD_WIRING_DIAGRAM.md` for complete wiring details.

## Testing

### Test LCD Only
```bash
python3 test_lcd.py
```

This runs through:
- Welcome messages
- Weight display tests
- Status messages
- Rapid updates
- Display clearing

### Test with Weight Sensor
```bash
# Start service
sudo systemctl start weight-sensor

# Watch logs
sudo journalctl -u weight-sensor -f
```

You should see LCD updates in the logs and on the physical display.

## Display Modes

### Weight Display
Shows current cart weight with status:
- `OK` - Normal operation, connected
- `Offline` - Not connected to backend
- `Updating` - Weight changing

### Status Messages
- `Starting...` - Service initializing
- `Connected` - Backend connection established
- `Disconnected` - Backend connection lost
- `HX711 Ready` - Weight sensor initialized
- `Simulation` - Running without hardware

### Error Messages
- `Error` / `HX711 Failed` - Weight sensor error
- `Error` / `No Connection` - Backend connection failed

## Configuration

### Adjust Update Rate
Edit `.env` file:
```bash
WEIGHT_UPDATE_INTERVAL=1.0  # Update every 1 second
```

### Change GPIO Pins
Edit `lcd_display.py`:
```python
LCD_RS = 2   # Register Select pin
LCD_E = 3    # Enable pin
LCD_D4 = 17  # Data pins
LCD_D5 = 27
LCD_D6 = 22
LCD_D7 = 23
```

### Adjust Contrast
Turn the potentiometer until text is clearly visible.

## Troubleshooting

### No Display
1. Check power (5V and GND)
2. Adjust contrast potentiometer
3. Verify pin connections
4. Check backlight connections

### Garbled Text
1. Verify data pin connections (D4-D7)
2. Check RS and Enable pins
3. Ensure proper ground
4. Adjust contrast

### Display Not Updating
```bash
# Check service status
sudo systemctl status weight-sensor

# View logs
sudo journalctl -u weight-sensor -f

# Test LCD independently
python3 test_lcd.py
```

### GPIO Conflicts
```bash
# Clean up GPIO
python3 -c "import RPi.GPIO as GPIO; GPIO.cleanup()"

# Restart service
sudo systemctl restart weight-sensor
```

## API Usage

### Basic Usage
```python
from lcd_display import display_weight, display_message

# Display weight
display_weight(12.5, "OK")

# Display custom message
display_message("Hello", "World")
```

### Advanced Usage
```python
from lcd_display import LCDDisplay

lcd = LCDDisplay()

# Display weight with status
lcd.display_weight(weight=15.3, status="Ready")

# Custom messages
lcd.display_message("Line 1", "Line 2")

# Clear display
lcd.clear()

# Cleanup when done
lcd.cleanup()
```

## Integration with Weight Sensor

The LCD is automatically integrated with `weight_sensor_service.py`:

1. **Startup**: Shows initialization messages
2. **Connection**: Displays backend connection status
3. **Operation**: Shows real-time weight updates
4. **Errors**: Displays error messages
5. **Shutdown**: Shows shutdown message and cleans up GPIO

No additional configuration needed - just start the service!

## Performance

- Display update time: ~50ms
- Recommended update interval: 1 second
- No impact on weight sensor accuracy
- Runs in same thread as weight service

## Simulation Mode

For development without hardware:
- Automatically detects missing RPi.GPIO
- Prints LCD output to console
- All functionality works the same
- Useful for testing logic

## Safety Notes

- Use proper resistor for backlight (220Ω)
- Don't exceed 5V on any LCD pin
- Ensure proper ground connections
- Always cleanup GPIO on shutdown

## Support

For issues:
1. Check `LCD_SETUP_GUIDE.md` for detailed instructions
2. Review `LCD_WIRING_DIAGRAM.md` for wiring
3. Run `test_lcd.py` to isolate LCD issues
4. Check service logs: `sudo journalctl -u weight-sensor -f`

## What's Next?

After LCD is working:
1. Verify weight readings are accurate
2. Test with RFID scanning
3. Monitor during actual cart usage
4. Adjust contrast for best visibility

The LCD provides immediate visual feedback for debugging and monitoring your SmartKart system!
