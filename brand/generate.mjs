/**
 * ChaserPilot brand assets — single source of truth.
 *
 * Run:  BRAND_TOOLS=<dir containing node_modules with @resvg/resvg-js and opentype.js>/ node brand/generate.mjs
 *
 * Writes the SVG marks, logos and favicons into public/, and the PNG exports
 * (Shopify app icon 1200×1200, logo PNGs, social card) into brand/out/.
 * Wordmarks are real outlines (Inter SemiBold, OFL) so the logos look the
 * same with or without the font installed.
 *
 * The mark is a task card: one follow-up done (check), two still open, and an amber
 * due-clock badge on the corner. Palette: indigo and amber.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(process.env.BRAND_TOOLS ?? import.meta.url);
const { Resvg } = require("@resvg/resvg-js");
const opentype = require("opentype.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pub = path.join(root, "public");
const out = path.join(here, "out");
mkdirSync(path.join(pub, "brand"), { recursive: true });
mkdirSync(out, { recursive: true });

export const COLORS = {
  teal: "#4F46E5", // primary (indigo)
  aqua: "#818CF8", // light end of gradients
  deep: "#312E81", // deep end, hover
  ink: "#1E1B4B", // text on light
  amber: "#F59E0B", // accent: the due clock
  sand: "#FEF3C7",
  mist: "#EEF2FF",
};

const tealGradient = (id, x1, y1, x2, y2) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${COLORS.aqua}"/><stop offset=".55" stop-color="${COLORS.teal}"/><stop offset="1" stop-color="${COLORS.deep}"/>
  </linearGradient>`;

/** The tiles and the dimension line, in a 64×64 box, for a dark (teal) background. */
function markInner({ tile = "#FFFFFF", line = "#FFFFFF", accent = COLORS.amber, dark = false } = {}) {
  const ink = dark ? tile : COLORS.teal; // elements drawn on the card
  const card = dark ? "#FFFFFF" : "#E0E7FF";
  return [
    `<rect x="12" y="8" width="38" height="46" rx="7" fill="${card}" opacity="${dark ? 0.97 : 1}"/>`,
    // Row 1: done
    `<circle cx="22.5" cy="20" r="4.6" fill="${dark ? COLORS.teal : COLORS.teal}"/><path d="M20.2 20.1l1.7 1.7 3-3.4" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    `<rect x="31" y="18.3" width="13" height="3.4" rx="1.7" fill="${COLORS.aqua}"/>`,
    // Row 2 and 3: open
    `<circle cx="22.5" cy="32" r="4.1" fill="none" stroke="${COLORS.teal}" stroke-width="1.8"/>`,
    `<rect x="31" y="30.3" width="13" height="3.4" rx="1.7" fill="${COLORS.teal}" opacity=".55"/>`,
    `<circle cx="22.5" cy="44" r="4.1" fill="none" stroke="${COLORS.teal}" stroke-width="1.8"/>`,
    `<rect x="31" y="42.3" width="9" height="3.4" rx="1.7" fill="${COLORS.teal}" opacity=".55"/>`,
    // Due clock badge
    `<circle cx="47" cy="47" r="12" fill="${accent}" stroke="${dark ? COLORS.deep : "#FFFFFF"}" stroke-width="2.4"/>`,
    `<path d="M47 40.5V47l4.4 2.6" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  ].join("");
}

/** App tile: rounded square. */
export function tile(size = 64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>${tealGradient("ap-g", 6, 2, 58, 62)}</defs>
  <rect width="64" height="64" rx="15" fill="url(#ap-g)"/>
  ${markInner({ dark: true })}
</svg>`;
}

/** Full-bleed for the Shopify app icon (Shopify applies its own rounding). */
function appIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 64 64">
  <defs>${tealGradient("ap-g", 0, 0, 64, 64)}</defs>
  <rect width="64" height="64" fill="url(#ap-g)"/>
  <g transform="translate(32 33) scale(1.1) translate(-32 -33)">${markInner({ dark: true })}</g>
</svg>`;
}

/** Just the mark, for light backgrounds. */
function bareMark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="8 4 52 60">
  ${markInner({ dark: false })}
</svg>`;
}

// ── Wordmark (outlined) ───────────────────────────────────────────────────

const inter = opentype.parse(readFileSync(path.join(here, "fonts/inter-latin-600-normal.woff")).buffer);
const interRegular = opentype.parse(readFileSync(path.join(here, "fonts/inter-latin-400-normal.woff")).buffer);

