/* Renders Facebook marketing HTML/SVG assets to PNG + JPG. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SRC_FB = path.join(ROOT, 'marketing', 'social', 'facebook');
const SRC_LOGOS = path.join(ROOT, 'marketing', 'logos');
const OUT_FB = path.join(ROOT, 'marketing', 'png', 'facebook');
const OUT_PROFILE = path.join(ROOT, 'marketing', 'png', 'profile');

fs.mkdirSync(OUT_FB, { recursive: true });
fs.mkdirSync(OUT_PROFILE, { recursive: true });

function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

const SCALE = 3; // 3x device pixel ratio for retina-quality rasters

function renderHtml(htmlPath, outPng, width, height) {
  // Chrome headless needs a temporary user-data-dir to avoid conflicts
  const userDataDir = path.join(require('os').tmpdir(), 'ac-chrome-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--force-device-scale-factor=${SCALE}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--screenshot=${outPng}`,
    '--virtual-time-budget=6000',
    fileUrl(htmlPath),
  ];
  execFileSync(CHROME, args, { stdio: 'pipe' });
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

async function pngToJpg(pngPath, jpgPath, bg = '#0a0a0a') {
  await sharp(pngPath).flatten({ background: bg }).jpeg({ quality: 92, mozjpeg: true }).toFile(jpgPath);
}

async function svgToPng(svgPath, outPng, size) {
  const svg = fs.readFileSync(svgPath);
  // Render SVG at ~2x the target size directly (libvips downsamples via density) — crisp without huge intermediates
  // SVG viewBox is typically 100-200; density 72 = 1x. We want intermediate ≈ size * 2.
  // Peek viewBox width to compute density.
  const viewBoxMatch = svg.toString('utf8').match(/viewBox=['"]\s*\d+\s+\d+\s+(\d+)/);
  const viewBoxW = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 200;
  const targetPx = Math.min(size * 2, 6000);
  const density = Math.max(144, Math.round((targetPx / viewBoxW) * 72));
  await sharp(svg, { density })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .png({ compressionLevel: 9 })
    .toFile(outPng);
}

async function main() {
  // 1) Facebook HTML -> PNG + JPG
  const files = fs.readdirSync(SRC_FB).filter(f => f.endsWith('.html'));
  for (const f of files) {
    const base = path.basename(f, '.html');
    const isCover = base === 'fb-cover';
    const w = isCover ? 820 : 1200;
    const h = isCover ? 312 : 630;
    const src = path.join(SRC_FB, f);
    const outPng = path.join(OUT_FB, `${base}.png`);
    const outJpg = path.join(OUT_FB, `${base}.jpg`);
    const outW = w * SCALE;
    const outH = h * SCALE;
    process.stdout.write(`Rendering ${f} @ ${outW}x${outH} (${SCALE}x)... `);
    renderHtml(src, outPng, w, h);
    // Chrome outputs at window_size * scale; crop to exact retina dims and ensure sharp JPG encoder
    await sharp(outPng).extract({ left: 0, top: 0, width: outW, height: outH }).toFile(outPng + '.tmp.png');
    fs.renameSync(outPng + '.tmp.png', outPng);
    await sharp(outPng)
      .flatten({ background: '#0a0a0a' })
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(outJpg);
    console.log('done');
  }

  // 2) Logos -> Profile PNGs at multiple sizes
  const profileLogos = [
    'logo-badge-red.svg',
    'logo-badge-dark.svg',
    'logo-badge-light.svg',
    'logo-icon-red.svg',
    'logo-icon-dark.svg',
    'logo-icon-light.svg',
    'logo-monogram-red.svg',
    'logo-monogram-dark.svg',
    'logo-monogram-light.svg',
  ];
  const sizes = [320, 500, 1000, 2000, 4000];
  for (const logo of profileLogos) {
    const src = path.join(SRC_LOGOS, logo);
    if (!fs.existsSync(src)) continue;
    const base = path.basename(logo, '.svg');
    for (const s of sizes) {
      const outPng = path.join(OUT_PROFILE, `${base}-${s}.png`);
      await svgToPng(src, outPng, s);
    }
    // 2000px JPG variant with contrasting bg (red shapes need dark bg, not red)
    const pngSrc = path.join(OUT_PROFILE, `${base}-2000.png`);
    const jpgOut = path.join(OUT_PROFILE, `${base}-2000.jpg`);
    // badge variants already have baked-in bg; icon/monogram red variants have transparent so pair with black
    const isBadge = base.includes('badge');
    const bg = isBadge
      ? (base.includes('light') ? '#ffffff' : base.includes('red') ? '#ff3d00' : '#0a0a0a')
      : (base.includes('light') ? '#ffffff' : '#0a0a0a');
    await sharp(pngSrc)
      .flatten({ background: bg })
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(jpgOut);
  }

  console.log('\nAll Facebook assets rendered.');
  console.log('Output:');
  console.log('  ' + OUT_FB);
  console.log('  ' + OUT_PROFILE);
}

main().catch(err => { console.error(err); process.exit(1); });
