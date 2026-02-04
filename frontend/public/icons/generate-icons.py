from PIL import Image, ImageDraw
import os

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for size in sizes:
    # Create image with orange background
    img = Image.new('RGB', (size, size), '#ff6b35')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple document icon
    margin = size // 8
    doc_width = size // 2
    doc_height = int(size * 0.6)
    doc_x = margin
    doc_y = margin
    
    # White document background
    draw.rounded_rectangle(
        [doc_x, doc_y, doc_x + doc_width, doc_y + doc_height],
        radius=size//20,
        fill='white'
    )
    
    # Orange lines (text representation)
    line_height = size // 30
    line_margin = size // 15
    for i in range(4):
        line_y = doc_y + line_margin + (i * (line_height + line_margin//2))
        line_width = doc_width - line_margin * 2 - (i * size // 20)
        if line_y + line_height < doc_y + doc_height - line_margin:
            draw.rounded_rectangle(
                [doc_x + line_margin, line_y, doc_x + line_margin + line_width, line_y + line_height],
                radius=line_height//2,
                fill='#ff6b35'
            )
    
    # Green checkmark circle
    circle_size = size // 3
    circle_x = size - margin - circle_size
    circle_y = size - margin - circle_size
    draw.ellipse(
        [circle_x, circle_y, circle_x + circle_size, circle_y + circle_size],
        fill='#22c55e'
    )
    
    # White checkmark
    check_margin = circle_size // 4
    cx = circle_x + circle_size // 2
    cy = circle_y + circle_size // 2
    check_size = circle_size // 4
    
    # Save
    img.save(f'icon-{size}x{size}.png', 'PNG')
    print(f'Created icon-{size}x{size}.png')

print('All icons created!')
