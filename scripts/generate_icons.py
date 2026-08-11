import os
from PIL import Image

SOURCE = "/home/ubuntu/reliable-project/public/logo-square.png"
PUBLIC = "/home/ubuntu/reliable-project/public"

def generate_sizes(image, output_dir):
    # Standard sizes for PWA and Favicons
    # Since the user wants to keep the background, we don't add extra padding
    # The logo-square.png already has the rounded blue square.
    
    # 1. Favicons
    for size in (16, 32, 64):
        icon = image.resize((size, size), Image.Resampling.LANCZOS)
        if size == 16:
            icon.save(os.path.join(output_dir, "favicon-16x16.png"))
        elif size == 32:
            icon.save(os.path.join(output_dir, "favicon-32x32.png"))
            icon.save(os.path.join(output_dir, "favicon.ico"), format="ICO")

    # 2. PWA Icons
    for size in (192, 512):
        icon = image.resize((size, size), Image.Resampling.LANCZOS)
        if size == 192:
            icon.save(os.path.join(output_dir, "logo192.png"))
            icon.save(os.path.join(output_dir, "android-chrome-192x192.png"))
        elif size == 512:
            icon.save(os.path.join(output_dir, "logo512.png"))
            icon.save(os.path.join(output_dir, "android-chrome-512x512.png"))
            icon.save(os.path.join(output_dir, "apple-touch-icon.png"))

if __name__ == "__main__":
    os.makedirs(PUBLIC, exist_ok=True)
    if not os.path.exists(SOURCE):
        print(f"Error: Source {SOURCE} not found.")
    else:
        logo = Image.open(SOURCE).convert("RGBA")
        generate_sizes(logo, PUBLIC)
        print("Icons generated from square logo.")
