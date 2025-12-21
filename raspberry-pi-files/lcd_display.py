#!/usr/bin/env python3
"""
LCD Display Module for SmartKart
Displays total cart weight on 16x2 I2C LCD
Connected to GPIO pins: 3 (SDA), 5 (SCL), 4 (VCC), 39 (GND)
"""

import time
try:
    import smbus
    REAL_HARDWARE = True
except (ImportError, RuntimeError):
    print("[LCD] smbus not available - running in simulation mode")
    REAL_HARDWARE = False

# I2C Configuration
I2C_ADDR = 0x27  # Common I2C address (might be 0x3F on some displays)
I2C_BUS = 1      # I2C bus 1 (Pin 3=SDA, Pin 5=SCL)

# LCD Commands
LCD_WIDTH = 16
LCD_CHR = 1  # Sending data
LCD_CMD = 0  # Sending command

LCD_LINE_1 = 0x80  # LCD RAM address for line 1
LCD_LINE_2 = 0xC0  # LCD RAM address for line 2

# Timing constants
E_PULSE = 0.0005
E_DELAY = 0.0005

# LCD Backlight
LCD_BACKLIGHT = 0x08  # On
# LCD_BACKLIGHT = 0x00  # Off

ENABLE = 0b00000100  # Enable bit

class LCDDisplay:
    """Class to manage I2C LCD display operations"""
    
    def __init__(self, i2c_addr=I2C_ADDR):
        """Initialize I2C LCD display"""
        self.initialized = False
        self.i2c_addr = i2c_addr
        self.bus = None
        
        if REAL_HARDWARE:
            try:
                self.bus = smbus.SMBus(I2C_BUS)
                self._initialize_lcd()
                self.initialized = True
                print(f"[LCD] I2C Display initialized at address 0x{i2c_addr:02X}")
            except Exception as e:
                print(f"[LCD] Failed to initialize: {e}")
                print("[LCD] Trying alternate I2C address 0x3F...")
                try:
                    self.i2c_addr = 0x3F
                    self.bus = smbus.SMBus(I2C_BUS)
                    self._initialize_lcd()
                    self.initialized = True
                    print(f"[LCD] I2C Display initialized at address 0x{self.i2c_addr:02X}")
                except Exception as e2:
                    print(f"[LCD] Failed with alternate address: {e2}")
                    self.initialized = False
        else:
            print("[LCD] Running in simulation mode")
            self.initialized = True
    
    def _write_byte(self, data):
        """Write a byte to I2C"""
        if not REAL_HARDWARE or not self.bus:
            return
        try:
            self.bus.write_byte(self.i2c_addr, data)
        except Exception as e:
            print(f"[LCD] I2C write error: {e}")
    
    def _lcd_strobe(self, data):
        """Toggle enable pin"""
        self._write_byte(data | ENABLE | LCD_BACKLIGHT)
        time.sleep(E_PULSE)
        self._write_byte((data & ~ENABLE) | LCD_BACKLIGHT)
        time.sleep(E_DELAY)
    
    def _lcd_write_four_bits(self, data):
        """Write 4 bits to LCD"""
        self._write_byte(data | LCD_BACKLIGHT)
        self._lcd_strobe(data)
    
    def _lcd_byte(self, bits, mode):
        """Send byte to LCD via I2C"""
        if not REAL_HARDWARE:
            return
        
        # High bits
        high_bits = mode | (bits & 0xF0) | LCD_BACKLIGHT
        self._lcd_write_four_bits(high_bits)
        
        # Low bits
        low_bits = mode | ((bits << 4) & 0xF0) | LCD_BACKLIGHT
        self._lcd_write_four_bits(low_bits)
    
    def _initialize_lcd(self):
        """Initialize LCD in 4-bit mode via I2C"""
        self._lcd_byte(0x33, LCD_CMD)  # Initialize
        self._lcd_byte(0x32, LCD_CMD)  # Set to 4-bit mode
        self._lcd_byte(0x06, LCD_CMD)  # Cursor move direction
        self._lcd_byte(0x0C, LCD_CMD)  # Display on, cursor off
        self._lcd_byte(0x28, LCD_CMD)  # 2 line display
        self._lcd_byte(0x01, LCD_CMD)  # Clear display
        time.sleep(E_DELAY)
    
    def _lcd_string(self, message, line):
        """Send string to LCD"""
        message = message.ljust(LCD_WIDTH, " ")
        self._lcd_byte(line, LCD_CMD)
        for i in range(LCD_WIDTH):
            self._lcd_byte(ord(message[i]), LCD_CHR)
    
    def display_weight(self, weight, status="Ready"):
        """
        Display weight on LCD
        Line 1: Cart Weight
        Line 2: Weight value and status
        """
        if not self.initialized:
            print(f"[LCD Simulation] Weight: {weight:.2f}kg | Status: {status}")
            return
        
        try:
            line1 = "Cart Weight"
            line2 = f"{weight:.2f}kg {status}"
            
            if REAL_HARDWARE:
                self._lcd_string(line1, LCD_LINE_1)
                self._lcd_string(line2, LCD_LINE_2)
            else:
                print(f"[LCD] {line1}")
                print(f"[LCD] {line2}")
        except Exception as e:
            print(f"[LCD] Error displaying weight: {e}")
    
    def clear(self):
        """Clear LCD display"""
        if not self.initialized:
            return
        
        try:
            if REAL_HARDWARE:
                self._lcd_byte(0x01, LCD_CMD)
            else:
                print("[LCD] Display cleared")
        except Exception as e:
            print(f"[LCD] Error clearing display: {e}")
    
    def display_message(self, line1, line2=""):
        """Display custom message on LCD"""
        if not self.initialized:
            print(f"[LCD Simulation] {line1} | {line2}")
            return
        
        try:
            if REAL_HARDWARE:
                self._lcd_string(line1, LCD_LINE_1)
                self._lcd_string(line2, LCD_LINE_2)
            else:
                print(f"[LCD] {line1}")
                print(f"[LCD] {line2}")
        except Exception as e:
            print(f"[LCD] Error displaying message: {e}")
    
    def cleanup(self):
        """Cleanup I2C resources"""
        if REAL_HARDWARE and self.initialized:
            try:
                self.clear()
                if self.bus:
                    self.bus.close()
                print("[LCD] I2C cleanup completed")
            except Exception as e:
                print(f"[LCD] Error during cleanup: {e}")


