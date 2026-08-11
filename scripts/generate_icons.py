import os
from PIL import Image, ImageOps
import numpy as np

def remove_background(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    data = np.array(img)
    
    # We want to keep WHITE and TEAL.
    # White: R,G,B are all high (>200)
    # Teal: R is low (<100), G is high (>120), B is medium (>100)
    
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # White mask
    white_mask = (r > 180) & (g > 180) & (b > 180)
    
    # Teal mask (based on the logo's teal)
    teal_mask = (r < 150) & (g > 100) & (b > 100)
    
    # Combine masks
    keep_mask = white_mask | teal_mask
    
    # Set everything else to transparent
    data[~keep_mask] = [0, 0, 0, 0]
    
    new_img = Image.fromarray(data)
    
    # Trim to content
    bbox = new_img.getbbox()
    if bbox:
        new_img = new_img.crop(bbox)
    
    # Create a square canvas for the logo
    w, h = new_img.size
    size = max(w, h)
    square_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    square_img.paste(new_img, ((size - w) // 2, (size - h) // 2))
    
    square_img.save(output_path, "PNG")
    return square_img

def generate_sizes(img, base_dir):
    sizes = [16, 32, 64, 192, 512]
    for size in sizes:
        # PWA icons need padding for professional look
        padding = int(size * 0.2)
        inner_size = size - (padding * 2)
        inner_img = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        
        resized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        resized.paste(inner_img, (padding, padding), inner_img)
        
        if size == 16:
            resized.save(os.path.join(base_dir, "favicon-16x16.png"))
        elif size == 32:
            resized.save(os.path.join(base_dir, "favicon-32x32.png"))
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
    transparent_logo_path = os.path.join(output_dir, "logo-transparent.png")
    img = remove_background(input_logo, transparent_logo_path)
    generate_sizes(img, output_dir)
    print("Done")
