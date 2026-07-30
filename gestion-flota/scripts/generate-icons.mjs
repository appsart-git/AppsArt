import sharp from "sharp";
import { mkdirSync } from "fs";

const carDark = `
  <g fill="#1A1305">
    <path d="M120 300 h272 a20 20 0 0 1 20 20 v40 a16 16 0 0 1 -16 16 h-24 a36 36 0 0 1 -72 0 h-88 a36 36 0 0 1 -72 0 h-24 a16 16 0 0 1 -16 -16 v-40 a20 20 0 0 1 20 -20 z"/>
    <path d="M150 300 l30 -70 a20 20 0 0 1 18 -12 h116 a20 20 0 0 1 18 12 l30 70 z"/>
    <circle cx="184" cy="356" r="26" fill="#E8A33D"/>
    <circle cx="328" cy="356" r="26" fill="#E8A33D"/>
  </g>
`;

const roundedSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512">
      <stop offset="0" stop-color="#E8A33D"/>
      <stop offset="1" stop-color="#C97F1E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#g)"/>
  ${carDark}
</svg>
`;

const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="512" y2="512">
      <stop offset="0" stop-color="#E8A33D"/>
      <stop offset="1" stop-color="#C97F1E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g2)"/>
  <g transform="translate(76 76) scale(0.7)">
    ${carDark}
  </g>
</svg>
`;

mkdirSync("public/icons", { recursive: true });

async function run() {
  await sharp(Buffer.from(roundedSvg)).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(Buffer.from(roundedSvg)).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");
  await sharp(Buffer.from(roundedSvg)).resize(512, 512).png().toFile("app/icon.png");
  await sharp(Buffer.from(roundedSvg)).resize(180, 180).png().toFile("app/apple-icon.png");
  console.log("Íconos generados.");
}

run();
