import os
import re

dir_path = r'd:\Project\Dehydrated'

html_files = [f for f in os.listdir(dir_path) if f.endswith('.html')]
css_files = [f for f in os.listdir(dir_path) if f.endswith('.css')]
js_files = [f for f in os.listdir(dir_path) if f.endswith('.js')]
images_dir = os.path.join(dir_path, 'images')

existing_images = []
if os.path.exists(images_dir):
    existing_images = os.listdir(images_dir)

issues = []

# Check HTML files
for html_file in html_files:
    path = os.path.join(dir_path, html_file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check images
    imgs = re.findall(r'src="(.*?)"', content)
    for img in imgs:
        if img.startswith('http') or img.startswith('//'):
            continue
        if img.startswith('images/'):
            img_name = img.split('/')[-1]
            if img_name not in existing_images:
                issues.append(f"{html_file}: Missing image {img}")
        else:
            if not os.path.exists(os.path.join(dir_path, img)):
                issues.append(f"{html_file}: Missing file {img}")
                
    # Check links
    links = re.findall(r'href="(.*?)"', content)
    for link in links:
        if link.startswith('http') or link.startswith('//') or link.startswith('#'):
            continue
        # Remove query params or hashes
        file_target = link.split('?')[0].split('#')[0]
        if file_target and not os.path.exists(os.path.join(dir_path, file_target)):
            issues.append(f"{html_file}: Broken link {link}")

# Check CSS
for css_file in css_files:
    path = os.path.join(dir_path, css_file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    urls = re.findall(r'url\((.*?)\)', content)
    for url in urls:
        url = url.strip("'\"")
        if url.startswith('http') or url.startswith('data:'):
            continue
        if not os.path.exists(os.path.join(dir_path, url)):
            issues.append(f"{css_file}: Missing asset in CSS: {url}")

if issues:
    print("ISSUES FOUND:")
    for i in issues:
        print("- " + i)
else:
    print("No missing assets or broken links found.")
