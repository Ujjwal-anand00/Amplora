import math
import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"c:\Users\acer\OneDrive\Desktop\Campaign\apps\mobile\assets\images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand colors
PRIMARY_BLUE = (37, 99, 235)     # #2563EB
PRIMARY_LIGHT = (59, 130, 246)   # #3B82F6
ACCENT_BLUE = (96, 165, 250)     # #60A5FA
PALE_BLUE = (191, 219, 254)      # #BFDBFE
DEEP_NAVY = (23, 43, 77)         # #172B4D
DARK_BG = (15, 23, 42)           # #0F172A
WHITE = (255, 255, 255)
OFF_WHITE = (247, 249, 252)      # #F7F9FC
TEXT_SECONDARY = (100, 116, 139) # #64748B

def draw_amplora_symbol(draw, center_x, center_y, scale, is_white=False):
    """
    Draws the Amplora amplification beacon and expanding ripple waves.
    center_x, center_y: center of the beacon core
    scale: multiplier where base core radius is 10 * scale
    """
    col_core = WHITE if is_white else PRIMARY_BLUE
    col_wave1 = (220, 235, 255) if is_white else PRIMARY_BLUE
    col_wave2 = (180, 210, 255) if is_white else PRIMARY_LIGHT
    col_wave3 = (140, 185, 255) if is_white else ACCENT_BLUE
    col_echo = (120, 165, 245) if is_white else PALE_BLUE

    # Central Core Beacon (Filled Circle)
    core_r = 14 * scale
    draw.ellipse(
        [center_x - core_r, center_y - core_r, center_x + core_r, center_y + core_r],
        fill=col_core
    )

    # Core inner glow highlight
    highlight_r = 5 * scale
    hl_col = WHITE if not is_white else (200, 225, 255)
    draw.ellipse(
        [center_x - 3 * scale - highlight_r, center_y - 3 * scale - highlight_r,
         center_x - 3 * scale + highlight_r, center_y - 3 * scale + highlight_r],
        fill=hl_col
    )

    # Wave 1 (Inner Forward Arc, -55 deg to +55 deg)
    r1 = 36 * scale
    w1 = int(round(9 * scale))
    draw.arc(
        [center_x - r1, center_y - r1, center_x + r1, center_y + r1],
        start=-55, end=55, fill=col_wave1, width=w1
    )

    # Wave 2 (Middle Forward Arc, -58 deg to +58 deg)
    r2 = 64 * scale
    w2 = int(round(10 * scale))
    draw.arc(
        [center_x - r2, center_y - r2, center_x + r2, center_y + r2],
        start=-58, end=58, fill=col_wave2, width=w2
    )

    # Wave 3 (Outer Forward Arc, -60 deg to +60 deg)
    r3 = 94 * scale
    w3 = int(round(11 * scale))
    draw.arc(
        [center_x - r3, center_y - r3, center_x + r3, center_y + r3],
        start=-60, end=60, fill=col_wave3, width=w3
    )

    # Wave 4 (Far Ambient Arc, -45 deg to +45 deg)
    r4 = 124 * scale
    w4 = int(round(10 * scale))
    draw.arc(
        [center_x - r4, center_y - r4, center_x + r4, center_y + r4],
        start=-45, end=45, fill=col_echo, width=w4
    )

    # Reverse Echo Arc on Left (-145 deg to -215 deg)
    re1 = 34 * scale
    we1 = int(round(7 * scale))
    draw.arc(
        [center_x - re1, center_y - re1, center_x + re1, center_y + re1],
        start=135, end=225, fill=col_echo, width=we1
    )
    
    re2 = 58 * scale
    we2 = int(round(6 * scale))
    draw.arc(
        [center_x - re2, center_y - re2, center_x + re2, center_y + re2],
        start=145, end=215, fill=col_echo, width=we2
    )

def generate_app_icon():
    """Generates 1024x1024 icon.png with supersampling."""
    size = 1024
    scale_factor = 2
    img_size = size * scale_factor
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Clean rounded squircle background in crisp brand blue with subtle vertical gradient
    for y in range(img_size):
        ratio = y / img_size
        r = int(PRIMARY_BLUE[0] * (1 - ratio * 0.15))
        g = int(PRIMARY_BLUE[1] * (1 - ratio * 0.12))
        b = int(PRIMARY_BLUE[2] * (1 - ratio * 0.08))
        draw.line([(0, y), (img_size, y)], fill=(r, g, b, 255))

    # Center symbol
    center_x = int(img_size * 0.44)
    center_y = int(img_size * 0.50)
    scale = (img_size / 512.0) * 1.55

    draw_amplora_symbol(draw, center_x, center_y, scale, is_white=True)

    # Downsample
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    final_img.save(os.path.join(OUTPUT_DIR, "icon.png"), "PNG")
    print("Generated icon.png")

def generate_android_adaptive_icons():
    """Generates android-icon-foreground.png (432x432) and android-icon-background.png (432x432)."""
    size = 432
    scale_factor = 2
    img_size = size * scale_factor

    # 1. Background (solid clean light background #F7F9FC)
    bg_img = Image.new("RGBA", (size, size), OFF_WHITE + (255,))
    bg_img.save(os.path.join(OUTPUT_DIR, "android-icon-background.png"), "PNG")
    print("Generated android-icon-background.png")

    # 2. Foreground (transparent with centered blue symbol in safe circle 288px)
    fg_img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fg_img)

    center_x = int(img_size * 0.45)
    center_y = int(img_size * 0.50)
    scale = (img_size / 512.0) * 0.95

    draw_amplora_symbol(draw, center_x, center_y, scale, is_white=False)

    final_fg = fg_img.resize((size, size), Image.Resampling.LANCZOS)
    final_fg.save(os.path.join(OUTPUT_DIR, "android-icon-foreground.png"), "PNG")
    print("Generated android-icon-foreground.png")

    # 3. Monochrome icon (pure white on transparent)
    mono_img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw_mono = ImageDraw.Draw(mono_img)
    draw_amplora_symbol(draw_mono, center_x, center_y, scale, is_white=True)
    final_mono = mono_img.resize((size, size), Image.Resampling.LANCZOS)
    final_mono.save(os.path.join(OUTPUT_DIR, "android-icon-monochrome.png"), "PNG")
    print("Generated android-icon-monochrome.png")

