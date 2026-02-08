"""
Fix emoji issues in Python files for Windows compatibility
"""
import os
import re
from pathlib import Path

# Directories to fix
dirs_to_fix = [
    Path("backend/memory"),
    Path("backend/graph"),
]

# Emoji replacements
replacements = {
    "✅": "[OK]",
    "⚠️": "[WARN]",
    "❌": "[X]",
    "🧹": "[CLEAN]",
    "🔍": "[SEARCH]",
    "🛑": "[STOP]",
    "🚨": "[ALERT]",
    "🧠": "[BRAIN]",
    "📌": "[NOTE]",
    "🔴": "[ALERT]",
}

def fix_file(filepath: Path):
    """Fix emojis in a single file"""
    try:
        content = filepath.read_text(encoding="utf-8")
        original = content
        
        for emoji, replacement in replacements.items():
            content = content.replace(emoji, replacement)
        
        if content != original:
            filepath.write_text(content, encoding="utf-8")
            print(f"  Fixed: {filepath.name}")
            return True
        return False
    except Exception as e:
        print(f"  Error: {filepath.name} - {e}")
        return False

def main():
    print("Fixing emoji issues in Python files...")
    
    fixed_count = 0
    
    for dir_path in dirs_to_fix:
        if not dir_path.exists():
            print(f"  Skipping {dir_path} (not found)")
            continue
        
        print(f"\nProcessing: {dir_path}")
        
        for py_file in dir_path.glob("*.py"):
            if fix_file(py_file):
                fixed_count += 1
    
    print(f"\n[DONE] Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
