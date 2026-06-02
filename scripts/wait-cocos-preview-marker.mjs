import fs from 'node:fs';
import path from 'node:path';

const marker = process.argv[2];
const timeoutMs = Number(process.argv[3] ?? 360000);
const pollMs = 5000;
const previewRoot = 'temp/programming/packer-driver/targets/preview';

if (!marker) {
  console.error('Usage: node scripts/wait-cocos-preview-marker.mjs <marker> [timeoutMs]');
  process.exit(1);
}

function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function findMarkerInPreviewFiles() {
  const files = walkFiles(previewRoot);
  const match = files.find((file) => fs.readFileSync(file, 'utf8').includes(marker));
  return match ? path.normalize(match) : null;
}

const startedAt = Date.now();

while (Date.now() - startedAt <= timeoutMs) {
  const fileMatch = findMarkerInPreviewFiles();

  if (fileMatch) {
    console.log(JSON.stringify({
      marker,
      fileMatch,
      waitedMs: Date.now() - startedAt,
    }, null, 2));
    process.exit(0);
  }

  await new Promise((resolve) => setTimeout(resolve, pollMs));
}

console.error(JSON.stringify({
  marker,
  timeoutMs,
  previewRoot,
}, null, 2));
process.exit(1);
