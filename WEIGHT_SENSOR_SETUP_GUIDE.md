# 🎯 Load Cell Integration Guide for SmartKart

## Overview
Your web app is **already configured** to receive and display weight data! The backend handles `weight_update` events via Socket.IO, and the RFID Monitor page displays weight readings in real-time. You just need to set up the Raspberry Pi.

---

## 📋 What You Need

### Hardware
- Raspberry Pi (any model with GPIO pins)
- HX711 load cell amplifier module
- Load cell (strain gauge)
- Jumper wires

### Network Setup
- Raspberry Pi and your laptop on the same WiFi network
- SSH enabled on Raspberry Pi

---

## 🚀 Step-by-Step Setup

### Step 1: Find Your IP Addresses

**On Raspberry Pi:**
```bash
hostname -I
```
Example output: `192.168.1.150` (this is your Pi's IP)

**On Your Laptop (Windows):**
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.
Example: `192.168.1.100` (this is your laptop's IP)

---

### Step 2: SSH into Raspberry Pi

From your laptop (use PowerShell or Command Prompt):
```bash
ssh pi@192.168.1.150
```
Replace `192.168.1.150` with your Pi's actual IP address.
Default password is usually: `raspberry`

---

### Step 3: Create Project Folder on Raspberry Pi

Once connected via SSH:
```bash
mkdir -p ~/smartkart-weight-sensor
cd ~/smartkart-weight-sensor
pwd
```
You should see: `/home/pi/smartkart-weight-sensor`

---

### Step 4: Create Python Files

#### File 1: weight_sensor.py
```bash
nano weight_sensor.py
```

Copy and paste this code:
```python
import random

# Try importing Raspberry Pi-specific libraries
try:
    from hx711 import HX711
    import RPi.GPIO as GPIO
    REAL_HARDWARE = True
except ImportError:
    REAL_HARDWARE = False

# GPIO pin configuration
DT_PIN = 5   # GPIO5 for Data
SCK_PIN = 6  # GPIO6 for Clock

# Global HX711 instance
hx = None

def initialize_hx711():
    """Initialize HX711 load cell amplifier with zero calibration."""
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
    """Returns weight from the load cell or simulated data.
    
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
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

---

#### File 2: weight_sensor_service.py
```bash
nano weight_sensor_service.py
```

Copy and paste this code:
```python
#!/usr/bin/env python3
"""Weight Sensor Service for SmartKart System"""

import os
import time
import socketio
from datetime import datetime
from weight_sensor import get_weight, initialize_hx711, REAL_HARDWARE

# Configuration from environment variables
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8001')
CART_ID = os.getenv('CART_ID', '1234')
WEIGHT_UPDATE_INTERVAL = float(os.getenv('WEIGHT_UPDATE_INTERVAL', '1.0'))

# Create Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    """Called when connection to backend is established"""
    print(f"[Weight Service] Connected to backend at {BACKEND_URL}")
    print(f"[Weight Service] Monitoring cart: {CART_ID}")
    print(f"[Weight Service] Update interval: {WEIGHT_UPDATE_INTERVAL}s")
    print(f"[Weight Service] Hardware mode: {'REAL' if REAL_HARDWARE else 'SIMULATION'}")

@sio.event
def disconnect():
    """Called when connection to backend is lost"""
    print("[Weight Service] Disconnected from backend")

@sio.event
def connect_error(data):
    """Called when connection attempt fails"""
    print(f"[Weight Service] Connection error: {data}")

def send_weight_update(cart_id, measured_weight):
    """Emit weight_update event to backend via Socket.IO"""
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        payload = {
            'cartId': cart_id,
            'measuredWeight': round(measured_weight, 3),
            'timestamp': timestamp
        }
        sio.emit('weight_update', payload)
        print(f"[Weight Service] Sent update: {measured_weight:.3f}kg for cart {cart_id}")
    except Exception as e:
        print(f"[Weight Service] Error sending weight update: {e}")

def main_loop():
    """Main service loop that continuously reads weight and sends updates"""
    print("[Weight Service] Starting main loop...")
    while True:
        try:
            # Read current weight
            weight = get_weight()
            
            # Send update to backend
            if sio.connected:
                send_weight_update(CART_ID, weight)
            else:
                print("[Weight Service] Not connected to backend, skipping update")
            
            # Wait for next update interval
            time.sleep(WEIGHT_UPDATE_INTERVAL)
        except KeyboardInterrupt:
            print("\n[Weight Service] Shutting down...")
            break
        except Exception as e:
            print(f"[Weight Service] Error in main loop: {e}")
            time.sleep(WEIGHT_UPDATE_INTERVAL)

def main():
    """Main entry point for the weight sensor service"""
    print("=" * 60)
    print("SmartKart Weight Sensor Service")
    print("=" * 60)
    
    # Initialize HX711 if running on real hardware
    if REAL_HARDWARE:
        try:
            initialize_hx711()
        except Exception as e:
            print(f"[Weight Service] Failed to initialize HX711: {e}")
            print("[Weight Service] Exiting...")
            return
    else:
        print("[Weight Service] Running in SIMULATION mode")
    
    # Connect to backend
    try:
        print(f"[Weight Service] Connecting to backend at {BACKEND_URL}...")
        sio.connect(BACKEND_URL)
    except Exception as e:
        print(f"[Weight Service] Failed to connect to backend: {e}")
        print("[Weight Service] Exiting...")
        return
    
    # Start main loop
    try:
        main_loop()
    finally:
        # Cleanup on exit
        if sio.connected:
            sio.disconnect()
        print("[Weight Service] Service stopped")

if __name__ == '__main__':
    main()
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

---

#### File 3: .env (Configuration)
```bash
nano .env
```

Add this content (replace `192.168.1.100` with YOUR laptop's IP):
```env
# Backend server URL (your laptop's IP address)
BACKEND_URL=http://192.168.1.100:8001

# Cart ID to monitor
CART_ID=1234

# How often to send weight updates (in seconds)
WEIGHT_UPDATE_INTERVAL=1.0
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

---

#### File 4: start.sh (Startup Script)
```bash
nano start.sh
```

Add this content:
```bash
#!/bin/bash
# Load environment variables from .env file
export $(cat .env | xargs)

# Run the weight sensor service
python3 weight_sensor_service.py
```

Save: Press `Ctrl+X`, then `Y`, then `Enter`

Make it executable:
```bash
chmod +x start.sh
```

---

### Step 5: Install Python Dependencies

On your Raspberry Pi:
```bash
# Update package list
sudo apt-get update

# Install pip if not already installed
sudo apt-get install python3-pip -y

# Install required Python packages
pip3 install python-socketio[client]
pip3 install hx711
pip3 install RPi.GPIO

# Verify installations
pip3 list | grep -E "socketio|hx711|RPi.GPIO"
```

---

### Step 6: Wire the Hardware

**⚠️ IMPORTANT: Turn OFF your Raspberry Pi before wiring!**
```bash
sudo shutdown -h now
```

#### Wiring Connections:

**HX711 to Raspberry Pi:**
```
HX711 Module          Raspberry Pi GPIO
─────────────────────────────────────────
VCC (Red)      →      Pin 2  (5V Power)
GND (Black)    →      Pin 6  (Ground)
DT  (Green)    →      Pin 29 (GPIO 5)
SCK (White)    →      Pin 31 (GPIO 6)
```

**Load Cell to HX711:**
```
Load Cell Wires       HX711 Module
─────────────────────────────────────────
Red Wire       →      E+
Black Wire     →      E-
White Wire     →      A-
Green Wire     →      A+
```

#### GPIO Pin Layout Reference:
```
Raspberry Pi GPIO Header (Top View)
┌─────────────────────────────────┐
│ 1  2  3  4  5  6  7  8  9  10   │  Pin 2: 5V (VCC)
│ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●    │  Pin 6: GND
│ 11 12 13 14 15 16 17 18 19 20   │  Pin 29: GPIO 5 (DT)
│ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●    │  Pin 31: GPIO 6 (SCK)
│ 21 22 23 24 25 26 27 28 29 30   │
│ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●    │
│ 31 32 33 34 35 36 37 38 39 40   │
│ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●    │
└─────────────────────────────────┘
```

After wiring, power on your Raspberry Pi.

---

### Step 7: Test the Complete System

#### On Your Laptop - Terminal 1: Start Backend
```cmd
cd backend
npm start
```

Expected output:
```
Server running on port 8001
MongoDB Connected
```

#### On Your Laptop - Terminal 2: Start Frontend
```cmd
cd client
npm start
```

Browser should open to `http://localhost:3000`

#### On Raspberry Pi: Run Weight Service
SSH back into your Pi:
```bash
ssh pi@192.168.1.150
cd ~/smartkart-weight-sensor
./start.sh
```

Expected output:
```
============================================================
SmartKart Weight Sensor Service
============================================================
[Weight Sensor] Initializing HX711 on GPIO pins DT=5, SCK=6
[Weight Sensor] Performing zero calibration...
[Weight Sensor] HX711 initialized and calibrated successfully
[Weight Service] Connecting to backend at http://192.168.1.100:8001...
[Weight Service] Connected to backend at http://192.168.1.100:8001
[Weight Service] Monitoring cart: 1234
[Weight Service] Update interval: 1.0s
[Weight Service] Hardware mode: REAL
[Weight Service] Starting main loop...
[Weight Service] Sent update: 0.000kg for cart 1234
```

#### On Your Laptop - Browser: Check RFID Monitor
Open: `http://localhost:3000/rfid-monitor`

You should see:
- **Weight Status Card** showing "Measured Weight: 0.00 kg"
- Weight updates every second
- When you place something on the load cell, the weight should change!

---

## 🔧 Troubleshooting

### Problem: "Connection error" on Raspberry Pi

**Check if backend is reachable:**
```bash
# On Raspberry Pi
ping 192.168.1.100
curl http://192.168.1.100:8001
```

**Solution:** Make sure both devices are on the same WiFi network and firewall isn't blocking port 8001.

---

### Problem: "Failed to initialize HX711"

**Check GPIO permissions:**
```bash
sudo usermod -a -G gpio pi
# Log out and log back in
```

**Check wiring:** Verify all connections match the wiring diagram above.

---

### Problem: Weight readings are wrong

**Calibrate the sensor:**

Edit `weight_sensor.py`:
```bash
nano weight_sensor.py
```

Find the `get_weight()` function and modify:
```python
def get_weight():
    if REAL_HARDWARE:
        if hx is None:
            raise RuntimeError("HX711 not initialized. Call initialize_hx711() first.")
        
        try:
            raw_weight = hx.get_weight(5)
            calibration_factor = 1.0  # ADJUST THIS VALUE
            weight = raw_weight * calibration_factor
            return weight
```

Test with a known weight (like 1kg) and adjust `calibration_factor` until readings are accurate.

---

## 🤖 Auto-Start on Boot (Optional)

To make the service start automatically when Raspberry Pi boots:

```bash
sudo nano /etc/systemd/system/weight-sensor.service
```

Add this content (replace IP with your laptop's IP):
```ini
[Unit]
Description=SmartKart Weight Sensor Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/smartkart-weight-sensor
Environment="BACKEND_URL=http://192.168.1.100:8001"
Environment="CART_ID=1234"
Environment="WEIGHT_UPDATE_INTERVAL=1.0"
ExecStart=/usr/bin/python3 /home/pi/smartkart-weight-sensor/weight_sensor_service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable weight-sensor
sudo systemctl start weight-sensor
sudo systemctl status weight-sensor
```

View logs:
```bash
sudo journalctl -u weight-sensor -f
```

---

## 📁 File Structure Summary

**On Raspberry Pi:**
```
/home/pi/smartkart-weight-sensor/
├── weight_sensor.py              # HX711 hardware interface
├── weight_sensor_service.py      # Main service (sends to backend)
├── .env                          # Configuration (backend URL, cart ID)
└── start.sh                      # Startup script
```

**Your Web App (already configured):**
- ✅ Backend receives `weight_update` events via Socket.IO
- ✅ Cart model has `measuredWeight`, `weightDiscrepancy`, `lastWeightUpdate` fields
- ✅ Frontend displays weight data on RFID Monitor page
- ✅ Weight discrepancy alerts when difference > 0.5kg

---

## 🎯 How It Works

1. **Raspberry Pi** reads weight from HX711 → sends to laptop backend via Socket.IO
2. **Backend** receives weight → updates MongoDB → emits to frontend
3. **Frontend** displays weight in real-time on RFID Monitor page
4. **Discrepancy Detection**: If measured weight differs from expected weight by > 0.5kg, an alert is shown

---

## ✅ Quick Start Commands

**On Raspberry Pi:**
```bash
cd ~/smartkart-weight-sensor
./start.sh
```

**On Your Laptop (Terminal 1):**
```cmd
cd backend
npm start
```

**On Your Laptop (Terminal 2):**
```cmd
cd client
npm start
```

**View in Browser:**
```
http://localhost:3000/rfid-monitor
```

---

That's it! Your load cell is now integrated with your SmartKar