# LCD Wiring Diagram

## Visual Pin Layout

```
Raspberry Pi GPIO Header (Top View)
====================================

    3V3  (1) (2)  5V  ◄─────────────┐
  GPIO2  (3) (4)  5V                │ LCD Pin 2 (VDD)
  GPIO3  (5) (6)  GND               │ LCD Pin 15 (Backlight+) via 220Ω
  GPIO4  (7) (8)  GPIO14            │
    GND  (9) (10) GPIO15            │
 GPIO17 (11) (12) GPIO18            │
 GPIO27 (13) (14) GND               │
 GPIO22 (15) (16) GPIO23            │
    3V3 (17) (18) GPIO24            │
 GPIO10 (19) (20) GND               │
  GPIO9 (21) (22) GPIO25            │
 GPIO11 (23) (24) GPIO8             │
    GND (25) (26) GPIO7             │
  GPIO0 (27) (28) GPIO1             │
  GPIO5 (29) (30) GND               │
  GPIO6 (31) (32) GPIO12            │
 GPIO13 (33) (34) GND               │
 GPIO19 (35) (36) GPIO16            │
 GPIO26 (37) (38) GPIO20            │
    GND (39) (40) GPIO21 ◄──────────┘ LCD Pin 1 (VSS)
         └──────────────────────────┘ LCD Pin 5 (RW)
                                      LCD Pin 16 (Backlight-)

Pin 3 (GPIO2)  ──────────────────────► LCD Pin 4 (RS)
Pin 5 (GPIO3)  ──────────────────────► LCD Pin 6 (E)
```

## LCD Pin Layout (16x2 Display)

```
LCD Display (Front View)
========================

Pin  Function    Connection
---  ----------  ----------------------------------
 1   VSS (GND)   RPi Pin 39 (GND)
 2   VDD (5V)    RPi Pin 4 (5V)
 3   V0 (Contrast) Potentiometer wiper
 4   RS          RPi Pin 3 (GPIO 2)
 5   RW          RPi Pin 39 (GND) - Write mode only
 6   E           RPi Pin 5 (GPIO 3)
 7   D0          Not connected (4-bit mode)
 8   D1          Not connected (4-bit mode)
 9   D2          Not connected (4-bit mode)
10   D3          Not connected (4-bit mode)
11   D4          RPi GPIO 17
12   D5          RPi GPIO 27
13   D6          RPi GPIO 22
14   D7          RPi GPIO 23
15   A (BL+)     RPi Pin 4 (5V) via 220Ω resistor
16   K (BL-)     RPi Pin 39 (GND)
```

## Contrast Potentiometer Wiring

```
10kΩ Potentiometer
==================

    5V ────┬──── Pin 1 (Left)
           │
    V0 ────┼──── Pin 2 (Wiper/Middle) ──► LCD Pin 3
           │
   GND ────┴──── Pin 3 (Right)
```

## Complete Wiring Schematic

