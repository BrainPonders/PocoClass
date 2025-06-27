#!/usr/bin/env python3

import re
from datetime import datetime

# Test filename parsing
filename = "2025-05-19-NL89RABO0330689592"
print(f"Testing filename: {filename}")
print()

# Current pattern from rule
current_pattern = r"(\d{4}-\d{2})-\d{2}-NL89RABO\d{7}592-EUR"
print(f"Current pattern: {current_pattern}")

match = re.search(current_pattern, filename, re.IGNORECASE)
if match:
    print(f"✓ Pattern matches: {match.groups()}")
    if match.groups():
        date_str = match.group(1)
        print(f"  Extracted date: {date_str}")
        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m')
            iso_date = parsed_date.strftime('%Y-%m-%d')
            print(f"  Parsed to ISO: {iso_date}")
        except ValueError as e:
            print(f"  Date parsing failed: {e}")
else:
    print("✗ Pattern does not match")

print()

# Try a corrected pattern
corrected_pattern = r"(\d{4}-\d{2}-\d{2})-NL89RABO\d{10}"
print(f"Corrected pattern: {corrected_pattern}")

match = re.search(corrected_pattern, filename, re.IGNORECASE)
if match:
    print(f"✓ Pattern matches: {match.groups()}")
    if match.groups():
        date_str = match.group(1)
        print(f"  Extracted date: {date_str}")
        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
            iso_date = parsed_date.strftime('%Y-%m-%d')
            print(f"  Parsed to ISO: {iso_date}")
        except ValueError as e:
            print(f"  Date parsing failed: {e}")
else:
    print("✗ Pattern does not match")