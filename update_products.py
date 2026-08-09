import os
import re

file_path = r'd:\Project\Dehydrated\products.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update title
content = re.sub(
    r'<title>.*?</title>',
    r'<title>All Products - Reneplane | Best Organic Powder Products</title>',
    content,
    flags=re.IGNORECASE
)

# 2. Remove Hero Section
content = re.sub(
    r'<!-- ====== HERO SECTION ====== -->.*?<!-- ====== PRODUCTS SECTION ====== -->',
    r'<!-- ====== PRODUCTS SECTION ====== -->',
    content,
    flags=re.DOTALL
)

# 3. Remove Slider Controls
content = re.sub(
    r'<div class="slider-controls"[\s\S]*?</button>\s*</div>\s*</div>',
    r'</div>',
    content
)

# 4. Change products slider to grid
content = content.replace(
    '<div class="products-slider" id="productsSlider">',
    '<div class="products-grid" id="productsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; margin-top: 40px;">'
)

# 5. Remove View All Products Button
content = re.sub(
    r'<div style="text-align: center; margin-top: 40px; width: 100%;">\s*<a href="products\.html"[\s\S]*?</a>\s*</div>',
    r'',
    content
)

# 6. Remove Why Choose Us, Trust, FAQ
content = re.sub(
    r'<!-- ====== WHY CHOOSE US ====== -->[\s\S]*?<!-- ====== FOOTER ====== -->',
    r'<!-- ====== FOOTER ====== -->',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated products.html")
