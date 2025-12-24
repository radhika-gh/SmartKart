#!/bin/bash
# LCD Display Installation Script for SmartKart

echo "=========================================="
echo "SmartKart LCD Display Installation"
echo "=========================================="
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "WARNING: This doesn't appear to be a Raspberry Pi"
    echo "Installation will continue but hardware features may not work"
    echo ""
fi

# Install RPi.GPIO if not present
echo "Checking for RPi.GPIO..."
if python3 -c "import RPi.GPIO" 2>/dev/null; then
    echo "✓ RPi.GPIO is already installed"
else
    echo "Installing RPi.GPIO..."
    sudo apt-get update
    sudo apt-get install -y python3-rpi.gpio
    echo "✓ RPi.GPIO installed"
fi
echo ""

# Make scripts executable
echo "Setting file permissions..."
chmod +x test_lcd.py
chmod +x lcd_display.py
echo "✓ Permissions set"
echo ""

# Test LCD
echo "=========================================="
echo "Testing LCD Display"
echo "=========================================="
echo ""
echo "This will test your LCD display."
echo "Make sure all connections are correct before proceeding."
echo ""
read -p "Run LCD test now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running LCD test..."
    python3 test_lcd.py
    echo ""
    echo "Test complete!"
else
    echo "Skipping test. You can run it later with: python3 test_lcd.py"
fi

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review LCD_SETUP_GUIDE.md for wiring details"
echo "2. Check LCD_WIRING_DIAGRAM.md for connection diagram"
echo "3. Test LCD: python3 test_lcd.py"
echo "4. Restart weight sensor service: sudo systemctl restart weight-sensor"
echo "5. Monitor logs: sudo journalctl -u weight-sensor -f"
echo ""
echo "The LCD will now automatically display cart weight!"
echo ""
