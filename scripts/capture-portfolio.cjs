/* Capture portfolio screenshots of live projects. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'portfolio');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { slug: 'reachpilot', url: 'https://www.reachpilot.com.au' },
  { slug: 'saasvalidatr', url: 'https://saasvalidatr.com' },
  { slug: 'plantplanner', url: 'https://plantplanner.com.au' },
  { slug: 'aimarketwire', url: 'https://aimarketwire.ai' },
  { slug: 'printforge', url: 'https://printforge.com.au' },
];

function screenshot(url, outPng, w, h) {
  const userDataDir = path.join(os.tmpdir(), 'ac-chrome-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${w},${h}`,
    `--screenshot=${outPng}`,
    '--virtual-time-budget=8000',
    url,
  ];
  execFileSync(CHROME, args, { stdio: 'pipe' });
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

async function main() {
  const W = 1440;
  const H = 900;
  for (const { slug, url } of SHOTS) {
    const raw = path.join(OUT, `${slug}-raw.png`);
    const finalPng = path.join(OUT, `${slug}.png`);
    const finalWebp = path.join(OUT, `${slug}.webp`);
    const finalJpg = path.join(OUT, `${slug}.jpg`);
    process.stdout.write(`Capturing ${url} ... `);
    try {
      screenshot(url, raw, W, H);
      // 2x scale so crop to exact retina dims first, then downsample + encode
      await sharp(raw)
        .extract({ left: 0, top: 0, width: W * 2, height: H * 2 })
        .resize(W * 2, H * 2, { kernel: 'lanczos3' })
        .png({ compressionLevel: 9 })
        .toFile(finalPng);
      await sharp(finalPng)
        .resize(1600, null, { kernel: 'lanczos3' })
        .webp({ quality: 86 })
        .toFile(finalWebp);
      await sharp(finalPng)
        .resize(1600, null, { kernel: 'lanczos3' })
        .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toFile(finalJpg);
      fs.unlinkSync(raw);
      console.log('OK');
    } catch (e) {
      console.log('FAIL:', e.message);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
