#!/bin/bash
# Starts Expo and tees all output to expo.log
# Run this instead of 'npx expo start'
# Claude can then read expo.log to diagnose errors

npx expo start --port 8082 2>&1 | tee expo.log
