# SmartKart - IoT Shopping Cart System

A smart shopping cart system with RFID tag reading, weight sensors, and real-time inventory management.

## Project Overview

SmartKart is an IoT-enabled shopping cart that automatically detects items using RFID tags and weight sensors. The system consists of:
- **Backend**: Node.js/Express server with MongoDB for inventory and cart management
- **Frontend**: React web application for monitoring and management
- **Raspberry Pi**: Hardware integration for RFID readers and weight sensors

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- Raspberry Pi with RFID reader and weight sensor hardware
- Python 3.7+ (for Raspberry Pi)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd smartkart
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=8001
MONGO_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Start the backend server:
```bash
node index.js
```

The backend will run on `http://localhost:8001`

### 3. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:
```env
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
```

Start the frontend:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Raspberry Pi Setup

### 1. Find Your Raspberry Pi IP Address

On the Raspberry Pi, run:
```bash
hostname -I
```

Or check your router's connected devices list.

### 2. SSH into Raspberry Pi

From your computer:
```bash
ssh pi@<raspberry-pi-ip>
```

Example: `ssh pi@192.168.1.100`

### 3. Configure Raspberry Pi

Create a `.env` file in the `raspberry-pi-files` directory:
```env
BACKEND_URL=http://<your-backend-ip>:8001
CART_ID=1234
WEIGHT_UPDATE_INTERVAL=1.0
```

Replace `<your-backend-ip>` with your backend server's IP address.

### 4. Install Dependencies

```bash
cd raspberry-pi-files
pip3 install -r requirements.txt
```

### 5. Setup Systemd Services

The system uses two services:
- `smartkart-rfid`: RFID reader service
- `smartkart-weight`: Weight sensor service

Copy service files:
```bash
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable smartkart-rfid smartkart-weight
```

### 6. Start Services

```bash
sudo systemctl start smartkart-rfid
sudo systemctl start smartkart-weight
```

### 7. Restart Services (when needed)

```bash
sudo systemctl restart smartkart-rfid
sudo systemctl restart smartkart-weight
```

### 8. View RFID Logs

To monitor RFID service in real-time:
```bash
sudo journalctl -u smartkart-rfid -f
```

To view weight sensor logs:
```bash
sudo journalctl -u smartkart-weight -f
```

To view last 50 lines:
```bash
sudo journalctl -u smartkart-rfid -n 50
```

### 9. Check Service Status

```bash
sudo systemctl status smartkart-rfid
sudo systemctl status smartkart-weight
```

## Quick Reference

### Common Commands

**Backend:**
```bash
cd backend && node index.js
```

**Frontend:**
```bash
cd client && npm start
```

**SSH to Pi:**
```bash
ssh pi@<pi-ip-address>
```

**Restart Pi Services:**
```bash
sudo systemctl restart smartkart-rfid smartkart-weight
```

**View Logs:**
```bash
sudo journalctl -u smartkart-rfid -f
sudo journalctl -u smartkart-weight -f
```

## Troubleshooting

- **Backend not connecting**: Check MongoDB URI and ensure MongoDB is accessible
- **Frontend can't reach backend**: Verify backend is running and CORS is configured
- **Pi services not starting**: Check logs with `journalctl` and verify `.env` configuration
- **RFID not reading**: Ensure RFID reader is properly connected and powered
- **Weight sensor issues**: Run calibration script: `python3 calibrate_sensor.py`

## Project Structure

```
smartkart/
├── backend/           # Node.js backend server
├── client/            # React frontend
├── raspberry-pi-files/ # Pi hardware integration
└── simulation/        # Testing and simulation tools
```

## License

ISC
