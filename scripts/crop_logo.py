from PIL import Image
import numpy as np

def crop_to_logo():
    img = Image.open('/home/ubuntu/reliable-project/public/logo-master.webp').convert('RGBA')
    data = np.array(img)
    
    # The logo background is a dark blue. The outer background is magenta (244, 6, 239).
    # We'll find the bounding box of non-magenta pixels.
    # Magenta is roughly [244, 6, 239]
    mask = ~((data[:,:,0] > 200) & (data[:,:,1] < 50) & (data[:,:,2] > 200))
    
    coords = np.argwhere(mask)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0) + 1
    
    # Crop to the bounding box
    cropped = img.crop((x0, y0, x1, y1))
    
    # Save as the new master logo
    cropped.save('/home/ubuntu/reliable-project/public/logo-square.png')
    print(f"Cropped logo saved to logo-square.png. Size: {cropped.size}")
    
    # Get the background color of the blue square (center-left area)
    bg_pixel = cropped.getpixel((10, 10))
    print(f"Background color: {bg_pixel}")

if __name__ == "__main__":
    crop_to_logo()
