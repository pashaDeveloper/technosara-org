const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const data = require('../data/gaming-catalog');
const root = path.resolve(__dirname, '../../catalog-assets');
const models = { genres: ['genre', 'image'], platforms: ['platform', 'logo'], companies: ['company', 'logo'], people: ['person', 'photo'], brands: ['brand', 'logo'] };
async function main() {
  const selected = JSON.parse(await fs.readFile(path.join(root, 'research/selected.json'), 'utf8'));
  const manifest = [];
  for (const [group, rows] of Object.entries(data)) for (const row of rows) {
    const [model, field] = models[group];
    const dir = path.join(root, model, row.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'data.json'), JSON.stringify(row, null, 2));
    const page = selected[row.slug];
    if (!page?.imageinfo?.[0]) { manifest.push({ model, slug: row.slug, status: 'missing-source' }); continue; }
    const info = page.imageinfo[0];
    const metadata = info.extmetadata || {};
    const source = { page: info.descriptionurl, title: page.title, originalUrl: info.url, author: metadata.Artist?.value, license: metadata.LicenseShortName?.value, licenseUrl: metadata.LicenseUrl?.value, credit: metadata.Credit?.value, restrictions: metadata.Restrictions?.value, description: metadata.ImageDescription?.value, modified: 'Converted to WebP and resized to fit 1600px; separate preview fits 320px.', representative: group === 'genres' };
    await fs.writeFile(path.join(dir, 'source.json'), JSON.stringify(source, null, 2));
    try {
      const target = path.join(dir, field + '.webp');
      try { await fs.access(target); }
      catch {
        const url = new URL(info.thumburl || info.url); url.search = '';
        const response = await fetch(url, { headers: { 'User-Agent': 'TechnosaraCatalog/1.0' }, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const bytes = Buffer.from(await response.arrayBuffer());
        const image = sharp(bytes, { limitInputPixels: 80000000 }).rotate();
        await image.clone().resize({ width:1600, height:1600, fit:'inside', withoutEnlargement:true }).webp({quality:90}).toFile(target);
        await image.clone().resize({ width:320, height:320, fit:'inside', withoutEnlargement:true }).webp({quality:75}).toFile(path.join(dir,'preview.webp'));
      }
      const meta = await sharp(target).metadata();
      manifest.push({ model, slug:row.slug, name:row.name, field, file:path.relative(root,target).replaceAll('\\','/'), width:meta.width,height:meta.height,status:'ready',source:source.page,license:source.license });
      console.log('READY',model,row.slug);
    } catch(error) { manifest.push({model,slug:row.slug,status:'download-failed',error:error.message});console.log('FAILED',row.slug,error.message); }
    await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  }
  await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Ready',manifest.filter(r=>r.status==='ready').length,'of',manifest.length);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
