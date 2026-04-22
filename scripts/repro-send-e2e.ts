/**
 * End-to-end repro of the /api/admin/prospects/[id]/send PDF-render path,
 * using the updated fetch-image + pdf helpers.
 *
 * Usage: npx tsx scripts/repro-send-e2e.ts
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchAsNormalisedJpeg } from '../src/lib/fetch-image';
import { renderAuditPdf } from '../src/lib/pdf';

const DESKTOP = 'https://api.screenshotone.com/take?access_key=a4f95766af6ffe126d3c&url=http%3A%2F%2Fwww.evolvelectrical.com%2F&viewport_width=1440&viewport_height=900&device_scale_factor=1&image_width=900&format=jpg&image_quality=70&block_ads=true&block_cookie_banners=true&block_trackers=true&cache=true&cache_ttl=2592000&full_page=false&delay=2&timeout=30&signature=308801cdb716fc0869a7bdc3edb8cff2af077875ba5201b12581638222a862c9';
const MOBILE = 'https://api.screenshotone.com/take?access_key=a4f95766af6ffe126d3c&url=http%3A%2F%2Fwww.evolvelectrical.com%2F&viewport_width=393&viewport_height=852&device_scale_factor=1&image_width=400&viewport_mobile=true&format=jpg&image_quality=70&block_ads=true&block_cookie_banners=true&block_trackers=true&cache=true&cache_ttl=2592000&full_page=false&delay=2&timeout=30&signature=d2040bba88d0ca60a8c88952ddf4fa3dfe68cee2b210cff3ce827cd36f92de85';

async function main(): Promise<void> {
  const t0 = Date.now();

  // Exactly what send/route.ts does now.
  const [desktopShot, mobileShot] = await Promise.all([
    fetchAsNormalisedJpeg(DESKTOP, { maxWidth: 900 }).catch(() => null),
    fetchAsNormalisedJpeg(MOBILE, { maxWidth: 400 }).catch(() => null),
  ]);
  const desktopBuf = desktopShot?.data ?? null;
  const mobileBuf = mobileShot?.data ?? null;
  console.log('desktop buf bytes:', desktopBuf?.byteLength, 'mobile buf bytes:', mobileBuf?.byteLength);

  const basePdfArgs = {
    url: 'http://www.evolvelectrical.com/',
    businessName: 'Evolve Electrical',
    score: 42,
    summary: 'Aggregate audit summary for smoke test.',
    issues: [
      { category: 'Mobile', severity: 'critical', title: 'No mobile viewport meta', detail: 'Site does not size for mobile.', fix: 'Add viewport meta.' },
      { category: 'SEO', severity: 'high', title: 'Missing meta description', detail: 'No meta description.', fix: 'Add one under 160 chars.' },
      { category: 'Content', severity: 'medium', title: 'Thin copy on homepage', detail: 'Hero has 12 words total.', fix: 'Write 50-80 words of value prop.' },
    ],
    date: new Date().toISOString().slice(0, 10),
    brokenLinksCount: 0,
    viewportMetaOk: false,
    copyrightYear: 2023,
  };

  let pdf: Buffer;
  try {
    pdf = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: desktopBuf, screenshotMobile: mobileBuf });
    console.log('PRIMARY OK');
  } catch (err) {
    console.error('PRIMARY FAIL, retry:', err instanceof Error ? err.stack : err);
    pdf = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: null, screenshotMobile: null });
  }

  const outPath = resolve('scripts/out-e2e.pdf');
  writeFileSync(outPath, pdf);
  let jpegCount = 0;
  for (let i = 0; i < pdf.length - 1; i++) if (pdf[i] === 0xff && pdf[i + 1] === 0xd8) jpegCount++;

  console.log(`done in ${Date.now() - t0}ms`);
  console.log(`pdf bytes: ${pdf.byteLength}, JPEG start-markers: ${jpegCount} (expected 2), path: ${outPath}`);

  if (jpegCount < 2) {
    console.error('ASSERTION FAILED: screenshots not embedded in PDF');
    process.exit(1);
  }
  console.log('OK — both screenshots embedded in PDF');
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
