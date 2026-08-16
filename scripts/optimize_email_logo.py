from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/Blue-Water-Shopping-Village-1')
src = root / 'public/manual-assets/reliable-logo.png'
out = root / 'public/manual-assets/reliable-email-logo.png'

with Image.open(src) as image:
    image = image.convert('RGBA')
    image.thumbnail((320, 320), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (320, 320), (255, 255, 255, 0))
    x = (320 - image.width) // 2
    y = (320 - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    canvas.save(out, format='PNG', optimize=True, compress_level=9)

print(f'created {out} ({out.stat().st_size} bytes)')
