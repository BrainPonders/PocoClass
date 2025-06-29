#!/usr/bin/env python3
"""
POCOmeta Setup Validation Tool
=============================

This tool validates your POCOmeta configuration and helps prevent common setup issues.
Run this before deploying to production or after pulling updates from git.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def check_settings_file():
    """Check if settings.py exists and is properly configured"""
    settings_path = Path("settings.py")
    example_path = Path("settings.py.example")
    
    print("🔍 Checking settings configuration...")
    
    # Check if settings.py exists
    if not settings_path.exists():
        print("❌ settings.py file not found!")
        if example_path.exists():
            print("✅ Found settings.py.example template")
            print("📝 Please copy settings.py.example to settings.py and customize it:")
            print("   cp settings.py.example settings.py")
            return False
        else:
            print("❌ No template file found either!")
            return False
    
    # Check if settings.py looks like it's been customized
    try:
        with open(settings_path, 'r') as f:
            content = f.read()
        
        # Check for placeholder values that indicate unconfigured template
        if "CHANGE_ME_TO_YOUR_PAPERLESS_URL" in content:
            print("❌ PAPERLESS_URL still contains template placeholder")
            print("   Please edit settings.py and set your actual Paperless server URL")
            return False
            
        if "CHANGE_ME_TO_YOUR_API_TOKEN" in content:
            print("❌ PAPERLESS_TOKEN still contains template placeholder")
            print("   Please edit settings.py and set your API token")
            return False
        
        # Try to import and validate settings
        try:
            sys.path.insert(0, '.')
            import settings
            
            # Check if validation function exists and use it
            if hasattr(settings, 'validate_required_settings'):
                is_valid, errors = settings.validate_required_settings()
                if not is_valid:
                    print("❌ Settings validation failed:")
                    for error in errors:
                        print(f"   • {error}")
                    return False
            
            print("✅ settings.py appears to be properly configured")
            return True
            
        except ImportError as e:
            print(f"❌ Error importing settings.py: {e}")
            return False
        except Exception as e:
            print(f"❌ Error validating settings: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error reading settings.py: {e}")
        return False

def backup_current_settings():
    """Create a backup of current settings before git operations"""
    settings_path = Path("settings.py")
    if settings_path.exists():
        # Create backup with timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = Path(f"settings.py.backup.{timestamp}")
        shutil.copy2(settings_path, backup_path)
        print(f"✅ Created backup: {backup_path}")
        return backup_path
    return None

def restore_settings_from_backup():
    """Help user restore settings from backup"""
    backup_files = list(Path(".").glob("settings.py.backup.*"))
    if backup_files:
        print("📋 Available backup files:")
        for i, backup in enumerate(backup_files, 1):
            print(f"   {i}. {backup}")
        
        try:
            choice = input("Enter number to restore (or 'q' to quit): ").strip()
            if choice.lower() == 'q':
                return False
            
            backup_index = int(choice) - 1
            if 0 <= backup_index < len(backup_files):
                backup_file = backup_files[backup_index]
                shutil.copy2(backup_file, "settings.py")
                print(f"✅ Restored settings from {backup_file}")
                return True
            else:
                print("❌ Invalid selection")
                return False
        except (ValueError, KeyboardInterrupt):
            print("❌ Operation cancelled")
            return False
    else:
        print("❌ No backup files found")
        return False

def check_environment():
    """Check if required environment is available"""
    print("\n🔍 Checking environment...")
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ required")
        return False
    else:
        print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Check required packages
    required_packages = ['requests', 'yaml', 'tabulate']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} (missing)")
    
    if missing_packages:
        print(f"\n📦 Install missing packages:")
        if 'yaml' in missing_packages:
            print("   pip install pyyaml requests tabulate")
        else:
            print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

def check_rules_directory():
    """Check if rules directory exists and has files"""
    print("\n🔍 Checking rules configuration...")
    
    rules_dir = Path("rules")
    if not rules_dir.exists():
        print("❌ rules/ directory not found")
        print("   Create the directory and add your YAML rule files")
        return False
    
    yaml_files = list(rules_dir.glob("*.yaml")) + list(rules_dir.glob("*.yml"))
    if not yaml_files:
        print("❌ No YAML rule files found in rules/ directory")
        print("   Add your rule files (.yaml or .yml) to the rules/ directory")
        return False
    
    print(f"✅ Found {len(yaml_files)} rule files:")
    for rule_file in yaml_files[:5]:  # Show first 5
        print(f"   • {rule_file.name}")
    if len(yaml_files) > 5:
        print(f"   ... and {len(yaml_files) - 5} more")
    
    return True

def test_connection():
    """Test connection to Paperless with current settings"""
    print("\n🔍 Testing Paperless connection...")
    
    try:
        sys.path.insert(0, '.')
        from config import Config
        from api_client import PaperlessAPIClient
        
        config = Config()
        client = PaperlessAPIClient(config)
        
        if client.test_connection():
            print("✅ Successfully connected to Paperless API")
            return True
        else:
            print("❌ Failed to connect to Paperless API")
            print("   Check your PAPERLESS_URL and PAPERLESS_TOKEN settings")
            return False
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def run_quick_test():
    """Run a quick dry-run test"""
    print("\n🔍 Running quick test...")
    
    try:
        result = subprocess.run([
            sys.executable, "main.py", "--dry-run", "--limit", "1"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Quick test passed")
            return True
        else:
            print("❌ Quick test failed")
            if result.stderr:
                print(f"   Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Test timed out")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    """Main validation routine"""
    print("=" * 60)
    print("POCOmeta Setup Validation")
    print("=" * 60)
    
    all_passed = True
    
    # Check environment
    if not check_environment():
        all_passed = False
    
    # Check settings
    if not check_settings_file():
        all_passed = False
        
        # Offer to restore from backup or create from template
        print("\n🔧 Would you like to:")
        print("1. Restore settings from backup")
        print("2. Copy from template and configure manually")
        print("3. Exit and fix manually")
        
        try:
            choice = input("Choice (1-3): ").strip()
            if choice == "1":
                if restore_settings_from_backup():
                    if check_settings_file():
                        all_passed = True
            elif choice == "2":
                if Path("settings.py.example").exists():
                    shutil.copy2("settings.py.example", "settings.py")
                    print("✅ Copied template to settings.py")
                    print("📝 Please edit settings.py and customize the values")
                    print("   Required changes:")
                    print("   • PAPERLESS_URL = 'your_server_url'")
                    print("   • PAPERLESS_TOKEN = 'your_api_token'")
                    return False
        except KeyboardInterrupt:
            print("\n❌ Operation cancelled")
            return False
    
    # Check rules
    if not check_rules_directory():
        all_passed = False
    
    # Test connection if basic checks passed
    if all_passed:
        if not test_connection():
            all_passed = False
    
    # Run quick test if everything else passed
    if all_passed:
        if not run_quick_test():
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All checks passed! POCOmeta is ready to use.")
        print("\nNext steps:")
        print("• Run: python3 main.py --dry-run --verbose")
        print("• Check output and logs")
        print("• Remove --dry-run flag when ready for live processing")
    else:
        print("❌ Some issues found. Please fix them before using POCOmeta.")
        print("\nCommon fixes:")
        print("• Edit settings.py with your Paperless URL and API token")
        print("• Add rule files (.yaml) to the rules/ directory")
        print("• Install missing Python packages")
    print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)