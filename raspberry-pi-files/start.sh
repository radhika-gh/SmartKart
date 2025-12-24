#!/bin/bash
export $(grep -v '^#' .env | xargs)
python3 weight_sensor_service.py
