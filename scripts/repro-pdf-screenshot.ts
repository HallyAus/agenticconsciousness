/**
 * Local repro for the PDF-screenshot render bug.
 *
 * Fetches the two real signed ScreenshotOne URLs for the evolvelectrical
 * prospect, then exercises the exact same render path as
 * /api/admin/prospects/[id]/send to see where and why react-pdf throws.
 *
 * Usage:  npx tsx scripts/repro-pdf-screenshot.mts
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fetchAsDataUri } from '../src/lib/fetch-image';
import { renderAuditPdf } from '../src/lib/pdf';

const URLS = {
  desktop: 'https://api.screenshotone.com/take?access_key=a4f95766af6ffe126d3c&url=http%3A%2F%2Fwww.evolvelectrical.com%2F&viewport_width=1440&viewport_height=900&device_scale_factor=1&image_width=900&format=jpg&image_quality=70&block_ads=true&block_cookie_banners=true&block_trackers=true&cache=true&cache_ttl=2592000&full_page=false&delay=2&timeout=30&signature=308801cdb716fc0869a7bdc3edb8cff2af077875ba5201b12581638222a862c9',
  mobile: 'https://api.screenshotone.com/take?access_key=a4f95766af6ffe126d3c&url=http%3A%2F%2Fwww.evolvelectrical.com%2F&viewport_width=393&viewport_height=852&device_scale_factor=1&image_width=400&viewport_mobile=true&format=jpg&image_quality=70&block_ads=true&block_cookie_banners=true&block_trackers=true&cache=true&cache_ttl=2592000&full_page=false&delay=2&timeout=30&signature=d2040bba88d0ca60a8c88952ddf4fa3dfe68cee2b210cff3ce827cd36f92de85',
};

const BASE_ARGS = {
  url: 'http://www.evolvelectrical.com/',
  businessName: 'Evolve Electrical',
  score: 42,
  summary: 'Repro run — synthetic audit summary.',
  issues: [
    { category: 'Mobile', severity: 'critical', title: 'No mobile viewport meta', detail: 'The site is not sized for mobile.', fix: 'Add the viewport meta tag.' },
    { category: 'SEO', severity: 'high', title: 'Missing meta description', detail: 'No description tag.', fix: 'Add a meta description under 160 chars.' },
  ],
  date: new Date().toISOString().slice(0, 10),
  brokenLinksCount: 0,
  viewportMetaOk: false,
  copyrightYear: 2023,
};

async function fetchBuffer(url: string): Promise<{ buf: Buffer; contentType: string }> {
  const r = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!r.ok) throw new Error(`fetch ${url.slice(0, 80)}... -> ${r.status}`);
  return { buf: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get('content-type') ?? '' };
}

async function trial(
  label: string,
  desk: Parameters<typeof renderAuditPdf>[0]['screenshotDesktop'],
  mob: Parameters<typeof renderAuditPdf>[0]['screenshotMobile'],
): Promise<void> {
  const t0 = Date.now();
  try {
    const pdf = await renderAuditPdf({ ...BASE_ARGS, screenshotDesktop: desk, screenshotMobile: mob });
    const outPath = resolve(`scripts/out-${label}.pdf`);
    writeFileSync(outPath, pdf);
    console.log(`[${label}] OK: ${pdf.byteLength} bytes in ${Date.now() - t0}ms -> ${outPath}`);
  } catch (err) {
    console.error(`[${label}] FAIL in ${Date.now() - t0}ms:`, err instanceof Error ? err.stack ?? err.message : err);
  }
}

async function main(): Promise<void> {
  console.log('---- fetch raw ----');
  const [desk, mob] = await Promise.all([fetchBuffer(URLS.desktop), fetchBuffer(URLS.mobile)]);
  console.log('desktop:', desk.buf.byteLength, 'bytes', desk.contentType);
  console.log('mobile :', mob.buf.byteLength, 'bytes', mob.contentType);

  // Inspect with sharp to see metadata
  const deskMeta = await sharp(desk.buf).metadata();
  const mobMeta = await sharp(mob.buf).metadata();
  console.log('desktop meta:', { format: deskMeta.format, width: deskMeta.width, height: deskMeta.height, space: deskMeta.space, chromaSubsampling: deskMeta.chromaSubsampling, hasProfile: deskMeta.hasProfile, isProgressive: deskMeta.isProgressive });
  console.log('mobile  meta:', { format: mobMeta.format, width: mobMeta.width, height: mobMeta.height, space: mobMeta.space, chromaSubsampling: mobMeta.chromaSubsampling, hasProfile: mobMeta.hasProfile, isProgressive: mobMeta.isProgressive });

  console.log('\n---- trial A: no screenshots (baseline) ----');
  await trial('no-shots', null, null);

  console.log('\n---- trial B: raw data URIs (current production path) ----');
  const deskDataUri = await fetchAsDataUri(URLS.desktop);
  const mobDataUri = await fetchAsDataUri(URLS.mobile);
  await trial('data-uri-raw', deskDataUri, mobDataUri);

  console.log('\n---- trial C: sharp-normalised 600w baseline JPEG, quality 60 ----');
  const deskNorm = await sharp(desk.buf).rotate().resize({ width: 600, withoutEnlargement: true }).jpeg({ quality: 60, progressive: false, mozjpeg: false }).withMetadata({}).toBuffer();
  const mobNorm = await sharp(mob.buf).rotate().resize({ width: 300, withoutEnlargement: true }).jpeg({ quality: 60, progressive: false, mozjpeg: false }).withMetadata({}).toBuffer();
  const deskNormUri = `data:image/jpeg;base64,${deskNorm.toString('base64')}`;
  const mobNormUri = `data:image/jpeg;base64,${mobNorm.toString('base64')}`;
  console.log('norm desktop bytes:', deskNorm.byteLength, 'mobile:', mobNorm.byteLength);
  await trial('data-uri-sharp', deskNormUri, mobNormUri);

  console.log('\n---- trial D: raw JPEG Buffer (skips data-URI decode path) ----');
  await trial('buffer-raw', desk.buf, mob.buf);

  console.log('\n---- trial E: canonical { data, format: jpg } sharp-normalised ----');
  const deskCanon = await sharp(desk.buf)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 75, progressive: false, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
  const mobCanon = await sharp(mob.buf)
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 75, progressive: false, mozjpeg: true })
    .withMetadata({})
    .toBuffer();
  console.log('canonical desktop bytes:', deskCanon.byteLength, 'mobile:', mobCanon.byteLength);
  await trial('canonical', { data: deskCanon, format: 'jpg' }, { data: mobCanon, format: 'jpg' });

  console.log('\n---- done ----');
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
