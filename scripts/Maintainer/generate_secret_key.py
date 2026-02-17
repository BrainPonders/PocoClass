#!/usr/bin/env python3
"""
PocoClass Secret Key Generator
Generates a secure encryption key for POCOCLASS_SECRET_KEY
"""

import sys
from cryptography.fernet import Fernet

def generate_key():
    """Generate a new Fernet encryption key"""
    key = Fernet.generate_key().decode()
    return key

def main():
    print("=" * 60)
    print("PocoClass Encryption Key Generator")
    print("=" * 60)
    print()
    
    key = generate_key()
    
    print("Generated encryption key:")
    print(f"  {key}")
    print()
    print("=" * 60)
    print("SETUP INSTRUCTIONS")
    print("=" * 60)
    print()
    
    print("📋 OPTION 1: For Development (Local .env file)")
    print("-" * 60)
    print("1. Create a file named .env in the project root")
    print("2. Add this line:")
    print(f"   POCOCLASS_SECRET_KEY={key}")
    print()
    print("3. Make sure .env is in .gitignore (DO NOT commit!)")
    print("4. Start PocoClass: ./start.sh")
    print()
    
    print("📦 OPTION 2: For Docker")
    print("-" * 60)
    print("Add to your docker-compose.yml:")
    print()
    print("services:")
    print("  pococlass:")
    print("    environment:")
    print(f"      - POCOCLASS_SECRET_KEY={key}")
    print("      - PAPERLESS_URL=http://paperless:8000")
    print()
    
    print("🖥️  OPTION 3: For Linux/macOS Server")
    print("-" * 60)
    print("Add to your shell startup file (~/.bashrc or ~/.profile):")
    print()
    print(f'export POCOCLASS_SECRET_KEY="{key}"')
    print()
    print("Then reload: source ~/.bashrc")
    print()
    
    print("☁️  OPTION 4: For Production (systemd service)")
    print("-" * 60)
    print("Create /etc/systemd/system/pococlass.service:")
    print()
    print("[Service]")
    print(f"Environment=\"POCOCLASS_SECRET_KEY={key}\"")
    print("ExecStart=/path/to/pococlass/start.sh")
    print()
    
    print("🔐 SECURITY REMINDERS")
    print("-" * 60)
    print("✅ Generate ONE key per installation")
    print("✅ Keep the key secret (never share/commit to Git)")
    print("✅ Backup the key in a secure password manager")
    print("✅ Use the SAME key across restarts (or users must re-login)")
    print("❌ NEVER change the key unless rotating for security")
    print()
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
