# SmartKart Systemd Services Installation Guide

## Overview
These systemd services will run both RFID and Weight Sensor services automatically on boot and restart them if they crash.

## Installation Steps

### 1. Copy service files to systemd directory
```bash
sudo cp smartkart-rfid.service /etc/systemd/system/
sudo cp smartkart-weight.service /etc/systemd/system/
```

### 2. Update the WorkingDirectory paths (if needed)
If your project is not in `/home/pi/smartkart/raspberry-pi-files`, edit the service files:
```bash
sudo nano /etc/systemd/system/smartkart-rfid.service
sudo nano /etc/systemd/system/smartkart-weight.service
```

Change these lines to match your actual path:
- `WorkingDirectory=/home/pi/YOUR_ACTUAL_PATH`
- `ExecStart=/usr/bin/python3 /home/pi/YOUR_ACTUAL_PATH/rfid_service.py`

### 3. Reload systemd to recognize new services
```bash
sudo systemctl daemon-reload
```

### 4. Enable services to start on boot
```bash
sudo systemctl enable smartkart-rfid
sudo systemctl enable smartkart-weight
```

### 5. Start the services
```bash
sudo systemctl start smartkart-rfid
sudo systemctl start smartkart-weight
```

## Managing the Services

### Check service status
```bash
sudo systemctl status smartkart-rfid
sudo systemctl status smartkart-weight
```

### View live logs
```bash
# RFID service logs
sudo journalctl -u smartkart-rfid -f

# Weight service logs
sudo journalctl -u smartkart-weight -f

# Both services together
sudo journalctl -u smartkart-rfid -u smartkart-weight -f
```

### Stop services
```bash
sudo systemctl stop smartkart-rfid
sudo systemctl stop smartkart-weight
```

### Restart services
```bash
sudo systemctl restart smartkart-rfid
sudo systemctl restart smartkart-weight
```

### Disable auto-start on boot
```bash
sudo systemctl disable smartkart-rfid
sudo systemctl disable smartkart-weight
```

### View recent logs (last 50 lines)
```bash
sudo journalctl -u smartkart-rfid -n 50
sudo journalctl -u smartkart-weight -n 50
```

## Troubleshooting

### Service won't start
1. Check the service status for error messages:
   ```bash
   sudo systemctl status smartkart-rfid
   ```

2. Check if Python script has execution errors:
   ```bash
   python3 /home/pi/smartkart/raspberry-pi-files/rfid_service.py
   ```

3. Verify file paths in service files are correct

4. Check permissions:
   ```bash
   ls -la /home/pi/smartkart/raspberry-pi-files/*.py
   ```

### Permission denied errors
Make sure the Python scripts are executable:
```bash
chmod +x /home/pi/smartkart/raspberry-pi-files/rfid_service.py
chmod +x /home/pi/smartkart/raspberry-pi-files/weight_sensor_service.py
```

### Serial port access denied
Add the pi user to the dialout group:
```bash
sudo usermod -a -G dialout pi
sudo reboot
```

### GPIO access denied
Add the pi user to the gpio group:
```bash
sudo usermod -a -G gpio pi
sudo reboot
```

## Updating Configuration

### Change backend URL or cart ID
Edit the service file:
```bash
sudo nano /etc/systemd/system/smartkart-weight.service
```

Update the Environment variables:
```ini
Environment="BACKEND_URL=http://YOUR_NEW_IP:8001"
Environment="CART_ID=YOUR_CART_ID"
```

Then reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart smartkart-weight
```

## Uninstalling

```bash
# Stop and disable services
sudo systemctl stop smartkart-rfid smartkart-weight
sudo systemctl disable smartkart-rfid smartkart-weight

# Remove service files
sudo rm /etc/systemd/system/smartkart-rfid.service
sudo rm /etc/systemd/system/smartkart-weight.service

# Reload systemd
sudo systemctl daemon-reload
```
