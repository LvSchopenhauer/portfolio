const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const ffmpeg = path.join(root, '.tools/ffmpeg-npm/node_modules/ffmpeg-static/ffmpeg.exe');
const reportDir = path.join(root, 'outputs/home-media-2026-10-30');
fs.mkdirSync(reportDir, { recursive: true });
async function hash(file, crop = '') {
  const filters = [crop, 'format=rgba'].filter(Boolean).join(',');
  const result = await run(ffmpeg, ['-hide_banner','-loglevel','error','-i',file,'-vf',filters,'-frames:v','1','-f','hash','-hash','sha256','-']);
  return result.stdout.trim();
}
async function prepare(index) {
  const source = path.join(root, `assets/covers/cover_${index}.png`);
  const output = path.join(root, `assets/covers/cover_${index}.home.webp`);
  // These two square originals are always center-cropped to 16:9 on the homepage.
  const crop = index <= 2 ? 'crop=1920:1080:0:420' : '';
  const filters = [crop, 'format=bgra'].filter(Boolean).join(',');
  await run(ffmpeg, ['-hide_banner','-loglevel','error','-i',source,'-vf',filters,'-c:v','libwebp','-lossless','1','-compression_level','6','-frames:v','1','-y',output]);
  const [before, after] = await Promise.all([hash(source, crop), hash(output)]);
  if (before !== after) throw new Error(`Visible pixel mismatch for cover ${index}`);
  const result = { index, source: path.relative(root, source).replaceAll('\\','/'), output: path.relative(root, output).replaceAll('\\','/'), crop: crop || 'none', originalBytes: fs.statSync(source).size, outputBytes: fs.statSync(output).size, pixelHash: after, exactVisiblePixels: true };
  console.log(JSON.stringify(result));
  return result;
}
(async () => {
  const results = [];
  for (let index = 1; index <= 6; index += 2) results.push(...await Promise.all([prepare(index), prepare(index+1)]));
  fs.writeFileSync(path.join(reportDir,'lossless-covers.json'),JSON.stringify(results,null,2));
})().catch(error => { console.error(error.message); process.exitCode=1; });
