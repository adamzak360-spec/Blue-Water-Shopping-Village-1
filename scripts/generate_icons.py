import os
from collections import deque

import numpy as np
from PIL import Image

SOURCE = "/home/ubuntu/reliable-project/public/logo-transparent.png"
PUBLIC = "/home/ubuntu/reliable-project/public"


def flood_remove(mask, rgba, seed):
    height, width = mask.shape
    queue = deque([seed])
    mask[seed] = False
    while queue:
        y, x = queue.popleft()
        rgba[y, x, 3] = 0
        for ny in range(max(0, y - 1), min(height, y + 2)):
            for nx in range(max(0, x - 1), min(width, x + 2)):
                if mask[ny, nx]:
                    mask[ny, nx] = False
                    queue.append((ny, nx))


def remove_background(source_path, output_path):
    image = Image.open(source_path).convert("RGBA")
    rgba = np.array(image)
    rgb = rgba[:, :, :3].astype(np.float32)
    height, width = rgb.shape[:2]
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    alpha = rgba[:, :, 3]

    # Remove the magenta outer field globally. No part of the supplied logo uses it.
    magenta = (alpha > 0) & (red > 145) & (blue > 120) & (green < 125)
    rgba[magenta, 3] = 0

    # Identify dark navy pixels. The large outer navy panel and the small internal
    # checkmark use similar colors, so remove only the component connected to an
    # interior background seed; the checkmark remains isolated and is preserved.
    brightness = (red + green + blue) / 3
    dark_navy = (rgba[:, :, 3] > 0) & (brightness < 155) & (blue > red + 8) & (blue > green + 8)

    # Start safely inside the left side of the outer panel, away from the centered logo.
    seed = (height // 2, width // 10)
    if not dark_navy[seed]:
        seed = None
        for y in range(int(height * 0.22), int(height * 0.78)):
            for x in range(int(width * 0.08), int(width * 0.27)):
                if dark_navy[y, x]:
                    seed = (y, x)
                    break
            if seed:
                break

    if seed:
        flood_remove(dark_navy, rgba, seed)

    cleaned = Image.fromarray(rgba, mode="RGBA")
    bbox = cleaned.getbbox()
    if bbox:
        cleaned = cleaned.crop(bbox)

    canvas_size = max(cleaned.size)
    square = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    square.alpha_composite(cleaned, ((canvas_size - cleaned.width) // 2, (canvas_size - cleaned.height) // 2))
    square.save(output_path, "PNG")
    return square


def generate_sizes(image, output_dir):
    for size in (16, 32, 64, 192, 512):
        padding = int(size * 0.20)
        inner_size = size - padding * 2
        inner = image.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.alpha_composite(inner, (padding, padding))

        if size == 16:
            icon.save(os.path.join(output_dir, "favicon-16x16.png"))
        elif size == 32:
            icon.save(os.path.join(output_dir, "favicon-32x32.png"))
            icon.save(os.path.join(output_dir, "favicon.ico"), format="ICO")
        elif size == 192:
            icon.save(os.path.join(output_dir, "logo192.png"))
            icon.save(os.path.join(output_dir, "android-chrome-192x192.png"))
        elif size == 512:
            icon.save(os.path.join(output_dir, "logo512.png"))
            icon.save(os.path.join(output_dir, "android-chrome-512x512.png"))
            icon.save(os.path.join(output_dir, "apple-touch-icon.png"))


if __name__ == "__main__":
    os.makedirs(PUBLIC, exist_ok=True)
    logo = Image.open(SOURCE).convert("RGBA")
    generate_sizes(logo, PUBLIC)
    print("Icon set generated from the clean transparent logo.")
