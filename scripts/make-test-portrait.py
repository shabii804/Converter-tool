"""Generate a realistic test portrait for ID photo UI testing."""
from PIL import Image, ImageDraw
import random

W, H = 1200, 1600
img = Image.new("RGB", (W, H), (86, 120, 152))  # blue-gray wall
d = ImageDraw.Draw(img)
# subtle wall gradient
for y in range(H):
    g = 255 - y // 20
    d.line([(0, y), (W, y)], fill=(60 + g // 8, 92 + g // 10, 120 + g // 12))
# shoulders
d.ellipse([W//2-430, H-380, W//2+430, H+400], fill=(44, 62, 84))
# neck
d.rectangle([W//2-95, H-560, W//2+95, H-260], fill=(196, 152, 128))
# head
d.ellipse([W//2-230, 210, W//2+230, 800], fill=(212, 168, 142))
# hair
d.pieslice([W//2-238, 180, W//2+238, 560], 180, 360, fill=(58, 44, 36))
# eyes
for dx in (-95, 95):
    d.ellipse([W//2+dx-42, 470, W//2+dx+42, 510], fill=(245, 245, 242))
    d.ellipse([W//2+dx-16, 478, W//2+dx+16, 506], fill=(38, 60, 88))
# mouth
d.ellipse([W//2-70, 640, W//2+70, 668], fill=(150, 92, 90))
# noise for realism
random.seed(7)
px = img.load()
for _ in range(24000):
    x, y = random.randrange(W), random.randrange(H)
    r, g, b = px[x, y]
    n = random.randint(-14, 14)
    px[x, y] = (max(0, min(255, r+n)), max(0, min(255, g+n)), max(0, min(255, b+n)))

img.save("/home/z/my-project/scripts/test-portrait.jpg", quality=88)
print("saved", img.size)
