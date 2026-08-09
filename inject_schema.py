import os
import json

index_path = r'd:\Project\Dehydrated\index.html'
products_path = r'd:\Project\Dehydrated\products.html'

index_schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://reneplane.com/#organization",
      "name": "Reneplane",
      "url": "https://reneplane.com/",
      "logo": "https://reneplane.com/images/moringa-powder.jpg",
      "description": "Premium organic powder products sourced from certified organic farms."
    },
    {
      "@type": "WebSite",
      "@id": "https://reneplane.com/#website",
      "url": "https://reneplane.com/",
      "name": "Reneplane",
      "publisher": {
        "@id": "https://reneplane.com/#organization"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I use the powder products?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Add 1–2 teaspoons to smoothies, juices, soups, or sprinkle over salads. It blends easily into any recipe."
          }
        },
        {
          "@type": "Question",
          "name": "Are these products suitable for vegans?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! All Reneplane powders are 100% plant-based, vegan, and free from any animal-derived ingredients."
          }
        },
        {
          "@type": "Question",
          "name": "How long does shipping take?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Standard shipping takes 3–7 business days. Express options are available at checkout."
          }
        },
        {
          "@type": "Question",
          "name": "What is the shelf life?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our powders have a shelf life of 24 months when stored in a cool, dry place with the resealable pouch properly sealed."
          }
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://reneplane.com/"
        }
      ]
    }
  ]
}

products_schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://reneplane.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Products",
          "item": "https://reneplane.com/products.html"
        }
      ]
    },
    {
      "@type": "ItemList",
      "name": "Organic Powders Collection",
      "itemListElement": [
        {
          "@type": "Product",
          "position": 1,
          "name": "Moringa Powder",
          "description": "Pure leaves without stems — nature's most nutrient-dense superfood.",
          "offers": { "@type": "Offer", "price": "29.99", "priceCurrency": "USD" }
        },
        {
          "@type": "Product",
          "position": 2,
          "name": "Onion Powder",
          "description": "Pure onion without stems — essential seasoning for every kitchen.",
          "offers": { "@type": "Offer", "price": "24.99", "priceCurrency": "USD" }
        },
        {
          "@type": "Product",
          "position": 3,
          "name": "Banana Powder",
          "description": "Pure banana without stems — natural energy boost and nutrition.",
          "offers": { "@type": "Offer", "price": "22.99", "priceCurrency": "USD" }
        },
        {
          "@type": "Product",
          "position": 4,
          "name": "Papaya Leaf Powder",
          "description": "Pure papaya leaf without stems — herbal wellness support.",
          "offers": { "@type": "Offer", "price": "26.99", "priceCurrency": "USD" }
        }
      ]
    }
  ]
}

def inject_schema(filepath, schema_dict):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove existing schema if any
    import re
    content = re.sub(r'<script type="application/ld\+json">.*?</script>', '', content, flags=re.DOTALL)
    
    script_tag = f'<script type="application/ld+json">\n{json.dumps(schema_dict, indent=2)}\n    </script>\n</head>'
    content = content.replace('</head>', script_tag)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

inject_schema(index_path, index_schema)
inject_schema(products_path, products_schema)
print("Injected JSON-LD schemas successfully.")
