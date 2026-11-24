"""Builds the review screencast (1920x1080 MP4, captions only) from admin captures.
python brand/listing/screencast/build.py"""
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
BUILD = HERE / "build"
CAP = HERE.parent / "captures"
FONTS = HERE.parent.parent / "fonts"
FFMPEG = "G:/ffmpeg-8.0.1-essentials_build/bin/ffmpeg"
W, H = 1920, 1080
MIST, INK, INDIGO, MUTED = (238, 242, 255), (30, 27, 75), (79, 70, 229), (82, 90, 128)


def font(weight, size):
    return ImageFont.truetype(str(FONTS / f"inter-latin-{weight}-normal.woff"), size)


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


def card(path, title, sub):
    img = Image.new("RGB", (W, H), MIST)
    d = ImageDraw.Draw(img)
    mark = Image.open(HERE.parent.parent / "out" / "mark-1024.png").convert("RGBA").resize((220, 220), Image.LANCZOS)
    img.paste(mark, ((W - 220) // 2, 250), mark)
    tw = d.textlength(title, font=font(600, 84))
    d.text(((W - tw) / 2, 520), title, font=font(600, 84), fill=INK)
    for i, line in enumerate(sub.split("\n")):
        sw = d.textlength(line, font=font(400, 38))
        d.text(((W - sw) / 2, 640 + i * 54), line, font=font(400, 38), fill=MUTED)
    img.save(path)


def still(path, shot, box, step, text):
    img = Image.new("RGB", (W, H), MIST)
    d = ImageDraw.Draw(img)
    src = Image.open(CAP / shot).convert("RGB").crop(box)
    s = min(1500 / src.width, 780 / src.height)
    src = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    x, y = (W - src.width) // 2, 40
    d.rectangle([x - 3, y - 3, x + src.width + 3, y + src.height + 3], fill=(205, 211, 238))
    img.paste(src, (x, y))
    cy = max(y + src.height + 36, 860)
    d.text((120, cy), step.upper(), font=font(600, 24), fill=INDIGO)
    for i, line in enumerate(wrap(d, text, font(400, 36), 1680)):
        d.text((120, cy + 40 + i * 48), line, font=font(400, 36), fill=INK)
    img.save(path)


FRAMES = [
    ("card", "ChaserPilot", "Follow-up tasks for Shopify orders and customers\nA walkthrough of the app in Shopify admin", 4),
    ("queue-free.jpg", (440, 60, 1300, 600), "1. Open the app", "ChaserPilot opens in Shopify admin and starts on the Free plan. It works on a new store with no setup.", 6),
    ("plan-free.jpg", (440, 60, 1300, 440), "2. Choose a plan", "The Plan page shows Free (up to 25 open follow-ups) and Paid. Billing goes through Shopify.", 6),
    ("customer-modal-empty.jpg", (520, 90, 1050, 620), "3. Add a follow-up from a customer", "On a customer page, add the Follow-ups block from + Block, then choose Add follow-up.", 6),
    ("customer-block.jpg", (400, 60, 1060, 500), "3. Add a follow-up from a customer", "The follow-up is listed on the customer page, with Done and Snooze.", 6),
    ("order-modal.jpg", (520, 90, 1050, 620), "4. Add a follow-up from an order", "Open an order and choose Add follow-up in the Follow-ups block: title, due date, notes, tags, assignee.", 6),
    ("order-block.jpg", (400, 40, 1060, 652), "4. Add a follow-up from an order", "Each order lists its own follow-ups. Mark one Done or Snooze it right here.", 6),
    ("queue.jpg", (440, 60, 1300, 600), "5. Work the queue", "All follow-ups in one list: Overdue, Today, This week, Later and Done, with filters.", 7),
    ("today.jpg", (440, 60, 1300, 260), "6. Today view", "The Today view lists what is due today. Daily email is optional and part of the Paid plan.", 6),
    ("templates.jpg", (440, 60, 1300, 280), "7. Templates (Paid plan)", "Save the follow-ups you repeat, like Chase deposit or Ask for a review.", 6),
    ("settings.jpg", (470, 60, 1265, 465), "8. Settings", "Set the timezone and the default due date, and turn the optional digest email on or off.", 6),
    ("card", "Thank you", "ChaserPilot: add a follow-up to any order or customer\nand work one due-today list", 4),
]

segs = []
for i, f in enumerate(FRAMES):
    png = BUILD / f"f{i:02d}.png"
    if f[0] == "card":
        card(png, f[1], f[2])
        dur = f[3]
    else:
        still(png, f[0], f[1], f[2], f[3])
        dur = f[4]
    seg = BUILD / f"s{i:02d}.mp4"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-loop", "1", "-t", str(dur), "-i", str(png), "-vf",
                    f"fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.4}:d=0.4,format=yuv420p", "-c:v", "libx264", "-crf", "20", str(seg)], check=True)
    segs.append(seg)
lst = BUILD / "list.txt"
lst.write_text("".join(f"file '{s.as_posix()}'\n" for s in segs))
out = BUILD / "chaserpilot-screencast.mp4"
subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)], check=True)
print(out)
