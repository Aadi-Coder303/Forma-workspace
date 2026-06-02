import os
import re

REPLACEMENTS = [
    # Backgrounds
    (r'bg-ink', 'bg-base'),
    (r'bg-stone', 'bg-sidebar'),
    (r'bg-mist', 'bg-card'),
    
    # Rgba borders
    (r'border-\[rgba\([^\]]+\)\]', 'border-border'),
    
    # Rgba backgrounds
    (r'hover:bg-\[rgba\([^\]]+\)\]', 'hover:bg-hover'),
    (r'bg-\[rgba\([^\]]+\)\]', 'bg-hover'),
    
    # Text
    (r'text-mist', 'text-primary'),
    (r'text-ink', 'text-primary'),
    (r'text-slate', 'text-muted'),
    
    # Accents (Ember/Moss)
    (r'bg-ember', 'bg-accent'),
    (r'text-ember', 'text-accent'),
    (r'border-ember', 'border-accent'),
    
    (r'bg-moss', 'bg-accent'),
    (r'text-moss', 'text-accent'),
    (r'border-moss', 'border-accent'),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    for pattern, replacement in REPLACEMENTS:
        new_content = re.sub(pattern, replacement, new_content)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    for root, _, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.js'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
