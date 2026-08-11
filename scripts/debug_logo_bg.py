from PIL import Image
import numpy as np

source = '/home/ubuntu/upload/p1b3rlyiAQHbhgc6JjrDOv_1785519971774_na1fn_L2hvbWUvdWJ1bnR1L2xvZ29fY29uY2VwdF8y.webp'
output = '/home/ubuntu/reliable-project/public/logo-transparent.png'

for path in (source, output):
    image = Image.open(path).convert('RGBA')
    data = np.array(image)
    rgb = data[:, :, :3].astype(np.float32)
    alpha = data[:, :, 3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0)
    colors, counts = np.unique(border.astype(np.uint8), axis=0, return_counts=True)
    top = colors[np.argsort(counts)[-12:][::-1]]
    print(path)
    print('size', image.size, 'alpha min/max', int(alpha.min()), int(alpha.max()), 'transparent', int((alpha == 0).sum()), 'opaque', int((alpha == 255).sum()))
    print('top edge colors', [(tuple(map(int, c)), int(counts[(colors == c).all(axis=1)][0])) for c in top])
    for point in ((0,0), (0, image.width//2), (image.height//2,0), (image.height//2,image.width//2), (image.height-1,image.width//2)):
        y, x = point
        print('pixel', point, tuple(map(int, data[y,x])))
