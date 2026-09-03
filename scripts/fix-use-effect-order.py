#!/usr/bin/env python3
"""
اصلاح الگوی useEffect قبل از تعریف تابع.
ترتیب رو عوض می‌کنه: اول تابع، بعد useEffect.
"""

import re
from pathlib import Path

def fix_file(filepath: str) -> bool:
    content = Path(filepath).read_text(encoding="utf-8")
    original = content

    # الگو:
    #   useEffect(() => { NAME(); }, [...]);
    #
    #   const NAME = async () => {
    #     ...body...
    #   };
    #
    # تبدیل به:
    #   const NAME = async () => {
    #     ...body...
    #   };
    #
    #   useEffect(() => { NAME(); }, [...]);

    # regex: useEffect block + blank lines + const function block
    pattern = re.compile(
        r'(\s+)useEffect\(\(\) => \{ (\w+)\(\); \}, \[[^\]]*\]\);\n'  # useEffect line
        r'(\s*\n)+'  # blank lines
        r'(\s+)(const \2 = async \(\) => \{)'  # start of function
        r'(.*?)'  # body (non-greedy)
        r'(\n\s+\};)',  # end of function
        re.DOTALL
    )

    def swap(m):
        indent = m.group(1)
        name = m.group(2)
        deps = m.group(0).split('}, [')[1].split(']')[0]
        func_indent = m.group(4)
        func_start = m.group(5)
        func_body = m.group(6)
        func_end = m.group(7)

        return f"{func_indent}{func_start}{func_body}{func_end}\n\n{indent}useEffect(() => {{ {name}(); }}, [{deps}]);"

    content = pattern.sub(swap, content)

    if content != original:
        Path(filepath).write_text(content, encoding="utf-8")
        print(f"✅ Fixed: {filepath}")
        return True
    print(f"⏭️  No match: {filepath}")
    return False

files = [
    "src/components/NavMenuManager.tsx",
    "src/components/SecurityDashboard.tsx",
    "src/components/StatsDashboard.tsx",
    "src/components/TextEditor.tsx",
    "src/components/ThemeBuilder.tsx",
]

for f in files:
    fix_file(f)
