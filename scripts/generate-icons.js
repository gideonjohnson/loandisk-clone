/**
 * Generate PWA icons from SVG
 * Run: node scripts/generate-icons.js
 * Requires: sharp (npm install sharp --save-dev)
 */

const fs = require('fs');
const path = require('path');

// Simple SVG icon with the "M" logo
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <text x="256" y="360" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="320">M</text>
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <text x="256" y="340" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="280">M</text>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write SVG files as fallback
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.svg'), maskableSvg);

// Try to generate PNGs with sharp
async function generatePNGs() {
  try {
    const sharp = require('sharp');
    const sizes = [192, 384, 512];

    for (const size of sizes) {
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}.png`));
      console.log(`Generated icon-${size}.png`);
    }

    await sharp(Buffer.from(maskableSvg))
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
    console.log('Generated icon-maskable-512.png');
  } catch (e) {
    console.log('sharp not available, using SVG fallback. Run: npm install sharp --save-dev');
    // Copy SVG as PNG filename fallback (browsers handle SVG too)
    for (const size of [192, 384, 512]) {
      fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), Buffer.from(svgIcon));
    }
    fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), Buffer.from(maskableSvg));
  }
}

generatePNGs();
