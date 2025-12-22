# LCD Display Update: Cart Price Instead of Weight

## Summary
Updated the LCD display system to show **Cart Price** instead of Cart Weight.

## Changes Made

### 1. `raspberry-pi-files/lcd_display.py`
- Added new `display_price()` method to the `LCDDisplay` class
- Displays "Cart Price" on Line 1
- Displays "Rs [price] [status]" on Line 2
- Added convenience function `display_price()` at module level

### 2. `raspberry-pi-files/weight_sensor_service.py`
- Added global variable `current_cart_price` to track cart total
- Added Socket.IO event handler `on_cart_update()` to listen for cart updates from backend
- Modified `connect()` to display initial price after connection
- Updated `main_loop()` to no longer display weight on LCD (still sends weight to backend)
- LCD now updates in real-time when items are added/removed via RFID

### 3. `simulation/weight_sensor_service.py`
- Applied same changes as above for simulation mode
- Prints price updates to console instead of LCD

## How It Works

1. **Weight sensor service** continues to read weight and send updates to backend
2. **Backend** emits `updateCart` event when items are added/removed via RFID
3. **Weight sensor service** listens for `updateCart` events
4. When cart is updated, the service extracts `totalPrice` and updates the LCD
5. **LCD displays**:
   - Line 1: "Cart Price"
   - Line 2: "Rs [amount] OK" (or "Offline" if disconnected)

## LCD Display States

| State | Line 1 | Line 2 |
|-------|--------|--------|
| Normal Operation | Cart Price | Rs 125.50 OK |
| Offline | Cart Price | Rs 125.50 Offline |
| Starting | SmartKart | Starting... |
| Connecting | Connecting... | Please wait |
| Connected | SmartKart | Connected |
| Disconnected | SmartKart | Disconnected |

## Testing

To test the changes:

1. Restart the weight sensor service on Raspberry Pi:
   ```bash
   sudo systemctl restart smartkart-weight
   ```

2. Scan RFID tags to add/remove items
3. Observe LCD updating with new cart price in real-time

## Notes

- Weight monitoring continues in the background (sent to backend every 1 second)
- Price updates happen instantly when items are added/removed
- Uses "Rs" prefix instead of "₹" symbol for LCD compatibility
- Status shows "OK" when connected, "Offline" when disconnected