```
                    Raspberry Pi
                   ┌─────────────┐
                   │             │
    ┌──────────────┤ Pin 3 (GP2) │
    │              │             │
    │  ┌───────────┤ Pin 4 (5V)  │──────┐
    │  │           │             │      │
    │  │  ┌────────┤ Pin 5 (GP3) │      │
    │  │  │        │             │      │
    │  │  │  ┌─────┤ Pin 39 (GND)│──┐   │
    │  │  │  │     │             │  │   │
    │  │  │  │  ┌──┤ GPIO 17     │  │   │
    │  │  │  │  │  │             │  │   │
    │  │  │  │  │┌─┤ GPIO 27     │  │   │
    │  │  │  │  ││ │             │  │   │
    │  │  │  │  │││┌┤ GPIO 22     │  │   │
    │  │  │  │  ││││               │   │
    │  │  │  │  │││││┌┤ GPIO 23     │  │   │
    │  │  │  │  ││││││             │  │   │
    │  │  │  │  ││││││             │  │   │
    └──┼──┼──┼──┼─┼┼┼┼┼─────────────┘  │   │
       │  │  │  │ ││││││                │   │
       │  │  │  │ ││││││   16x2 LCD    │   │
       │  │  │  │ ││││││  ┌──────────┐ │   │
       │  │  │  │ ││││││  │          │ │   │
       └──┼──┼──┼─┼┼┼┼┼───┤ 4  (RS)  │ │   │
          │  │  │ ││││││  │          │ │   │
          └──┼──┼─┼┼┼┼┼───┤ 6  (E)   │ │   │
             │  │ ││││││  │          │ │   │
             │  └─┼┼┼┼┼───┤ 1  (VSS) │ │   │
             │    ││││││  │          │ │   │
             │    └┼┼┼┼───┤ 5  (RW)  │ │   │
             │     │││││  │          │ │   │
             └─────┼┼┼┼───┤ 2  (VDD) │ │   │
                   │││││  │          │ │   │
                   └┼┼┼───┤ 11 (D4)  │ │   │
                    ││││  │          │ │   │
                    └┼┼───┤ 12 (D5)  │ │   │
                     ││   │          │ │   │
                     └┼───┤ 13 (D6)  │ │   │
                      │   │          │ │   │
                      └───┤ 14 (D7)  │ │   │
                          │          │ │   │
                  ┌───────┤ 16 (K)   │ │   │
                  │       │          │ │   │
                  │  ┌────┤ 15 (A)   │ │   │
                  │  │    │          │ │   │
                  │  │ ┌──┤ 3  (V0)  │ │   │
                  │  │ │  └──────────┘ │   │
                  │  │ │                │   │
                  │  │ │  Potentiometer │   │
                  │  │ │  ┌──────────┐ │   │
                  │  │ └──┤ Wiper    │ │   │
                  │  │    │          │ │   │
                  │  └────┤ 5V       │ │   │
                  │       │          │ │   │
                  └───────┤ GND      │ │   │
                          └──────────┘ │   │
                                       │   │
                          220Ω Resistor│   │
                          ┌────────────┘   │
                          │                │
                          └────────────────┘
```

## Step-by-Step Connection Guide

### Step 1: Power Connections
1. Connect LCD Pin 1 (VSS) to RPi Pin 39 (GND)
2. Connect LCD Pin 2 (VDD) to RPi Pin 4 (5V)

### Step 2: Control Pins
3. Connect LCD Pin 4 (RS) to RPi Pin 3 (GPIO 2)
4. Connect LCD Pin 5 (RW) to RPi Pin 39 (GND)
5. Connect LCD Pin 6 (E) to RPi Pin 5 (GPIO 3)

### Step 3: Data Pins
6. Connect LCD Pin 11 (D4) to RPi GPIO 17
7. Connect LCD Pin 12 (D5) to RPi GPIO 27
8. Connect LCD Pin 13 (D6) to RPi GPIO 22
9. Connect LCD Pin 14 (D7) to RPi GPIO 23

### Step 4: Backlight (Optional)
10. Connect 220Ω resistor between RPi Pin 4 (5V) and LCD Pin 15 (A)
11. Connect LCD Pin 16 (K) to RPi Pin 39 (GND)

### Step 5: Contrast Control
12. Wire potentiometer:
    - Left pin to 5V
    - Right pin to GND
    - Middle pin (wiper) to LCD Pin 3 (V0)

## Quick Reference Table

| Component | From | To | Notes |
|-----------|------|-----|-------|
| Ground | RPi Pin 39 | LCD Pin 1, 5, 16 | Common ground |
| Power | RPi Pin 4 | LCD Pin 2 | 5V supply |
| RS Signal | RPi Pin 3 (GPIO2) | LCD Pin 4 | Register select |
| Enable | RPi Pin 5 (GPIO3) | LCD Pin 6 | Enable pulse |
| Data D4 | RPi GPIO 17 | LCD Pin 11 | Data bit 4 |
| Data D5 | RPi GPIO 27 | LCD Pin 12 | Data bit 5 |
| Data D6 | RPi GPIO 22 | LCD Pin 13 | Data bit 6 |
| Data D7 | RPi GPIO 23 | LCD Pin 14 | Data bit 7 |
| Backlight | RPi Pin 4 (5V) | LCD Pin 15 | Via 220Ω resistor |
| Contrast | Pot wiper | LCD Pin 3 | Adjust for visibility |

## Testing Connections

After wiring, test with:
```bash
cd raspberry-pi-files
python3 test_lcd.py
```

If display doesn't work:
1. Check all connections match the diagram
2. Adjust contrast potentiometer
3. Verify 5V and GND connections
4. Check GPIO pin numbers in code match physical connections
