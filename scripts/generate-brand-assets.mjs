// Regenerates the app's icons and splash from assets/brand/. Run: node scripts/generate-brand-assets.mjs
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const asset = (name) => join(root, 'assets', name);
const markSvg = await readFile(asset('brand/logo-mark.svg'), 'utf8');
const gradientSvg = await readFile(asset('brand/logo-gradient.svg'));

/** Thin lines vanish at small sizes, so small exports thicken the mark with a stroke in viewBox units. */
function mark(width, stroke = 0) {
  const svg = stroke ? markSvg.replace('<path ', `<path stroke="#FFFFFF" stroke-width="${stroke}" stroke-linejoin="round" `) : markSvg;
  return sharp(Buffer.from(svg)).resize({ width }).png().toBuffer();
}

const transparent = (size) => sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const gradient = (size) => sharp(gradientSvg, { density: 300 }).resize(size, size);

async function onTransparent(file, size, markWidth, stroke) {
  await transparent(size).composite([{ input: await mark(markWidth, stroke) }]).png().toFile(asset(file));
}

async function onGradient(file, size, markWidth, stroke) {
  const flat = await gradient(size).flatten().png().toBuffer();
  await sharp(flat).composite([{ input: await mark(markWidth, stroke) }]).removeAlpha().png().toFile(asset(file));
}

await onGradient('icon.png', 1024, 640);
await gradient(1024).flatten().removeAlpha().png().toFile(asset('android-icon-background.png'));
// Android masks can clip anything outside the center 66% of an adaptive icon.
await onTransparent('android-icon-foreground.png', 1024, 500);
await onTransparent('android-icon-monochrome.png', 1024, 500);
await onTransparent('notification-icon.png', 96, 84, 60);
await onTransparent('splash-icon.png', 1024, 880);
await onGradient('favicon.png', 48, 40, 60);
