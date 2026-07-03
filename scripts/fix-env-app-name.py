#!/usr/bin/env python3
from pathlib import Path
p = Path("/var/www/somnus/.env")
text = p.read_text()
text = text.replace(
    "NEXT_PUBLIC_APP_NAME=Somnus - Boletera",
    'NEXT_PUBLIC_APP_NAME="Somnus - Boletera"',
)
p.write_text(text)
print("fixed")
