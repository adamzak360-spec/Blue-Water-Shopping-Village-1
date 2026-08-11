import os
from PIL import Image, ImageOps

def remove_background(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # The background is a specific dark blue. We'll target that range.
    # Original blue seems to be around (10, 36, 88) or similar.
    # We'll use a threshold to be safe.
    for item in datas:
        # If the pixel is blue-ish (low red, low green, high blue relative to others)
        # or just target the specific dark background.
        if item[0] < 50 and item[1] < 60 and item[2] > 60:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    
    # Trim the image to the bounding box of the non-transparent content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    return img

def generate_sizes(img, base_dir):
    sizes = [16, 32, 64, 192, 512]
    for size in sizes:
        # For larger PWA icons, add some padding so they don't look too big on splash screens
        if size >= 192:
            padding = int(size * 0.25) # 25% padding
            inner_size = size - (padding * 2)
            inner_img = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
            resized = Image.new("RGBA", (size, size), (255, 255, 255, 0))
            offset = (padding, padding)
            resized.paste(inner_img, offset, inner_img)
        else:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
        if size == 16:
            resized.save(os.path.join(base_dir, "favicon-16x16.png"))
        elif size == 32:
            resized.save(os.path.join(base_dir, "favicon-32x32.png"))
            # Also save as favicon.ico (standard)
            resized.save(os.path.join(base_dir, "favicon.ico"), format="ICO")
        elif size == 192:
            resized.save(os.path.join(base_dir, "logo192.png"))
            resized.save(os.path.join(base_dir, "android-chrome-192x192.png"))
        elif size == 512:
            resized.save(os.path.join(base_dir, "logo512.png"))
            resized.save(os.path.join(base_dir, "android-chrome-512x512.png"))
            resized.save(os.path.join(base_dir, "apple-touch-icon.png"))

if __name__ == "__main__":
    input_logo = "/home/ubuntu/upload/p1b3rlyiAQHbhgc6JjrDOv_1785519971774_na1fn_L2hvbWUvdWJ1bnR1L2xvZ29fY29uY2VwdF8y.webp"
    output_dir = "/home/ubuntu/reliable-project/public"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    transparent_logo_path = os.path.join(output_dir, "logo-transparent.png")
    img = remove_background(input_logo, transparent_logo_path)
    generate_sizes(img, output_dir)
    print(f"Icons generated successfully in {output_dir}")
