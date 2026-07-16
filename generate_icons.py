import os
from PIL import Image

def generate_icons(source_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Define required icons and their sizes
    icons = {
        'favicon-16x16.png': (16, 16),
        'favicon-32x32.png': (32, 32),
        'apple-touch-icon.png': (180, 180),
        'android-chrome-192x192.png': (192, 192),
        'android-chrome-512x512.png': (512, 512),
    }
    
    try:
        with Image.open(source_path) as img:
            # Ensure transparency is preserved if present
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Generate PNG icons
            for name, size in icons.items():
                icon = img.resize(size, Image.Resampling.LANCZOS)
                icon.save(os.path.join(output_dir, name))
                print(f"Generated: {name}")
            
            # Generate favicon.ico (multi-resolution)
            ico_sizes = [(16, 16), (32, 32), (48, 48)]
            ico_images = [img.resize(size, Image.Resampling.LANCZOS) for size in ico_sizes]
            ico_images[0].save(
                os.path.join(output_dir, 'favicon.ico'),
                format='ICO',
                sizes=ico_sizes,
                append_images=ico_images[1:]
            )
            print("Generated: favicon.ico")
            
    except Exception as e:
        print(f"Error generating icons: {e}")

if __name__ == "__main__":
    source = "/home/ubuntu/project/public/logo-source.png"
    output = "/home/ubuntu/project/public"
    generate_icons(source, output)
