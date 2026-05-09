
with open(r'c:\Users\PRASD\OneDrive\Desktop\CRM\frontend\src\modules\admin\pages\UserForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"Braces: {content.count('{')} / {content.count('}')}")
    print(f"Parens: {content.count('(')} / {content.count(')')}")
    print(f"Brackets: {content.count('[')} / {content.count(']')}")
