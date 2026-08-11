import os
from PIL import Image

SOURCE = "/home/ubuntu/reliable-project/public/logo-transparent.png"
PUBLIC = "/home/ubuntu/reliable-project/public"

def generate_sizes(image, output_dir):
    # Standard Favicons (Transparent)
    for size in (16, 32, 64):
        padding = int(size * 0.1)
        inner_size = size - padding * 2
        inner = image.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.alpha_composite(inner, (padding, padding))
        
        if size == 16:
            icon.save(os.path.join(output_dir, "favicon-16x16.png"))
        elif size == 32:
            icon.save(os.path.join(output_dir, "favicon-32x32.png"))
            icon.save(os.path.join(output_dir, "favicon.ico"), format="ICO")

    # Mobile Launcher Icons (Solid Black Background - TikTok Style)
    # This prevents the OS from adding a white background that hides the white logo.
    for size in (192, 512):
        padding = int(size * 0.25) # Professional padding
        inner_size = size - padding * 2
        inner = image.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        
        # Create solid black background
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 255))
        icon.alpha_composite(inner, (padding, padding))
        
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
        print("Launcher icons (Black) and Favicons (Transparent) generated.")
