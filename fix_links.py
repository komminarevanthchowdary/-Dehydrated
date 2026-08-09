import os
import re

file_path = r'd:\Project\Dehydrated\products.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix navbar links
content = content.replace('href="#hero"', 'href="index.html#hero"')
content = content.replace('href="#details"', 'href="index.html#details"')
content = content.replace('href="#faq"', 'href="index.html#faq"')
content = content.replace('href="#trust"', 'href="index.html#trust"')

# The nav logic uses 'data-section' to highlight active link on scroll.
# If they go to index.html, it works fine.
# Let's ensure 'Products' remains active or works correctly.
content = content.replace('class="nav-link active" data-section="hero"', 'class="nav-link" data-section="hero"')
content = content.replace('class="nav-link" data-section="products"', 'class="nav-link active" data-section="products"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed navigation links in products.html")