function pathData(commands) {
  const f = (n) => +n.toFixed(2);
  let px = 0, py = 0;
  return commands
    .map((c) => {
      let o;
      if (c.type === "Q") {
        const x1 = Number.isFinite(c.x1) ? c.x1 : (px + c.x) / 2;
        const y1 = Number.isFinite(c.y1) ? c.y1 : (py + c.y) / 2;
        o = `Q${f(x1)} ${f(y1)} ${f(c.x)} ${f(c.y)}`;
      } else if (c.type === "C") o = `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
      else if (c.type === "Z") return "Z";
      else o = `${c.type}${f(c.x)} ${f(c.y)}`;
      px = c.x;
      py = c.y;
      return o;
    })
    .join("");
}

function textRun(font, text, x, y, size, tracking = -0.02) {
  let cursor = x;
  const parts = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    parts.push(pathData(glyph.getPath(cursor, y, size).commands));
    cursor += (glyph.advanceWidth / font.unitsPerEm) * size + tracking * size;
  }
  return { d: parts.join(""), end: cursor };
}

function wordmark(size, x, y) {
  const a = textRun(inter, "Chaser", x, y, size);
  const b = textRun(inter, "Pilot", a.end, y, size);
  return { area: a.d, pilot: b.d, width: b.end - x };
}

function logo({ onDark = false } = {}) {
  const text = onDark ? "#FFFFFF" : COLORS.ink;
  const accent = onDark ? COLORS.aqua : COLORS.teal;
  const w = wordmark(27, 56, 33.5);
  const width = Math.ceil(56 + w.width + 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48" viewBox="0 0 ${width} 48" role="img" aria-label="ChaserPilot">
  <title>ChaserPilot</title>
  <g transform="scale(.75)">${tile().replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
  <path fill="${text}" d="${w.area}"/><path fill="${accent}" d="${w.pilot}"/>
</svg>`;
}

function stackedLogo({ onDark = false } = {}) {
  const text = onDark ? "#FFFFFF" : COLORS.ink;
  const accent = onDark ? COLORS.aqua : COLORS.teal;
  const probe = wordmark(32, 0, 0);
  const width = Math.ceil(Math.max(probe.width, 96) + 16);
  const w = wordmark(32, (width - probe.width) / 2, 134);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="148" viewBox="0 0 ${width} 148" role="img" aria-label="ChaserPilot">
  <title>ChaserPilot</title>
  <g transform="translate(${(width - 96) / 2} 0) scale(1.5)">${tile().replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
  <path fill="${text}" d="${w.area}"/><path fill="${accent}" d="${w.pilot}"/>
</svg>`;
}

/** Social card 1200×630 for og:image. */
function ogCard() {
  const w = wordmark(92, 330, 300);
  const line = textRun(interRegular, "Follow up on every order.", 330, 390, 44, -0.01);
  const sub = textRun(interRegular, "Follow-up tasks for Shopify orders and customers", 330, 452, 30, -0.005);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>${tealGradient("og-g", 0, 0, 1200, 630)}</defs>
  <rect width="1200" height="630" fill="${COLORS.mist}"/>
  <rect x="0" y="560" width="1200" height="70" fill="url(#og-g)"/>
  <g transform="translate(90 170) scale(3.4)">${tile().replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
  <path fill="${COLORS.ink}" d="${w.area}"/><path fill="${COLORS.teal}" d="${w.pilot}"/>
  <path fill="${COLORS.ink}" d="${line.d}"/>
  <path fill="#4F6670" d="${sub.d}"/>
</svg>`;
}

// ── Output ────────────────────────────────────────────────────────────────

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

/** ICO container holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const files = {
  "public/favicon.svg": tile(),
  "public/brand/mark.svg": tile(),
  "public/brand/mark-bare.svg": bareMark(),
  "public/brand/logo.svg": logo(),
  "public/brand/logo-on-dark.svg": logo({ onDark: true }),
  "public/brand/logo-stacked.svg": stackedLogo(),
  "public/brand/logo-stacked-on-dark.svg": stackedLogo({ onDark: true }),
};
for (const [file, svg] of Object.entries(files)) writeFileSync(path.join(root, file), svg);

writeFileSync(path.join(pub, "favicon.ico"), ico([16, 32, 48].map((size) => ({ size, data: png(tile(), size) }))));
writeFileSync(path.join(pub, "apple-touch-icon.png"), png(appIcon(), 180));
writeFileSync(path.join(pub, "icon-512.png"), png(appIcon(), 512));
writeFileSync(path.join(pub, "og.png"), png(ogCard(), 1200));
writeFileSync(path.join(out, "app-icon-1200.png"), png(appIcon(), 1200));
writeFileSync(path.join(out, "mark-1024.png"), png(tile(), 1024));
writeFileSync(path.join(out, "logo-2000.png"), png(logo(), 2000));
writeFileSync(path.join(out, "logo-on-dark-2000.png"), png(logo({ onDark: true }), 2000));
writeFileSync(path.join(out, "logo-stacked-1200.png"), png(stackedLogo(), 1200));
writeFileSync(path.join(out, "og-1200x630.png"), png(ogCard(), 1200));
console.log("brand assets written");
