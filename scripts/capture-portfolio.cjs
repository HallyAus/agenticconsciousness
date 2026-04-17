/*
 * Capture portfolio screenshots of live projects.
 *
 * Uses puppeteer-core + system Chrome so we can:
 *   - emulate `prefers-reduced-motion: reduce`
 *   - inject CSS to neutralise animations and transitions
 *   - wait for network idle before firing the shot
 *   - scroll the page, then scroll back, to force lazy/in-view elements
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
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
  { slug: 'printforge', url: 'https://www.printforge.com.au' },
  { slug: 'printforge-crm', url: 'https://crm.printforge.com.au' },
  { slug: 'sellmyownhome', url: 'https://sellmyownhome.ai' },
  { slug: 'flatwhiteindex', url: 'https://flatwhiteindex.com.au' },
];

const W = 1440;
const H = 900;

const KILL_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
  html { scroll-behavior: auto !important; }
  [data-framer-motion-proxy], [data-aos], .motion-safe\\:animate-spin { animation: none !important; }
`;

async function capture(browser, slug, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  // Kill animations as early as possible so reveal-on-scroll libs see final state.
  await page.evaluateOnNewDocument((css) => {
    const style = document.createElement('style');
    style.setAttribute('data-capture-override', 'true');
    style.textContent = css;
    const insert = () => {
      if (document.documentElement) document.documentElement.appendChild(style);
      else requestAnimationFrame(insert);
    };
    insert();
  }, KILL_MOTION_CSS);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

  // Scroll the full height to trigger IntersectionObserver-driven reveals, then snap back.
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const step = Math.max(300, Math.floor(window.innerHeight * 0.9));
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await wait(120);
    }
    window.scrollTo(0, 0);
    await wait(300);
  });

  // Re-inject in case SPA navigation wiped the style tag.
  await page.addStyleTag({ content: KILL_MOTION_CSS });

  // Final settle before shot — fonts, hero video posters, late DOM mutations.
  await page.evaluate(() => (document.fonts && document.fonts.ready) || Promise.resolve());
  await new Promise((r) => setTimeout(r, 1500));

  const rawPath = path.join(OUT, `${slug}-raw.png`);
  await page.screenshot({ path: rawPath, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
  return rawPath;
}

async function encode(slug, rawPath) {
  const finalPng = path.join(OUT, `${slug}.png`);
  const finalWebp = path.join(OUT, `${slug}.webp`);
  const finalJpg = path.join(OUT, `${slug}.jpg`);

  await sharp(rawPath).png({ compressionLevel: 9 }).toFile(finalPng);
  await sharp(finalPng)
    .resize(1600, null, { kernel: 'lanczos3' })
    .webp({ quality: 86 })
    .toFile(finalWebp);
  await sharp(finalPng)
    .resize(1600, null, { kernel: 'lanczos3' })
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(finalJpg);
  fs.unlinkSync(rawPath);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: null,
    args: ['--hide-scrollbars', '--disable-gpu', '--no-sandbox'],
  });

  try {
    for (const { slug, url } of SHOTS) {
      process.stdout.write(`Capturing ${url} ... `);
      try {
        const raw = await capture(browser, slug, url);
        await encode(slug, raw);
        console.log('OK');
      } catch (e) {
        console.log('FAIL:', e.message);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