def generate_splash_icon():
    """Generates splash-icon.png (1024x1024) with centered symbol and Amplora wordmark."""
    size = 1024
    scale_factor = 2
    img_size = size * scale_factor
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Symbol centered vertically and horizontally
    center_x = int(img_size * 0.45)
    center_y = int(img_size * 0.44)
    scale = (img_size / 512.0) * 1.3

    draw_amplora_symbol(draw, center_x, center_y, scale, is_white=False)

    # Wordmark text "Amplora" below the symbol
    # Try finding standard fonts or draw geometric modern typography
    try:
        font_large = ImageFont.truetype("arialbd.ttf", int(108 * scale_factor))
        font_sub = ImageFont.truetype("arial.ttf", int(36 * scale_factor))
    except Exception:
        font_large = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    wordmark = "Amplora"
    tagline = "Good messages. Greater reach."

    # Center wordmark
    text_bbox = draw.textbbox((0, 0), wordmark, font=font_large)
    text_w = text_bbox[2] - text_bbox[0]
    draw.text(
        ((img_size - text_w) // 2, int(img_size * 0.70)),
        wordmark,
        fill=DEEP_NAVY,
        font=font_large
    )

    # Center tagline
    sub_bbox = draw.textbbox((0, 0), tagline, font=font_sub)
    sub_w = sub_bbox[2] - sub_bbox[0]
    draw.text(
        ((img_size - sub_w) // 2, int(img_size * 0.79)),
        tagline,
        fill=TEXT_SECONDARY,
        font=font_sub
    )

    final_splash = img.resize((size, size), Image.Resampling.LANCZOS)
    final_splash.save(os.path.join(OUTPUT_DIR, "splash-icon.png"), "PNG")
    print("Generated splash-icon.png")

def generate_favicon():
    """Generates favicon.png (48x48)."""
    size = 48
    scale_factor = 4
    img_size = size * scale_factor
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Blue circle base
    draw.ellipse([0, 0, img_size, img_size], fill=PRIMARY_BLUE)

    center_x = int(img_size * 0.44)
    center_y = int(img_size * 0.50)
    scale = (img_size / 512.0) * 1.5

    draw_amplora_symbol(draw, center_x, center_y, scale, is_white=True)

    final_fav = img.resize((size, size), Image.Resampling.LANCZOS)
    final_fav.save(os.path.join(OUTPUT_DIR, "favicon.png"), "PNG")
    print("Generated favicon.png")

def generate_brand_logos():
    """Generates amplora-logo-primary.png and amplora-logo-compact.png."""
    # Primary: 800 x 240
    w, h = 800, 240
    scale_factor = 2
    img = Image.new("RGBA", (w * scale_factor, h * scale_factor), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center_x = int(110 * scale_factor)
    center_y = int(120 * scale_factor)
    scale = 0.9 * scale_factor

    draw_amplora_symbol(draw, center_x, center_y, scale, is_white=False)

    try:
        font_brand = ImageFont.truetype("arialbd.ttf", int(72 * scale_factor))
        font_tag = ImageFont.truetype("arial.ttf", int(22 * scale_factor))
    except Exception:
        font_brand = ImageFont.load_default()
        font_tag = ImageFont.load_default()

    draw.text((int(250 * scale_factor), int(70 * scale_factor)), "Amplora", fill=DEEP_NAVY, font=font_brand)
    draw.text((int(252 * scale_factor), int(152 * scale_factor)), "Good messages. Greater reach.", fill=TEXT_SECONDARY, font=font_tag)

    final_primary = img.resize((w, h), Image.Resampling.LANCZOS)
    final_primary.save(os.path.join(OUTPUT_DIR, "amplora-logo-primary.png"), "PNG")
    print("Generated amplora-logo-primary.png")

    # Compact: 320 x 80
    cw, ch = 320, 80
    c_img = Image.new("RGBA", (cw * scale_factor, ch * scale_factor), (0, 0, 0, 0))
    draw_c = ImageDraw.Draw(c_img)

    c_center_x = int(45 * scale_factor)
    c_center_y = int(40 * scale_factor)
    c_scale = 0.34 * scale_factor

    draw_amplora_symbol(draw_c, c_center_x, c_center_y, c_scale, is_white=False)

    try:
        font_c = ImageFont.truetype("arialbd.ttf", int(36 * scale_factor))
    except Exception:
        font_c = ImageFont.load_default()

    draw_c.text((int(96 * scale_factor), int(21 * scale_factor)), "Amplora", fill=DEEP_NAVY, font=font_c)

    final_compact = c_img.resize((cw, ch), Image.Resampling.LANCZOS)
    final_compact.save(os.path.join(OUTPUT_DIR, "amplora-logo-compact.png"), "PNG")
    print("Generated amplora-logo-compact.png")

if __name__ == "__main__":
    generate_app_icon()
    generate_android_adaptive_icons()
    generate_splash_icon()
    generate_favicon()
    generate_brand_logos()
    print("All Amplora logo assets generated successfully!")
