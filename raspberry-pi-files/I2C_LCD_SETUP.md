# I2C LCD Setup Guide for SmartKart

## Your Hardware Setup

You have an I2C LCD display - much simpler than parallel!

### Pin Connections (Already Done)
- **Pin 3** (GPIO 2) → SDA (I2C Data)
- **Pin 5** (GPIO 3) → SCL (I2C Clock)
- **Pin 4** (5V) → VCC (Power)
- **Pin 39** (GND) → Ground

That's it! Only 4 wires needed.

## Step-by-Step Setup

### Step 1: Enable I2C on Raspberry Pi

SSH into your Raspberry Pi and run:

```bash
sudo raspi-config
```

Navigate to:
1. **Interface Options**
2. **I2C**
3. Select **Yes** to enable
4. Reboot: `sudo reboot`

### Step 2: Install Required Packages

```bash
sudo apt-get update
sudo apt-get install -y python3-smbus i2c-tools
```

### Step 3: Detect Your LCD I2C Address

```bash
sudo i2cdetect -y 1
```

You should see something like:
```
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:          -- -- -- -- -- -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- 27 -- -- -- -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 3f 
```

Common addresses are **0x27** or **0x3f**. Note which one you see.

### Step 4: Update LCD Code (If Needed)

If your address is **0x3f** instead of **0x27**, edit `lcd_display.py`:

```python
I2C_ADDR = 0x3F  # Change from 0x27 to 0x3F
```

The code will automatically try both addresses, so you might not need to change anything.

### Step 5: Copy Files to Raspberry Pi

Transfer these files:

```bash
# From your computer
scp raspberry-pi-files/lcd_display.py pi@your-pi-ip:~/smartkart/
scp raspberry-pi-files/test_lcd.py pi@your-pi-ip:~/smartkart/
scp raspberry-pi-files/weight_sensor_service.py pi@your-pi-ip:~/smartkart/
```

### Step 6: Test the LCD

On the Raspberry Pi:

```bash
cd ~/smartkart
python3 test_lcd.py
```

**What you should see:**
- LCD displays "SmartKart LCD" / "Test Mode"
- Various weight values (0.0kg, 1.234kg, etc.)
- Different status messages
- Display clears and shows "Test Complete"

### Step 7: Restart Weight Sensor Service

```bash
sudo systemctl restart weight-sensor
```

### Step 8: Verify It's Working

```bash
sudo journalctl -u weight-sensor -f
```

**LCD should show:**
1. "SmartKart" / "Starting..."
2. "SmartKart" / "Connected"
3. "Cart Weight" / "XX.XXkg OK"

## Troubleshooting

### LCD Shows Nothing

**Check I2C connection:**
```bash
sudo i2cdetect -y 1
```
If you don't see any address (27 or 3f), check your wiring.

**Check I2C is enabled:**
```bash
ls /dev/i2c*
```
Should show `/dev/i2c-1`. If not, enable I2C in raspi-config.

### Wrong I2C Address

If test fails, try the other common address:

Edit `lcd_display.py`:
```python
I2C_ADDR = 0x3F  # or 0x27
```

### Backlight On But No Text

The contrast might be set wrong on your I2C backpack. Some I2C modules have a small potentiometer on the back - try adjusting it.

### Permission Denied Error

Add your user to the i2c group:
```bash
sudo usermod -a -G i2c $USER
sudo reboot
```

## Quick Test Commands

```bash
# Check I2C devices
sudo i2cdetect -y 1

# Test LCD
python3 test_lcd.py

# Check service status
sudo systemctl status weight-sensor

# View logs
sudo journalctl -u weight-sensor -f

# Restart service
sudo systemctl restart weight-sensor
```

## That's It!

Your I2C LCD is much simpler than parallel LCDs:
- Only 4 wires
- No contrast adjustment needed (usually)
- Automatic address detection
- Works with existing code

The LCD will now show real-time cart weight automatically!