# Module-level instance
_lcd_instance = None

def get_lcd():
    """Get or create LCD instance"""
    global _lcd_instance
    if _lcd_instance is None:
        _lcd_instance = LCDDisplay()
    return _lcd_instance

def display_weight(weight, status="Ready"):
    """Convenience function to display weight"""
    lcd = get_lcd()
    lcd.display_weight(weight, status)

def display_message(line1, line2=""):
    """Convenience function to display custom message"""
    lcd = get_lcd()
    lcd.display_message(line1, line2)

def cleanup():
    """Cleanup LCD resources"""
    global _lcd_instance
    if _lcd_instance:
        _lcd_instance.cleanup()
        _lcd_instance = None


if __name__ == '__main__':
    """Test LCD display"""
    print("Testing LCD Display...")
    lcd = LCDDisplay()
    
    try:
        # Test messages
        lcd.display_message("SmartKart", "Initializing...")
        time.sleep(2)
        
        # Test weight display
        for weight in [0.0, 1.5, 3.75, 10.25, 15.5]:
            lcd.display_weight(weight, "OK")
            time.sleep(1)
        
        lcd.display_message("Test Complete", "")
        time.sleep(2)
        
    except KeyboardInterrupt:
        print("\nTest interrupted")
    finally:
        lcd.cleanup()
