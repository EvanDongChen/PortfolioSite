import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DIR = path.resolve('public/images');

// filename (no ext) -> { maxWidth, maxHeight, quality }
const RESIZE = {
  the_wishing_terminal: { width: 960 },
  chord_breakers: { width: 960 },
  profile: { width: 600, height: 600 },
  angler: { width: 320, height: 320 },
};

const SKIP = new Set(['favicon.png', 'favicon_new.png']); // handled separately

async function run() {
  const files = fs.readdirSync(DIR).filter(f => /\.(png|jpe?g)$/i.test(f) && !SKIP.has(f));
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const name = file.replace(/\.(png|jpe?g)$/i, '');
    const srcPath = path.join(DIR, file);
    const outPath = path.join(DIR, `${name}.webp`);
    const before = fs.statSync(srcPath).size;

    let pipeline = sharp(srcPath);
    const resize = RESIZE[name];
    if (resize) {
      pipeline = pipeline.resize({
        width: resize.width,
        height: resize.height,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await pipeline.webp({ quality: 82 }).toFile(outPath);

    const after = fs.statSync(outPath).size;
    totalBefore += before;
    totalAfter += after;
    console.log(`${file.padEnd(28)} ${(before / 1024).toFixed(1).padStart(8)} KB -> ${(after / 1024).toFixed(1).padStart(8)} KB webp`);
  }

  // Favicon: just shrink dimensions + recompress, keep as PNG for broad favicon support.
  const favSrc = path.join(DIR, 'favicon_new.png');
  const favBefore = fs.statSync(favSrc).size;
  await sharp(favSrc)
    .resize({ width: 180, height: 180, fit: 'inside' })
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(path.join(DIR, 'favicon_new.optimized.png'));
  const favAfter = fs.statSync(path.join(DIR, 'favicon_new.optimized.png')).size;
  console.log(`favicon_new.png                 ${(favBefore / 1024).toFixed(1).padStart(8)} KB -> ${(favAfter / 1024).toFixed(1).padStart(8)} KB png`);

  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(2)} MB -> ${(totalAfter / 1024 / 1024).toFixed(2)} MB (webp set)`);
}

run();
