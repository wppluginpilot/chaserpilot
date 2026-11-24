"""Builds the 1600x900 listing screenshots from real admin captures.  python brand/listing/make_slides.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
FONTS = HERE.parent / "fonts"
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
INK, INDIGO, MUTED, MIST = (30, 27, 75), (79, 70, 229), (82, 90, 128), (238, 242, 255)


def font(weight, size):
    for p in (FONTS / f"inter-latin-{weight}-normal.woff", Path("C:/Windows/Fonts/segoeui.ttf")):
        try:
            return ImageFont.truetype(str(p), size)
        except OSError:
            pass
    raise SystemExit("font")


def wrap(d, text, f, width):
    out, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if d.textlength(t, font=f) <= width:
            line = t
        else:
            out.append(line)
            line = w
    return out + [line]


# (file, crop box in the 1568x705 capture, title, caption)
SLIDES = [
    ("1-queue", "queue.jpg", (440, 60, 1300, 600), "One queue for every follow-up", "Overdue, Today, This week and Later, with assignee and tag filters. Done and Snooze are one click."),
    ("2-order-page", "order-block.jpg", (400, 40, 1060, 652), "Follow-ups on the order page", "Add the Follow-ups block from + Block. Each order shows what you still owe the customer."),
    ("3-customer-page", "customer-block.jpg", (400, 60, 1060, 500), "And on the customer page", "Follow up on a person, not only an order. Recently done items stay visible."),
    ("4-add-follow-up", "order-modal.jpg", (520, 90, 1050, 620), "Add a follow-up in seconds", "Title, due date, notes, tags and an assignee. Start from a template if you have one."),
    ("5-templates", "templates.jpg", (440, 60, 1300, 236), "Reusable templates", "Chase deposit, check delivery, ask for a review: set them up once and reuse them."),
    ("6-plan", "plan-free.jpg", (440, 60, 1300, 440), "Free to start, Paid when you grow", "Free covers up to 25 open follow-ups. Paid adds assignees, recurring follow-ups, templates and CSV export."),
]


def build(name, src, box, title, cap):
    W, H = 1600, 900
    img = Image.new("RGB", (W, H), MIST)
    d = ImageDraw.Draw(img)
    # soft indigo band on the left
    d.rectangle([0, 0, 8, H], fill=INDIGO)
    shot = Image.open(HERE / "captures" / src).convert("RGB").crop(box)
    maxw, maxh = 900, 740
    s = min(maxw / shot.width, maxh / shot.height)
    shot = shot.resize((round(shot.width * s), round(shot.height * s)), Image.LANCZOS)
    x = W - 70 - shot.width
    y = (H - shot.height) // 2
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x, y + 12, x + shot.width, y + shot.height + 12], 18, fill=(30, 27, 75, 70))
    img.paste(shadow.filter(ImageFilter.GaussianBlur(22)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(22)))
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width, shot.height], 16, fill=255)
    img.paste(shot, (x, y), mask)
    ImageDraw.Draw(img).rounded_rectangle([x, y, x + shot.width, y + shot.height], 16, outline=(210, 216, 240), width=2)
    d = ImageDraw.Draw(img)
    mark = Image.open(HERE.parent / "out" / "mark-1024.png").convert("RGBA").resize((64, 64), Image.LANCZOS)
    img.paste(mark, (80, 90), mark)
    d.text((158, 104), "ChaserPilot", font=font(600, 32), fill=INK)
    tw = x - 80 - 70
    ty = 320
    for line in wrap(d, title, font(600, 52), tw):
        d.text((80, ty), line, font=font(600, 52), fill=INK)
        ty += 66
    ty += 14
    for line in wrap(d, cap, font(400, 27), tw):
        d.text((80, ty), line, font=font(400, 27), fill=MUTED)
        ty += 38
    img.save(OUT / f"{name}.png")
    print(name, img.size)


for s in SLIDES:
    build(*s)
