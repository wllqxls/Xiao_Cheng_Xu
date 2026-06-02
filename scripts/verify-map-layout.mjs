import fs from 'node:fs';

const regionConfig = JSON.parse(fs.readFileSync('assets/configs/region-config.json', 'utf8'));

const mapScaleX = 780;
const mapScaleY = 650;
const cardBaseWidth = 258;
const cardBaseHeight = 82;
const selectedScalePadding = 1.06;
const maxAllowedOverlapArea = 500;

function toRect(region) {
  const mapPosition = region.mapPosition ?? { x: 0.5, y: 0.5, size: 1 };
  const centerX = (mapPosition.x - 0.5) * mapScaleX;
  const centerY = (mapPosition.y - 0.5) * mapScaleY;
  const width = Math.round(cardBaseWidth * mapPosition.size * selectedScalePadding);
  const height = Math.round(cardBaseHeight * mapPosition.size * selectedScalePadding);

  return {
    id: region.id,
    left: centerX - width / 2,
    right: centerX + width / 2,
    top: centerY + height / 2,
    bottom: centerY - height / 2,
  };
}

function getOverlapArea(first, second) {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.top, second.top) - Math.max(first.bottom, second.bottom));
  return Math.round(width * height);
}

const rects = regionConfig.regions.map(toRect);
const overlaps = [];

for (let firstIndex = 0; firstIndex < rects.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < rects.length; secondIndex += 1) {
    const area = getOverlapArea(rects[firstIndex], rects[secondIndex]);
    if (area > maxAllowedOverlapArea) {
      overlaps.push({
        first: rects[firstIndex].id,
        second: rects[secondIndex].id,
        area,
      });
    }
  }
}

if (overlaps.length > 0) {
  console.error(JSON.stringify({ overlaps }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  regions: rects.length,
  maxAllowedOverlapArea,
}, null, 2));
